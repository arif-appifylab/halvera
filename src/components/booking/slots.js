// Turn an appointment type's stored slots into what the booking page shows.
import { bookingNow, practitionerZone } from '@/data/appointments.js'
import { dateKeyIn, zonedToUtc } from './time.js'

const isOpen = (s) => !s.full && !s.limit

// Merged, bookable-window slots: one entry per start time, with every host who works then.
// host: 'any' (round robin "Any available practitioner") or a practitioner id.
export function prepareSlots(type, { host = 'any', now = bookingNow } = {}) {
  const earliest = now + (type.noticeHours || 0) * 3600000
  const byId = new Map()
  type.slots.forEach((s) => {
    if (host !== 'any' && s.host !== host) return
    const id = `${s.date}T${s.time}`
    const utc = zonedToUtc(s.date, s.time, practitionerZone)
    if (utc < earliest) return // inside the minimum notice, so not offered
    const cur = byId.get(id)
    if (!cur) {
      byId.set(id, { id, utc, hosts: [s.host], free: isOpen(s) ? [s.host] : [], spots: s.spots, full: Boolean(s.full), limit: Boolean(s.limit) })
    } else {
      cur.hosts.push(s.host)
      if (isOpen(s)) cur.free.push(s.host)
      cur.full = cur.full && Boolean(s.full)
      cur.limit = cur.limit && Boolean(s.limit)
      if (s.spots != null) cur.spots = Math.max(cur.spots || 0, s.spots)
    }
  })
  return [...byId.values()].sort((a, b) => a.utc - b.utc)
}

export const slotOpen = (s) => Boolean(s) && s.free.length > 0 && !s.full && !s.limit

// Slots grouped by calendar day in the display zone, with each day's status:
// 'open' (has bookable times) | 'limit' (daily booking cap reached) | 'full' (every slot taken).
export function slotsByDay(slots, zone) {
  const days = new Map()
  slots.forEach((s) => {
    const key = dateKeyIn(s.utc, zone)
    if (!days.has(key)) days.set(key, { key, slots: [] })
    days.get(key).slots.push(s)
  })
  days.forEach((d) => {
    d.status = d.slots.some(slotOpen) ? 'open' : d.slots.some((s) => s.limit) ? 'limit' : 'full'
  })
  return days
}

// Round robin: the free host with the fewest bookings this week, then the listed order.
export function assignHost(type, slot) {
  const pool = slot ? slot.free : []
  if (!pool.length) return type.hosts[0]
  const load = type.load || {}
  return [...pool].sort((a, b) => (load[a] || 0) - (load[b] || 0) || type.hosts.indexOf(a) - type.hosts.indexOf(b))[0]
}

// Meetup poll options as instants.
export const pollOptions = (poll) => poll.options.map((o) => ({ ...o, utc: zonedToUtc(o.date, o.time, practitionerZone) }))
