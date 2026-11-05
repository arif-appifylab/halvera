// Event status, registration and timing rules, shared by the product page and the ticket page.
// Mirrors Scheduling → Events: status (scheduled, live, ended, cancelled), Limit registrations,
// Show registration count publicly, Waitlist with auto-promotion, Registration deadline, the join
// link opening 15 minutes before the start, and times in the visitor's own time zone.
import {
  localDate, localTime, localRange, localWhen, relativeDay, visitorZone, zoneName, zoneCity, YOUR_TIME,
} from '@/components/product/time.js'
import { getPractitioner } from '@/data/people.js'
import { occurrences, nextOccurrence, recurringLabel, venueTimeLine } from './dates.js'

export {
  occurrences, nextOccurrence, eventStatus, recurringLabel, venueTimeLine, eventMeta, eventZone,
  dateOptions, pickDates, perDateKeys, perDatePrice, datesSummary, datesCount,
} from './dates.js'
export { visitorZone, YOUR_TIME }

export const JOIN_EARLY_MINUTES = 15
const MIN = 60000

// "Shown in your time zone: Dhaka (GMT+6)"
export const zoneNote = (now = Date.now()) => {
  const zone = visitorZone()
  return `Shown in your time zone: ${zoneCity(zone)} (${zoneName(now)})`
}
// "Thu 22 Oct, 19:00 BST"
export const at = (t) => localWhen(t)

const ms = (iso) => (iso ? new Date(iso).getTime() : null)

// The join link shows from 15 minutes before the (next) start until it ends.
export function joinState(ev, now = Date.now()) {
  if (ev?.format !== 'virtual' || ev.status === 'cancelled') return { state: 'none' }
  const occ = nextOccurrence(ev, now)
  if (!occ) return { state: 'closed' }
  const opensAt = occ.start - JOIN_EARLY_MINUTES * MIN
  return now >= opensAt ? { state: 'open', occ } : { state: 'early', occ, opensAt }
}

// Places, count, waitlist and deadline.
export function registrationInfo(product, now = Date.now()) {
  const ev = product.event || {}
  const r = ev.registration || {}
  const limit = r.limit ?? ev.seats ?? null
  const going = r.going ?? (ev.seats != null && ev.seatsLeft != null ? ev.seats - ev.seatsLeft : null)
  const left = limit != null && going != null ? Math.max(0, limit - going) : null
  const full = product.availability === 'sold-out' || left === 0
  const deadline = ms(r.deadline)
  const places = left === 1 ? '1 place left' : `${left} places left`
  let countLine = null
  if (r.showCount && going != null) countLine = left == null ? `${going} going` : full ? `${going} going · Full` : `${going} going · ${places}`
  else if (limit != null) countLine = full ? 'Full' : 'Places are limited'
  return {
    limit, going, left, full, countLine,
    waitlist: Boolean(r.waitlist), waiting: r.waiting || 0,
    deadline, deadlinePassed: deadline != null && now > deadline,
    guest: Boolean(r.guest), countdown: r.countdown !== false, showCount: Boolean(r.showCount),
  }
}

const PLATFORM = { zoom: 'Zoom', native: 'our meeting room', meet: 'Google Meet' }
export const platformName = (ev) => PLATFORM[ev.platform] || 'the meeting room'
export const formatLabel = (ev) => (ev.format === 'virtual' ? (ev.platform === 'native' ? 'Online, in our meeting room' : `Online on ${platformName(ev)}`) : 'In person')

// Where it happens, honouring "Hide venue" until the viewer has registered.
export function whereLine(ev, { registered } = {}) {
  if (ev.format === 'virtual') return formatLabel(ev)
  const v = ev.venue
  if (!v) return ev.location
  if (ev.hideVenue && !registered) return `${v.city} · Venue shared after you register`
  return `${v.name}, ${v.address}`
}
export const mapHref = (venue) => `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${venue.name}, ${venue.address}`)}`

// "Thu 22 Oct" / "Sat 21 – Sun 22 Nov" / "Every Wednesday", in the visitor's zone.
export function dateLine(ev, now = Date.now()) {
  if (!ev.startsAt) return ev.date
  if (ev.recurring) return recurringLabel(ev, now)
  const first = localDate(ev.startsAt)
  const last = ev.endsAt ? localDate(ev.endsAt) : first
  if (first !== last) return `${first} – ${last}`
  const day = relativeDay(ev.startsAt, now)
  return day ? `${day}, ${first}` : first
}

// "18:30–19:45 GMT (your time)" (one block, or the next date of a recurring event),
// "09:30–12:30 GMT each day (your time)", "From 15:00 GMT on Fri 4 Dec until 14:00 GMT on Sun 6 Dec (your time)".
export function timeLine(ev, now = Date.now()) {
  if (!ev.startsAt) return ev.time
  let line
  if (ev.recurring) {
    const o = nextOccurrence(ev, now) || occurrences(ev)[0]
    line = localRange(o.start, o.end)
  } else if (ev.days?.length) {
    const d = ev.days[0]
    const same = ev.days.every((x) => localRange(x.startsAt, x.endsAt) === localRange(d.startsAt, d.endsAt))
    line = same ? `${localRange(d.startsAt, d.endsAt)} each day` : ev.days.map((x) => `${x.label} ${localRange(x.startsAt, x.endsAt)}`).join(' · ')
  } else if (dateLine(ev, now).includes('–')) {
    line = `From ${localTime(ev.startsAt, { zone: true })} on ${localDate(ev.startsAt)} until ${localTime(ev.endsAt, { zone: true })} on ${localDate(ev.endsAt)}`
  } else line = localRange(ev.startsAt, ev.endsAt)
  return `${line} ${YOUR_TIME}`
}

// In-person events: the time where it happens, in the organiser’s zone, as secondary text
// ("Local time at the venue: Tue 10 Nov, 18:30–20:00 GMT in Bath").
export function venueNote(ev, now = Date.now()) {
  if (ev.format !== 'in-person' || !ev.startsAt) return null
  const o = ev.recurring ? nextOccurrence(ev, now) : null
  const start = o ? new Date(o.start).toISOString() : ev.startsAt
  const end = o ? new Date(o.end).toISOString() : (ev.days?.length ? ev.days[0].endsAt : ev.endsAt)
  const line = venueTimeLine(ev, start, ev.days?.length > 1 || dateLine(ev, now).includes('–') ? null : end)
  return line ? `Local time at the venue: ${line}` : null
}

export const occurrenceLine = (o) => `${localDate(o.start)}, ${localRange(o.start, o.end)}`

// Speakers, hosts and guests with photos from the practitioner list.
export function speakersOf(ev) {
  return (ev.speakers || []).map((s) => {
    if (!s.person) return s
    const p = getPractitioner(s.person)
    return { id: s.person, name: p.name, role: p.role, photo: p.photo, kind: s.kind }
  })
}

export const defaultPrice = (product) => product.prices.find((p) => p.default) || product.prices[0]
export const isFreeEvent = (product) => product.prices.length > 0 && product.prices.every((p) => p.kind === 'free')
