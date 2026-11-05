// Booking cards for Bookings (/student/dashboard/bookings): appointments (Scheduling → Appointments:
// "Registrants can cancel their own booking", "can reschedule into another open slot", up to 4 hours
// before) and event tickets (join link 15 minutes before, add to calendar, venue, ticket number,
// cancel with the event's refund rule). Times show in the visitor's own time zone.
import {
  Avatar, Badge, Button, Card, Icon, StatusBadge,
} from '@/design-system'
import { openHref, productHref } from '@/lib/products.js'
import { appointmentHref, changeWindowHours } from '@/data/dashboard-extra.js'
import { localDate, localRange } from '@/components/product/time.js'
import {
  eventStatus, pickDates, datesSummary, whereLine, venueNote, mapHref, platformName,
  at, YOUR_TIME, JOIN_EARLY_MINUTES,
} from '@/components/event/eventState.js'
import AddToCalendar from '@/components/event/AddToCalendar.jsx'
import { nextFor } from './dates.js'

const MIN = 60000

// "Thu 22 Oct" as a date block, in the visitor's zone.
export function DateBlock({ start }) {
  const [weekday, day, month] = localDate(start).split(' ')
  return (
    <div className="ap-date" aria-hidden="true">
      <span className="ap-date-weekday">{weekday}</span>
      <span className="ap-date-day">{day}</span>
      <span className="ap-date-month">{month}</span>
    </div>
  )
}

// "Confirmed" isn't in StatusBadge's map; show it with the Active tone and icon.
const ApptStatus = ({ status }) => (status === 'Confirmed' ? <StatusBadge status="Active">Confirmed</StatusBadge> : <StatusBadge status={status} />)

export function AppointmentCard({ booking, now, onCancel }) {
  const a = booking.appt
  const locked = (booking.start - now) / 3600000 < changeWindowHours
  const joinOpen = a.joinHref && booking.start - now <= 10 * MIN
  return (
    <Card as="article" className="ap-appt" aria-labelledby={'bk-' + booking.id}>
      <DateBlock start={booking.start} />
      <div className="ap-appt-body">
        <div className="ap-appt-head">
          <h3 id={'bk-' + booking.id} className="t-heading-4">{a.title}</h3>
          <div className="pg-row"><Badge>Appointment</Badge><ApptStatus status={a.status} /></div>
        </div>
        <ul className="ap-meta">
          <li><Icon name="clock" size={18} /><span>{localDate(booking.start)}, {localRange(booking.start, booking.end)} {YOUR_TIME}</span></li>
          <li><Icon name={a.locationIcon} size={18} /><span>{a.location}</span></li>
          <li><Avatar name={a.host} size="sm" /><span>With {a.host}</span></li>
          <li><Icon name="card" size={18} /><span>{a.paidWith === 'Free' ? 'Free' : a.paidWith.endsWith('allowance') ? `Included: ${a.paidWith}` : `Paid ${a.paidWith}`}</span></li>
        </ul>
        {a.statusNote && <p className="t-body-sm t-muted">{a.statusNote}</p>}
        <div className="ap-actions">
          {a.joinHref && (joinOpen
            ? <Button size="sm" iconStart="video" href={a.joinHref}>Join call</Button>
            : <Button variant="secondary" size="sm" iconStart="video" disabled>Join opens 10 minutes before</Button>)}
          <Button variant="ghost" size="sm" href={locked ? undefined : `${appointmentHref(a.slug)}?reschedule=${a.id}`} disabled={locked}>Reschedule</Button>
          <Button variant="ghost" size="sm" disabled={locked} onClick={() => onCancel(booking)}>Cancel</Button>
        </div>
        <p className="ap-rule t-caption t-muted">
          <Icon name={locked ? 'lock' : 'info'} size={16} />
          {locked
            ? `It’s less than ${changeWindowHours} hours until this starts, so it can’t be changed here. If something has come up, reply to your confirmation email.`
            : `You can change or cancel up to ${changeWindowHours} hours before.`}
        </p>
      </div>
    </Card>
  )
}

function TicketStatus({ ticket, live }) {
  if (live) return <Badge tone="success" icon="video">Happening now</Badge>
  if (ticket.status === 'Paid' || ticket.status === 'Refunded') return <StatusBadge status={ticket.status} />
  return <Badge tone="success" icon="check">Registered</Badge>
}

// An event ticket. `occ` is the date to show (the calendar's day); by default the next one.
export function EventCard({ entry, now, occ: shownOcc, onCancel }) {
  const { product, ticket } = entry
  const ev = product.event
  const occ = shownOcc || nextFor(product, ticket, now)
  if (!occ) return null
  const virtual = ev.format === 'virtual'
  const opensAt = occ.start - JOIN_EARLY_MINUTES * MIN
  const ended = now > occ.end
  const open = virtual && now >= opensAt && !ended
  const live = now >= occ.start && !ended
  const booked = ticket.dates ? pickDates(product, ticket.dates, now) : null
  const multiDay = ev.days?.length > 1
  const venue = venueNote(ev, now)
  const titleId = `bk-${product.slug}-${occ.start}`
  return (
    <Card as="article" className="tk-ticket" aria-labelledby={titleId}>
      <DateBlock start={occ.start} />
      <div className="ap-appt-body">
        <div className="ap-appt-head">
          <h3 id={titleId} className="t-heading-4"><a className="tk-title" href={openHref(product)}>{product.title}</a></h3>
          <div className="pg-row"><Badge>Event</Badge>{ended ? <Badge icon="check">Ended</Badge> : <TicketStatus ticket={ticket} live={live} />}</div>
        </div>
        <ul className="ap-meta">
          <li>
            <Icon name="clock" size={18} />
            <span>
              {multiDay ? `${occ.label} of ${ev.days.length}: ` : ''}{localDate(occ.start)}, {localRange(occ.start, occ.end)} {YOUR_TIME}
              {venue && <span className="ap-cell-note">{venue}</span>}
            </span>
          </li>
          {booked && booked.length > 1 && <li><Icon name="calendar" size={18} /><span>Your dates: {datesSummary(booked)}</span></li>}
          <li>
            <Icon name={virtual ? 'video' : 'map-pin'} size={18} />
            <span>
              {whereLine(ev, { registered: true })}
              {!virtual && ev.venue && <> · <a href={mapHref(ev.venue)} target="_blank" rel="noopener noreferrer">Open the map<span className="sg-sr"> (opens in a new tab)</span></a></>}
            </span>
          </li>
          {ticket.number && <li><Icon name="file" size={18} /><span>Ticket <span className="ev-mono" dir="ltr">{ticket.number}</span></span></li>}
        </ul>

        {!ended && virtual && (open ? (
          <div className="tk-join">
            <p className="t-body-sm"><span className="t-strong">{live ? 'The room is open.' : 'You can join now.'}</span> Opens in {platformName(ev)}.</p>
            <a className="tk-join-link" href={ev.joinUrl} target="_blank" rel="noopener noreferrer" dir="ltr">{ev.joinUrl.replace(/^https?:\/\//, '')}</a>
          </div>
        ) : (
          <p className="ap-rule t-caption t-muted"><Icon name="video" size={16} />The join link appears here {JOIN_EARLY_MINUTES} minutes before the start, from {at(opensAt)}.</p>
        ))}

        <div className="ap-actions">
          {ended ? (
            ev.recordings?.length
              ? <Button variant="secondary" size="sm" iconStart="play" href={`${openHref(product)}#replay`}>Watch the replay</Button>
              : <Button variant="secondary" size="sm" href={productHref(product)}>View event</Button>
          ) : (
            <>
              {open
                ? <Button size="sm" href={ev.joinUrl} target="_blank" rel="noopener noreferrer" iconEnd="arrow-right">Join now</Button>
                : <Button size="sm" variant="secondary" href={openHref(product)}>View ticket</Button>}
              <AddToCalendar product={product} dates={ticket.dates} size="sm" variant="secondary" />
              <Button variant="ghost" size="sm" onClick={() => onCancel(entry, occ)}>Cancel</Button>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

// Past bookings: one row each, newest first, with the way to book again or watch the replay.
export function PastList({ items, now }) {
  return (
    <Card padding="sm" className="ap-list">
      <ul>
        {items.map((b) => {
          if (b.kind === 'appointment') {
            const a = b.appt
            return (
              <li key={b.id} className="ap-list-row">
                <div className="ap-list-main">
                  <p className="t-strong">{a.title} <Badge>Appointment</Badge></p>
                  <p className="t-body-sm t-muted">{localDate(b.start)}, {localRange(b.start, b.end)} {YOUR_TIME} · {a.host} · {a.location.split(' · ')[0]}</p>
                  {a.statusNote && <p className="t-body-sm t-muted">{a.statusNote}</p>}
                </div>
                <div className="ap-list-end">
                  <StatusBadge status={a.status} />
                  <Button variant="secondary" size="sm" href={appointmentHref(a.slug)}>Book again</Button>
                </div>
              </li>
            )
          }
          const { product, cancelled, ticket } = b.entry
          const ev = product.event
          const status = eventStatus(product, now)
          const schoolCancelled = status === 'cancelled'
          const replay = !cancelled && !schoolCancelled && ev.recordings?.length > 0
          const note = cancelled ? (cancelled.refund || 'You cancelled this registration.')
            : schoolCancelled ? (ticket?.refund ? `The school cancelled this event. ${ticket.refund} went back to your original payment method.` : 'The school cancelled this event.') : null
          return (
            <li key={b.id} className="ap-list-row tk-past">
              <div className="ap-list-main">
                <p className="t-strong">{product.title} <Badge>Event</Badge></p>
                <p className="t-body-sm t-muted">{localDate(b.start)}, {localRange(b.start, b.end)} {YOUR_TIME} · {ev.format === 'virtual' ? 'Online' : ev.venue?.city}</p>
                {note && <p className="t-body-sm t-muted">{note}</p>}
              </div>
              <div className="ap-list-end">
                {cancelled || schoolCancelled ? <StatusBadge status={ticket?.status === 'Refunded' ? 'Refunded' : 'Cancelled'} /> : <Badge icon="check">Ended</Badge>}
                {replay
                  ? <Button variant="secondary" size="sm" iconStart="play" href={`${openHref(product)}#replay`}>Watch the replay</Button>
                  : <Button variant="secondary" size="sm" href={productHref(product)}>View event</Button>}
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
