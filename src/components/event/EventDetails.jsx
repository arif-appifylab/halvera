// The event block on the product page: when and where (in the visitor's time zone), places and
// waitlist, countdown, upcoming dates, agenda, speakers and the replay.
import { Card, Countdown, Icon } from '@/design-system'
import {
  eventStatus, registrationInfo, nextOccurrence, dateLine, timeLine, whereLine, venueNote, formatLabel, zoneNote,
  occurrenceLine, speakersOf, recurringLabel, perDatePrice, at, JOIN_EARLY_MINUTES, YOUR_TIME,
} from './eventState.js'
import { useRegistration, useNow } from './useRegistration.js'
import { Agenda, Speakers, UpcomingDates } from './parts.jsx'
import './event.css'


function Block({ id, title, intro, children }) {
  return (
    <section className="pd-section" aria-labelledby={id}>
      <h2 id={id} className="t-heading-2">{title}</h2>
      {intro && <p className="t-muted">{intro}</p>}
      {children}
    </section>
  )
}

export default function EventDetails({ product, viewer }) {
  const now = useNow()
  const { ticket } = useRegistration(product, viewer)
  const ev = product.event || {}
  const status = eventStatus(product, now)
  const info = registrationInfo(product, now)
  const next = nextOccurrence(ev, now)
  const multi = ev.days?.length > 1
  const people = speakersOf(ev)

  const rows = [
    { label: multi ? 'Dates' : ev.recurring ? 'Repeats' : 'Date', value: dateLine(ev, now) },
    { label: 'Time', value: timeLine(ev, now), note: ev.startsAt ? [zoneNote(now), venueNote(ev, now)].filter(Boolean).join('. ') : undefined },
    ev.recurring && next && status !== 'cancelled' && { label: 'Next date', value: `${occurrenceLine(next)} ${YOUR_TIME}` },
    { label: 'Format', value: formatLabel(ev) },
    ev.format === 'in-person' && {
      label: 'Venue', value: whereLine(ev, { registered: Boolean(ticket) }),
      note: ev.hideVenue && ticket ? 'Shown because you’re registered' : undefined,
    },
    ev.format === 'virtual' && status !== 'ended' && status !== 'cancelled' && {
      label: 'Joining', value: `The join link appears on your ticket ${JOIN_EARLY_MINUTES} minutes before the start`,
    },
    info.countLine && {
      label: 'Places', value: info.countLine,
      note: info.waitlist ? 'Waitlist with auto-promotion: if a place opens, the next person gets it' : undefined,
    },
    info.deadline && { label: info.deadlinePassed ? 'Registration closed' : 'Registration closes', value: at(info.deadline) },
    product.visibility === 'membership' && { label: 'Who can come', value: 'Members', note: `Uses ${ev.places || 1} of your monthly event places` },
  ]

  return (
    <>
      <Block id="pd-event" title="Event details">
        <Card tone="sunken" padding="md">
          <dl className="pg-facts pd-facts">
            {rows.filter((r) => r && r.value).map((r) => (
              <div key={r.label} className="pd-fact">
                <dt>{r.label}</dt>
                <dd>{r.value}{r.note && <span className="pd-fact-note">{r.note}</span>}</dd>
              </div>
            ))}
          </dl>
        </Card>
        {info.countdown && status === 'scheduled' && !info.deadlinePassed && next && next.start > now && (
          <Countdown to={new Date(next.start).toISOString()} label={`${ev.recurring ? 'The next evening starts in' : 'Starts in'} · ${at(next.start)}`} />
        )}
      </Block>

      {ev.recurring && status !== 'cancelled' && status !== 'ended' && (
        <Block id="pd-dates" title="Upcoming dates" intro={`${recurringLabel(ev, now)}, ${ev.recurring.count} dates in this run, in your time zone. Ongoing access covers every date while you’re subscribed${perDatePrice(product) ? ', or pick the dates you want and pay for each one' : ''}.`}>
          <UpcomingDates event={ev} now={now} />
        </Block>
      )}

      {(ev.days?.length > 0 || ev.agenda?.length > 0) && (
        <Block id="pd-agenda" title="Agenda" intro={multi ? 'Each day has its own sessions and its own join link. Times are in your time zone.' : 'Times are in your time zone.'}>
          <Agenda event={ev} />
        </Block>
      )}

      {people.length > 1 && (
        <Block id="pd-speakers" title="Speakers and guests">
          <Speakers event={ev} />
        </Block>
      )}

      {status === 'ended' && ev.recordings?.length > 0 && (
        <Block id="pd-replay" title="Replay" intro={ticket ? 'You can watch these on your ticket page.' : 'Everyone who registers can watch these at their own pace.'}>
          <ul className="ev-recordings">
            {ev.recordings.map((r) => (
              <li key={r.id} className="ev-recording">
                <Icon name={ticket ? 'play' : 'lock'} size={18} label={ticket ? undefined : 'Locked'} />
                <span className="ev-recording-title">{r.title}</span>
                <span className="t-body-sm t-muted" dir="ltr">{r.duration}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}
    </>
  )
}
