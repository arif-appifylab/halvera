// Date helpers for Bookings: calendar months and day names, and a ticket's next date.
import { nextOccurrence, pickDates } from '@/components/event/eventState.js'

// { y, m } of a 'YYYY-MM-DD' key.
export const monthOf = (key) => ({ y: Number(key.slice(0, 4)), m: Number(key.slice(5, 7)) - 1 })
// "Monday 19 October"
export const longDay = (key) => new Date(`${key}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

// The next date this ticket is for (a per-date ticket's own dates), or null when none are left.
export function nextFor(product, ticket, now) {
  if (ticket.dates) return pickDates(product, ticket.dates, now)[0] || null
  return nextOccurrence(product.event, now)
}
