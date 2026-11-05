// Student dashboard → Bookings (/student/dashboard/bookings): appointments and event tickets in one
// place. Calendar view by default (a month grid; choose a day to see its bookings), or a list with
// Upcoming and Past. ?view=list, ?type=appointment | event, ?state=loading | error | empty.
// The old /appointments and /tickets addresses redirect here.
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Button, Card, EmptyState, Modal, Notice, SegmentedToggle, Skeleton, Tabs,
} from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { listProducts } from '@/lib/products.js'
import { bookingsFor, fullDate } from '@/lib/student.js'
import { allowance } from '@/data/account.js'
import { bookHref, changeWindowHours } from '@/data/dashboard-extra.js'
import { dateKey, localDate, localRange } from '@/components/product/time.js'
import { eventStatus, zoneNote, YOUR_TIME } from '@/components/event/eventState.js'
import { useEventTickets, useNow } from '@/components/event/useRegistration.js'
import { cancelRefund } from '@/components/event/tickets.js'
import CancelTicketModal from '@/components/event/CancelTicketModal.jsx'
import BookingCalendar from './bookings/BookingCalendar.jsx'
import { AppointmentCard, EventCard, PastList } from './bookings/cards.jsx'
import { monthOf, longDay, nextFor } from './bookings/dates.js'
import './account-pages.css'
import './tickets.css'
import './bookings/bookings.css'

const VIEWS = [{ value: 'calendar', label: 'Calendar' }, { value: 'list', label: 'List' }]
const TYPES = [{ value: 'all', label: 'All' }, { value: 'appointment', label: 'Appointments' }, { value: 'event', label: 'Events' }]
const TABS = [{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]

function LoadingList() {
  return (
    <div className="pg-stack" aria-busy="true" aria-label="Loading bookings">
      {[0, 1].map((i) => (
        <Card key={i} className="ap-appt">
          <Skeleton width={64} height={76} radius="var(--radius-md)" />
          <div className="pg-stack-sm"><Skeleton width="45%" height={22} /><Skeleton width="70%" /><Skeleton width="55%" /></div>
        </Card>
      ))}
    </div>
  )
}

export default function Bookings() {
  const { viewer } = useViewer()
  const [params, setParams] = useSearchParams()
  const now = useNow()
  const state = params.get('state')
  const view = params.get('view') === 'list' ? 'list' : 'calendar'
  const type = ['appointment', 'event'].includes(params.get('type')) ? params.get('type') : 'all'
  const todayKey = dateKey(now)
  const [selected, setSelected] = useState(todayKey)
  const [month, setMonth] = useState(() => monthOf(todayKey))
  const [tab, setTab] = useState('upcoming')
  const [cancelledAppts, setCancelledAppts] = useState([])
  const [cancelling, setCancelling] = useState(null) // { booking } or { entry, occ }
  const [done, setDone] = useState(null)
  const [detail, setDetail] = useState(null) // the booking opened from the calendar

  const entries = useEventTickets(listProducts(), viewer)
  const all = useMemo(() => (state === 'empty' ? [] : bookingsFor(viewer, entries)), [viewer, entries, state])
  const bookings = all
    .map((b) => (cancelledAppts.includes(b.id) ? { ...b, status: 'Cancelled', appt: { ...b.appt, status: 'Cancelled', statusNote: 'You cancelled' } } : b))
    .filter((b) => type === 'all' || b.kind === type)

  const setParam = (key, value, fallback) => {
    const next = new URLSearchParams(params)
    if (value === fallback) next.delete(key); else next.set(key, value)
    setParams(next, { replace: true })
  }

  const isUpcoming = (b) => b.status !== 'Cancelled' && b.end >= now && !(b.kind === 'event' && eventStatus(b.entry.product, now) === 'cancelled')
  // The list shows one card per event (its next date), like a ticket.
  const upcoming = []
  const seen = new Set()
  for (const b of bookings.filter(isUpcoming)) {
    if (b.kind === 'event') {
      if (seen.has(b.entry.product.slug)) continue
      seen.add(b.entry.product.slug)
      if (!nextFor(b.entry.product, b.entry.ticket, now)) continue
    }
    upcoming.push(b)
  }
  const past = bookings.filter((b) => !isUpcoming(b)).sort((a, b) => b.start - a.start)
  const dayList = bookings.filter((b) => dateKey(b.start) === selected)
  const nextUp = bookings.find((b) => isUpcoming(b) && dateKey(b.start) > selected)

  // A day clicked in the calendar: show its bookings and scroll down to them (arrow keys only select).
  const pickDay = (key, scroll) => {
    setSelected(key)
    if (scroll) setTimeout(() => document.getElementById('bkd-day-title')?.scrollIntoView({ block: 'start' }), 0)
  }
  const cancelEvent = (entry, occ) => setCancelling({ entry, occ })
  const confirmTicketCancel = () => {
    const { entry, occ } = cancelling
    const price = entry.product.prices.find((p) => p.id === entry.ticket.price)
    const refund = cancelRefund(entry.ticket, price, occ.start - now)
    entry.cancel(refund)
    setDone({ title: entry.product.title, text: refund || 'Your place has gone back to the event.' })
    setCancelling(null)
  }
  const confirmApptCancel = () => {
    const b = cancelling.booking
    setCancelledAppts((list) => [...list, b.id])
    setDone({ title: `${b.title}, ${localDate(b.start)}`, text: b.appt.paidWith.endsWith('allowance') ? b.appt.allowanceCancelNote : b.appt.cancelNote || 'The time is free for someone else.' })
    setCancelling(null)
  }

  const card = (b, occ) => (b.kind === 'appointment'
    ? <AppointmentCard key={b.id} booking={b} now={now} onCancel={(booking) => { setDetail(null); setCancelling({ booking }) }} />
    : <EventCard key={b.id} entry={b.entry} occ={occ} now={now} onCancel={(entry, o) => { setDetail(null); cancelEvent(entry, o) }} />)
  // A past or cancelled booking shows the list view's past row.
  const detailBody = (b) => (isUpcoming(b) ? card(b, b.occ) : <PastList items={[b]} now={now} />)

  let body
  if (state === 'loading') body = <LoadingList />
  else if (state === 'error') {
    body = (
      <Notice tone="danger" title="We couldn’t load your bookings" action={<Button variant="secondary" size="sm" href="/student/dashboard/bookings">Try again</Button>}>
        This is on our side. Your bookings are safe, and they’re in your confirmation emails too.
      </Notice>
    )
  } else if (!all.length) {
    body = (
      <EmptyState icon="calendar" title="Nothing booked yet" action={<Button variant="secondary" href={bookHref}>Book an appointment</Button>}>
        Appointments you book and events you register for show here, with the time and how to join.
      </EmptyState>
    )
  } else if (view === 'calendar') {
    body = (
      <div className="bkd-split">
        <Card padding="lg"><BookingCalendar bookings={bookings} month={month} onMonth={setMonth} selected={selected} onSelect={pickDay} onOpen={setDetail} todayKey={todayKey} now={now} /></Card>
        <section className="bkd-day" aria-labelledby="bkd-day-title">
          <h2 id="bkd-day-title" className="t-heading-4">{selected === todayKey ? `Today, ${longDay(selected)}` : longDay(selected)}</h2>
          {dayList.length ? (
            <div className="pg-stack">{dayList.map((b) => card(b, b.occ))}</div>
          ) : (
            <Card tone="sunken" padding="lg" className="pg-stack-sm">
              <p>Nothing booked {selected === todayKey ? 'today' : 'on this day'}.</p>
              {nextUp && (
                <p className="t-body-sm">
                  Next: <button type="button" className="sg-linkbtn" onClick={() => { const k = dateKey(nextUp.start); setMonth(monthOf(k)); pickDay(k, true) }}>
                    {nextUp.title}, {localDate(nextUp.start)} {localRange(nextUp.start, nextUp.end)} {YOUR_TIME}
                  </button>
                </p>
              )}
            </Card>
          )}
        </section>
      </div>
    )
  } else if (tab === 'upcoming') {
    body = upcoming.length ? <div className="pg-stack">{upcoming.map((b) => card(b))}</div> : (
      <EmptyState icon="calendar" title="Nothing coming up" action={<Button variant="secondary" href={bookHref}>Book an appointment</Button>}>
        When you book an appointment or register for an event, it shows here.
      </EmptyState>
    )
  } else {
    body = past.length ? <PastList items={past} now={now} /> : (
      <EmptyState icon="clock" title="No past bookings yet">Sessions and events you’ve been to will appear here.</EmptyState>
    )
  }

  return (
    <div className="ap-page">
      <div className="pg-row-between">
        <div className="pg-stack-sm">
          <h1 className="t-heading-3">Bookings</h1>
          <p className="t-body-sm t-muted">Appointments and events. {zoneNote(now)}.</p>
        </div>
        <div className="pg-row">
          <Button variant="secondary" href="/all-products?type=event">Find an event</Button>
          <Button href={bookHref} iconStart="calendar">Book an appointment</Button>
        </div>
      </div>

      {viewer.plan && (
        <p className="bkd-allowance t-body-sm">
          Your membership: {allowance.total - allowance.used} of {allowance.total} included sessions left this month, resets {allowance.resets}.
          {' '}<a href="/student/dashboard/memberships">See your membership</a>
        </p>
      )}

      {done && (
        <Notice tone="success" title="Cancelled" onDismiss={() => setDone(null)}>
          {done.title}. {done.text} We’ve emailed you a confirmation.
        </Notice>
      )}

      {all.length > 0 && state !== 'loading' && state !== 'error' && (
        <div className="bkd-controls">
          <SegmentedToggle label="View" options={VIEWS} value={view} onChange={(v) => setParam('view', v, 'calendar')} />
          <SegmentedToggle label="Show" options={TYPES} value={type} onChange={(v) => setParam('type', v, 'all')} />
        </div>
      )}
      {view === 'list' && all.length > 0 && state !== 'loading' && state !== 'error' && <Tabs tabs={TABS} value={tab} onChange={setTab} label="Bookings" />}
      <div role={view === 'list' ? 'tabpanel' : undefined}>{body}</div>

      <Modal
        open={!!detail} onClose={() => setDetail(null)} size="md"
        title={detail ? (detail.kind === 'event' ? 'Event' : 'Appointment') : ''}
        footer={<Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>}
      >
        {detail && <div className="bkd-detail">{detailBody(detail)}</div>}
      </Modal>

      <CancelTicketModal
        open={!!cancelling?.entry} onClose={() => setCancelling(null)} onConfirm={confirmTicketCancel}
        product={cancelling?.entry?.product} ticket={cancelling?.entry?.ticket}
        startsIn={cancelling?.occ ? cancelling.occ.start - now : 0}
      />
      <Modal
        open={!!cancelling?.booking} onClose={() => setCancelling(null)} title="Cancel this appointment?" size="sm"
        footer={<><Button variant="secondary" onClick={() => setCancelling(null)}>Keep appointment</Button><Button variant="danger" onClick={confirmApptCancel}>Cancel appointment</Button></>}
      >
        {cancelling?.booking && (
          <div className="pg-stack-sm">
            <Card tone="sunken" padding="sm">
              <p className="t-strong">{cancelling.booking.title}</p>
              <p className="t-body-sm t-muted">{fullDate(cancelling.booking.start)}, {localRange(cancelling.booking.start, cancelling.booking.end)} · with {cancelling.booking.appt.host}</p>
            </Card>
            <p>The time goes back on the calendar for someone else. {cancelling.booking.appt.paidWith.endsWith('allowance') ? cancelling.booking.appt.allowanceCancelNote : cancelling.booking.appt.cancelNote}</p>
            <p className="t-body-sm t-muted">You can change or cancel up to {changeWindowHours} hours before. If you’d rather keep the session, you can reschedule instead.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
