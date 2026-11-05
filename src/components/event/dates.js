// Event dates without React: occurrences (one per date of a recurring event, one per day of a
// multi-day event), status from the real clock, the card meta line, and the "Per date" price
// (admin Sell → Per date: "Charge for each date booked"). Used by the event components, the
// event data, the checkout and commerce.js.
import {
  localDate, localTime, localRange, localWeekday, relativeDay, dateKey, shiftDays, zoneCity,
} from '@/components/product/time.js'

// The school's own zone (Settings → time zone). Events can set their own `timeZone`.
export const ORGANISER_ZONE = 'Europe/London'
export const eventZone = (ev) => ev?.timeZone || ORGANISER_ZONE

const MIN = 60000
const ms = (iso) => (iso ? new Date(iso).getTime() : null)

// Every occurrence as { id, key, start, end, label? } (ms). key is the organiser's calendar date
// ('2026-10-21'), the id a per-date purchase stores.
export function occurrences(ev) {
  if (!ev?.startsAt) return []
  const tz = eventZone(ev)
  const keyed = (o) => ({ ...o, key: dateKey(o.start, { timeZone: tz }) })
  if (ev.days?.length) return ev.days.map((d) => keyed({ id: d.id, start: ms(d.startsAt), end: ms(d.endsAt), label: d.label }))
  const start = ms(ev.startsAt)
  const end = ms(ev.endsAt) ?? start + 60 * MIN
  if (!ev.recurring) return [keyed({ id: 'o1', start, end })]
  const { every = 1, unit = 'week', count = 12 } = ev.recurring
  const step = (unit === 'day' ? 1 : 7) * every
  return Array.from({ length: count }, (_, i) => keyed({
    id: `o${i + 1}`, start: shiftDays(start, i * step, tz), end: shiftDays(end, i * step, tz),
  }))
}

export const nextOccurrence = (ev, now = Date.now()) => occurrences(ev).find((o) => o.end > now) || null

// scheduled | live | ended | cancelled, always from the real clock.
export function eventStatus(product, now = Date.now()) {
  const ev = product.event || {}
  if (ev.status === 'cancelled') return 'cancelled'
  const occ = occurrences(ev)
  if (!occ.length) return 'scheduled'
  if (now >= Math.max(...occ.map((o) => o.end))) return 'ended'
  if (occ.some((o) => now >= o.start && now < o.end)) return 'live'
  return 'scheduled'
}

// "Every Wednesday", in the visitor's zone (an evening event can fall on another day there).
export function recurringLabel(ev, now = Date.now()) {
  const o = nextOccurrence(ev, now) || occurrences(ev)[0]
  if (!o) return ev.recurring?.label || ''
  const every = ev.recurring.every > 1 ? `Every ${ev.recurring.every} weeks on` : 'Every'
  return ev.recurring.unit === 'day' ? 'Every day' : `${every} ${localWeekday(o.start)}`
}

// The card meta for an event, in the visitor's zone: "Thu 22 Oct, 19:00 BST", "Today, 19:00 BST",
// "Happening now", "Every Wednesday, 19:00 BST", "Sat 21 – Sun 22 Nov". `place` is the second item.
export function eventMeta(product, place, now = Date.now()) {
  const ev = product.event || {}
  const status = eventStatus(product, now)
  const next = nextOccurrence(ev, now)
  let label
  if (!ev.startsAt) label = ev.date
  else if (status === 'live') label = 'Happening now'
  else if (ev.recurring && next) label = `${recurringLabel(ev, now)}, ${localTime(next.start, { zone: true })}`
  else if (ev.days?.length > 1 || (ev.endsAt && localDate(ev.startsAt) !== localDate(ev.endsAt))) label = `${localDate(ev.startsAt)} – ${localDate(ev.endsAt)}`
  else {
    const day = status === 'scheduled' ? relativeDay(ev.startsAt, now) : null
    label = `${day || localDate(ev.startsAt)}, ${localTime(ev.startsAt, { zone: true })}`
  }
  return [{ icon: 'calendar', label }, place].filter(Boolean)
}

// In-person events: the time where it happens ("18:30–20:00 GMT in Bath").
export function venueTimeLine(ev, start = ev.startsAt, end = ev.endsAt) {
  if (ev.format !== 'in-person' || !start) return null
  const tz = eventZone(ev)
  return `${localDate(start, { timeZone: tz })}, ${localRange(start, end, { timeZone: tz })} in ${ev.venue?.city || zoneCity(tz)}`
}

/* Per date ----------------------------------------------------------------------------------- */

export const perDatePrice = (product) => product?.prices?.find((p) => p.perDate) || null

// Dates a buyer can still pick (not yet ended), with places left: [{ ...occurrence, left, full }].
export function dateOptions(product, now = Date.now()) {
  const ev = product.event || {}
  const limit = ev.perDate?.limit ?? null
  return occurrences(ev).map((o, i) => {
    const going = ev.perDate?.going?.[i] ?? 0
    const left = limit == null ? null : Math.max(0, limit - going)
    return { ...o, left, full: left === 0 }
  }).filter((o) => o.end > now)
}

// The chosen dates that can still be bought, in date order.
export function pickDates(product, keys, now = Date.now()) {
  const wanted = new Set(Array.isArray(keys) ? keys : String(keys || '').split(',').filter(Boolean))
  return dateOptions(product, now).filter((o) => !o.full && wanted.has(o.key))
}

// Valid keys from a URL or cart, else the first date with places (null when none are left).
export function perDateKeys(product, keys, now = Date.now()) {
  const picked = pickDates(product, keys, now)
  if (picked.length) return picked.map((o) => o.key)
  const first = dateOptions(product, now).find((o) => !o.full)
  return first ? [first.key] : null
}

// "Wed 21, 28 Oct, 4 Nov" in the visitor's zone.
export function datesSummary(occs) {
  const groups = []
  occs.forEach((o, i) => {
    const [weekday, day, month] = localDate(o.start).split(' ')
    const last = groups[groups.length - 1]
    const text = i === 0 ? `${weekday} ${day}` : day
    if (last && last.month === month) last.days.push(text)
    else groups.push({ month, days: [text] })
  })
  return groups.map((g) => `${g.days.join(', ')} ${g.month}`).join(', ')
}

export const datesCount = (n) => (n === 1 ? '1 date' : `${n} dates`)
