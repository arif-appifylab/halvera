// The event's open page (/event/:slug/open): the ticket, the join link (from 15
// minutes before the start), add to calendar (.ics), venue and map, agenda, cancel registration,
// and the replay once it has ended. Also covers cancelled events and cancelled registrations.
import { useEffect, useState } from 'react'
import {
  Badge, Button, Card, Countdown, Icon, Notice, StateNotice, StatusBadge,
} from '@/design-system'
import VideoPlayer from '@/components/media/VideoPlayer.jsx'
import { previewVideo } from '@/data/media.js'
import { getPractitioner } from '@/data/people.js'
import { productHref } from '@/lib/products.js'
import { localDate, localTime } from '@/components/product/time.js'
import {
  eventStatus, registrationInfo, joinState, dateLine, timeLine, whereLine, venueNote, formatLabel, zoneNote, mapHref,
  platformName, pickDates, datesSummary, datesCount, occurrenceLine, at, JOIN_EARLY_MINUTES, YOUR_TIME,
} from './eventState.js'
import { useRegistration, useNow } from './useRegistration.js'
import { Agenda, Speakers, UpcomingDates } from './parts.jsx'
import AddToCalendar from './AddToCalendar.jsx'
import { cancelRefund } from './tickets.js'
import CancelTicketModal from './CancelTicketModal.jsx'
import './event.css'

const EVENTS_HREF = '/all-products?type=event'

const ticketLine = (ticket, price) => {
  if (ticket.viaPlace) return '1 membership place'
  if (!price || price.kind === 'free') return 'Free registration'
  if (price.perDate) return `${datesCount(ticket.dates?.length || 0)} · ${price.price.amount} per date`
  return price.label === 'Ticket' ? '1 ticket' : `1 ticket · ${price.label}`
}

const ONLINE_TIPS = [
  'Find a quiet spot, and headphones help',
  'Check your camera and sound a few minutes before',
  'Everyone who registers gets the recording afterwards',
]

function Replay({ product }) {
  const recordings = product.event.recordings
  const [current, setCurrent] = useState(recordings[0].id)
  const rec = recordings.find((r) => r.id === current) || recordings[0]
  useEffect(() => {
    if (window.location.hash === '#replay') document.getElementById('replay')?.scrollIntoView({ block: 'start' })
  }, [])
  return (
    <Card padding="lg" className="pg-stack" id="replay">
      <div className="pg-row-between">
        <h2 className="t-heading-3">Replay</h2>
        <Badge tone="primary" icon="play">{recordings.length} recordings</Badge>
      </div>
      <VideoPlayer key={rec.id} source={previewVideo} title={`${product.title}: ${rec.title}`} resumeKey={`${product.slug}/${rec.id}`} />
      <ul className="ev-recordings" aria-label="Recordings">
        {recordings.map((r) => (
          <li key={r.id}>
            <button type="button" className="ev-recording ev-recording-button" aria-pressed={r.id === rec.id} onClick={() => setCurrent(r.id)}>
              <Icon name={r.id === rec.id ? 'pause' : 'play'} size={18} />
              <span className="ev-recording-title">{r.title}</span>
              <span className="t-body-sm t-muted" dir="ltr">{r.duration}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function EventTicket({ product, viewer }) {
  const now = useNow()
  const reg = useRegistration(product, viewer)
  const [confirming, setConfirming] = useState(false)
  const ev = product.event || {}
  const status = eventStatus(product, now)
  const info = registrationInfo(product, now)
  const join = joinState(ev, now)
  const ticket = reg.ticket
  const host = getPractitioner(product.practitioner).name
  const back = productHref(product)

  // The viewer cancelled in this visit.
  if (reg.cancelled) {
    const refund = reg.cancelled.refund
    return (
      <StateNotice
        reason="Your registration is cancelled" title={product.title}
        detail={refund || 'Your place has gone back to the event. We’ve emailed you a confirmation.'}
        actions={<>{status === 'scheduled' && !info.full && !info.deadlinePassed ? <Button href={back}>Register again</Button> : <Button href={EVENTS_HREF}>See upcoming events</Button>}</>}
      />
    )
  }

  // Cancelled by the school.
  if (status === 'cancelled') {
    return (
      <StateNotice
        reason="This event was cancelled" title={product.title}
        detail={`${ev.cancelled?.note || ''} It was due to take place on ${dateLine(ev)}.`.trim()}
        actions={<Button href={EVENTS_HREF}>See upcoming events</Button>}
      />
    )
  }

  // Signed in, but no ticket yet (free and membership events open for everyone signed in).
  if (!ticket) {
    return (
      <Notice tone="info" title="You’re not registered yet" action={<Button size="sm" href={back}>Register</Button>}>
        Register for {product.title} to get your ticket and joining details.
      </Notice>
    )
  }

  if (status === 'ended') {
    if (ev.recordings?.length) {
      return (
        <div className="pg-stack">
          <p className="t-body-lg t-muted">Thank you for coming. The live event has ended, and the recordings are here to watch at your own pace.</p>
          <Replay product={product} />
        </div>
      )
    }
    return (
      <StateNotice
        reason="This event has ended" title={product.title}
        detail={`It took place on ${dateLine(ev)}. Thank you for coming. It wasn’t recorded, but we run new events every month.`}
        actions={<Button href={EVENTS_HREF}>See upcoming events</Button>}
      />
    )
  }

  const virtual = ev.format === 'virtual'
  const price = product.prices.find((p) => p.id === ticket.price) || product.prices[0]
  // Per-date tickets join on the dates they bought; everyone else on the next date.
  const booked = ticket.dates ? pickDates(product, ticket.dates, now) : null
  const occ = booked ? booked[0] : join.occ
  const opensAt = booked ? (occ ? occ.start - JOIN_EARLY_MINUTES * 60000 : null) : join.opensAt
  const open = virtual && (booked ? Boolean(occ && now >= opensAt) : join.state === 'open')
  const live = booked ? Boolean(occ && now >= occ.start) : status === 'live'
  const nextStart = occ?.start ?? (ev.startsAt ? new Date(ev.startsAt).getTime() : null)
  // In-person tickets show the ticket number; virtual events show the join link instead.
  const inPerson = ev.format === 'in-person'
  const venue = venueNote(ev, now)
  const tips = ev.beforeYouCome || (virtual ? ONLINE_TIPS : null)
  const confirm = () => {
    setConfirming(false)
    reg.cancel(cancelRefund(ticket, price, (nextStart || now) - now))
  }

  return (
    <div className="pg-stack-lg">
      <p className="t-body-lg t-muted">
        {live ? 'It’s happening now. Join whenever you’re ready.' : 'You’re booked in. We’ve emailed your ticket, and everything you need is below.'}
      </p>
      <div className="pg-split">
        <Card padding="lg" className="pg-stack">
          <div className="pg-row-between">
            <h2 className="t-heading-3">Your ticket</h2>
            <span className="pg-row">
              {live && <Badge tone="success" icon="video">Happening now</Badge>}
              {ticket.status === 'Paid' ? <StatusBadge status="Paid" /> : <Badge tone="success" icon="check">Registered</Badge>}
            </span>
          </div>

          {virtual && (open ? (
            <div className="ev-join">
              <div>
                <p className="t-strong">{live ? 'The room is open' : 'You can join now'}</p>
                <p className="t-body-sm t-muted">
                  {live ? `Started at ${localTime(occ.start, { zone: true })}.` : `Starts at ${localTime(occ.start, { zone: true })}.`} Opens in {platformName(ev)}.
                </p>
              </div>
              <Button href={ev.joinUrl} target="_blank" rel="noopener noreferrer" iconEnd="arrow-right">Join now</Button>
            </div>
          ) : opensAt && (
            <p className="ev-join-note"><Icon name="clock" size={16} />The join link appears here {JOIN_EARLY_MINUTES} minutes before the start, from {at(opensAt)}.</p>
          ))}

          <dl className="pg-facts">
            {booked ? (
              <><dt>Your dates</dt><dd>{booked.length ? datesSummary(booked) : 'All your dates have passed'}</dd></>
            ) : <><dt>Date</dt><dd>{ev.recurring && occ ? `${localDate(occ.start)} (next)` : dateLine(ev, now)}</dd></>}
            <dt>Time</dt>
            <dd>
              {booked && occ ? `Next: ${occurrenceLine(occ)} ${YOUR_TIME}` : timeLine(ev, now)}
              <span className="ev-fact-note">{zoneNote(now)}</span>
              {venue && <span className="ev-fact-note">{venue}</span>}
            </dd>
            <dt>{virtual ? 'Where' : 'Venue'}</dt>
            <dd>
              {whereLine(ev, { registered: true })}
              {!virtual && ev.venue && <a className="ev-fact-link" href={mapHref(ev.venue)} target="_blank" rel="noopener noreferrer">Open the map</a>}
            </dd>
            {!virtual && <><dt>Format</dt><dd>{formatLabel(ev)}</dd></>}
            <dt>Host</dt><dd>{host}</dd>
            <dt>Ticket</dt><dd>{ticketLine(ticket, price)}</dd>
            {ticket.number && <><dt>Ticket number</dt><dd dir="ltr" className="ev-mono">{ticket.number}</dd></>}
            {ticket.bought && <><dt>Booked</dt><dd>{ticket.bought}</dd></>}
          </dl>

          {info.countdown && !open && nextStart > now && <Countdown to={new Date(nextStart).toISOString()} label={`Starts in · ${at(nextStart)}`} />}

          <div className="pg-row">
            <AddToCalendar product={product} dates={ticket.dates} variant={open ? 'secondary' : 'primary'} />
            {!virtual && ev.venue && (
              <Button variant="secondary" iconStart="map-pin" href={mapHref(ev.venue)} target="_blank" rel="noopener noreferrer">Get directions</Button>
            )}
          </div>
          <p className="t-body-sm t-muted">
            Can’t make it? <button type="button" className="ev-text-button" onClick={() => setConfirming(true)}>Cancel registration</button>
          </p>
        </Card>

        <aside className="pg-split-aside pg-stack">
          {inPerson && ticket.number && (
            <Card padding="lg" className="pg-stack-sm">
              <h2 className="t-heading-4">Your ticket</h2>
              <p className="t-body-sm t-muted">Give your name at the door. Your ticket number is also in your confirmation email.</p>
              <p className="t-body-sm ev-mono" dir="ltr">{ticket.number}</p>
            </Card>
          )}
          {virtual && (
            <Card padding="lg" className="pg-stack-sm">
              <h2 className="t-heading-4">Your join link</h2>
              {open ? (
                <>
                  <p className="t-body-sm t-muted">The room is open in {platformName(ev)}.</p>
                  <a className="ev-join-link" href={ev.joinUrl} target="_blank" rel="noopener noreferrer" dir="ltr">{ev.joinUrl.replace(/^https?:\/\//, '')}</a>
                </>
              ) : (
                <p className="t-body-sm t-muted">
                  {opensAt ? `It appears here ${JOIN_EARLY_MINUTES} minutes before the start, from ${at(opensAt)}, and in your reminder email.` : 'There are no more dates on this ticket.'}
                </p>
              )}
            </Card>
          )}
          {tips && (
            <Card tone="sage" padding="lg" className="pg-stack-sm">
              <h2 className="t-heading-4">{virtual ? 'Before you join' : 'Before you come'}</h2>
              <ul className="pg-ticks">
                {tips.map((t) => <li key={t}><Icon name="check" size={18} /><span>{t}</span></li>)}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      {ev.recurring && (
        <Card padding="lg" className="pg-stack">
          <h2 className="t-heading-3">Upcoming dates</h2>
          <UpcomingDates event={ev} now={now} />
        </Card>
      )}
      {(ev.days?.length > 0 || ev.agenda?.length > 0) && (
        <Card padding="lg" className="pg-stack">
          <h2 className="t-heading-3">Agenda</h2>
          <Agenda event={ev} idPrefix="ticket" />
        </Card>
      )}
      {ev.speakers?.length > 1 && (
        <Card padding="lg" className="pg-stack">
          <h2 className="t-heading-3">Speakers and guests</h2>
          <Speakers event={ev} />
        </Card>
      )}

      <CancelTicketModal
        open={confirming} onClose={() => setConfirming(false)} onConfirm={confirm}
        product={product} ticket={ticket} startsIn={(nextStart || now) - now}
      />
    </div>
  )
}
