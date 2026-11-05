// Small event pieces used on the product page and the ticket page: the status badge, the
// registration count, speakers and guests, the agenda with day tabs, and upcoming dates.
import { useState } from 'react'
import { Avatar, Badge, Icon, StatusBadge, Tabs } from '@/design-system'
import { localDate, localRange } from '@/components/product/time.js'
import {
  eventStatus, registrationInfo, speakersOf, occurrences, occurrenceLine,
} from './eventState.js'
import { useNow } from './useRegistration.js'
import './event.css'

const KIND_TONE = { Host: 'primary', Speaker: 'info', Guest: 'accent' }

// The badge beside the type on the product page header.
export function EventStatusBadge({ product }) {
  const now = useNow()
  const status = eventStatus(product, now)
  if (status === 'cancelled') return <StatusBadge status="Cancelled" />
  if (status === 'ended') return <Badge icon="clock">Ended</Badge>
  if (status === 'live') return <Badge tone="success" icon="video">Happening now</Badge>
  const info = registrationInfo(product, now)
  if (info.deadlinePassed) return <Badge tone="warning" icon="lock">Registration closed</Badge>
  if (info.full) return <Badge tone="warning">Full</Badge>
  if (product.event?.recurring) return <Badge tone="info" icon="calendar">Weekly</Badge>
  return null
}

// "32 going · 8 places left"
export function CountLine({ product, now }) {
  const { countLine } = registrationInfo(product, now)
  if (!countLine) return null
  return <p className="ev-count"><Icon name="users" size={16} />{countLine}</p>
}

function SpeakerChip({ person }) {
  return (
    <span className="ev-chip">
      <Avatar src={person.photo} name={person.name} size="sm" />
      <span className="ev-chip-text">
        <span className="ev-chip-name">{person.name}</span>
        {person.role && <span className="ev-chip-role">{person.role}</span>}
      </span>
    </span>
  )
}

export function Speakers({ event }) {
  const people = speakersOf(event)
  if (!people.length) return null
  return (
    <ul className="ev-speakers">
      {people.map((p) => (
        <li key={p.id || p.name} className="ev-speaker">
          <Avatar src={p.photo} name={p.name} size="lg" />
          <span className="ev-speaker-text">
            <span className="ev-speaker-name">{p.name}</span>
            <span className="ev-speaker-role">{p.role}</span>
            {p.kind && <Badge tone={KIND_TONE[p.kind] || 'neutral'}>{p.kind}</Badge>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function SessionList({ sessions, people }) {
  return (
    <ol className="ev-sessions">
      {sessions.map((s) => {
        const who = (s.speakers || []).map((id) => people.find((p) => p.id === id)).filter(Boolean)
        return (
          <li key={s.id} className="ev-session">
            <span className="ev-session-time" dir="ltr">{localRange(s.startsAt, s.endsAt)}</span>
            <div className="ev-session-body">
              <h4 className="ev-session-title">{s.title}</h4>
              {s.description && <p className="t-body-sm t-muted">{s.description}</p>}
              {who.length > 0 && (
                <div className="ev-session-people">{who.map((p) => <SpeakerChip key={p.id} person={p} />)}</div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// The agenda: day tabs for multi-day events, else one list.
export function Agenda({ event, idPrefix = 'ev' }) {
  const days = event.days?.length ? event.days : event.agenda?.length ? [{ id: 'd1', label: 'Day 1', startsAt: event.startsAt, sessions: event.agenda }] : []
  const [dayId, setDayId] = useState(days[0]?.id)
  if (!days.length) return null
  const people = speakersOf(event)
  const day = days.find((d) => d.id === dayId) || days[0]
  if (days.length === 1) return <SessionList sessions={day.sessions} people={people} />
  return (
    <div className="ev-agenda">
      <Tabs
        label="Agenda days" value={day.id} onChange={setDayId} variant="pill"
        tabs={days.map((d) => ({ value: d.id, label: `${d.label} · ${localDate(d.startsAt)}` }))}
      />
      <div role="tabpanel" id={`${idPrefix}-day-${day.id}`} aria-label={`${day.label}, ${localDate(day.startsAt)}`} tabIndex={0} className="ev-agenda-panel">
        <SessionList sessions={day.sessions} people={people} />
      </div>
    </div>
  )
}

// The next dates of a recurring event; past dates drop off.
export function UpcomingDates({ event, now, limit = 6 }) {
  const all = occurrences(event)
  const upcoming = all.filter((o) => o.end > now)
  if (!upcoming.length) return null
  return (
    <div className="pg-stack-sm">
      <ul className="ev-dates">
        {upcoming.slice(0, limit).map((o, i) => (
          <li key={o.id} className="ev-date">
            <Icon name="calendar" size={16} />
            <span dir="auto">{occurrenceLine(o)}</span>
            {i === 0 && <Badge tone="primary">Next</Badge>}
          </li>
        ))}
      </ul>
      <p className="t-body-sm t-muted">
        {upcoming.length} of {all.length} dates to go · last date {localDate(new Date(all[all.length - 1].start).toISOString())}
      </p>
    </div>
  )
}
