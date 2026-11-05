// The signed-in student's event registrations (the preview's "student" and "member" viewers).
// In EzyCourse these come from the account: tickets bought or registered for, waitlist places,
// and the membership plan's event allowance ("event slots"). Dates are relative to today.
import { localDate, wallTime } from '@/components/product/time.js'
import { ORGANISER_ZONE, dateOptions } from '@/components/event/dates.js'
import { eventProducts } from './events.js'

const daysAgo = (n) => localDate(wallTime(-n, '12:00', ORGANISER_ZONE))
// When a ticket was bought: the date shown, and the moment (its order in Payments).
const bought = (n) => ({ bought: daysAgo(n), boughtAt: wallTime(-n, '19:30', ORGANISER_ZONE) })

// The two Wednesday breathwork evenings the student picked with the "Per date" price.
const breathwork = eventProducts.find((p) => p.slug === 'wednesday-breathwork')
const pickedDates = dateOptions(breathwork).filter((o) => !o.full).slice(0, 2).map((o) => o.key)

// Tickets, keyed by event slug. status uses the platform's order words (Paid, Refunded) or
// Registered for free and membership events. price is the product price id bought; dates are
// the dates bought with a per-date price (organiser's calendar dates, 'YYYY-MM-DD').
export const tickets = {
  // Bought in a cart with another product, so its order is that cart's (src/data/account.js).
  'spring-gut-workshop': { number: 'HH-E-40211', status: 'Paid', price: 'ticket', ...bought(29), order: 'HH-10320' },
  'gut-brain-webinar': { number: 'HH-E-40388', status: 'Paid', price: 'ticket', ...bought(7) },
  'hormone-qa-live': { number: 'HH-E-40502', status: 'Registered' },
  'nourish-weekend': { number: 'HH-E-40417', status: 'Paid', price: 'once', ...bought(6) },
  'wednesday-breathwork': { number: 'HH-E-40455', status: 'Paid', price: 'per-date', dates: pickedDates, ...bought(3) },
  'autumn-immunity-talk': { number: 'HH-E-39920', status: 'Paid', price: 'replay', ...bought(15) },
  'sleep-reset-london': { number: 'HH-E-39804', status: 'Paid', price: 'ticket', ...bought(34) },
  'mindful-morning-bath': { number: 'HH-E-40126', status: 'Refunded', price: 'ticket', ...bought(13), refund: '$25.00' },
}

// Waitlist places: the student is 3rd for the sold-out retreat.
export const waitlist = { 'winter-retreat': 3 }

// The member's plan allowance: event places a month (Sell → Memberships → plan allowances).
// Places reset on the 1st of next month.
const firstOfNextMonth = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 12).toISOString()
}
export const eventPlaces = { perMonth: 2, used: 1, resets: localDate(firstOfNextMonth()) }

export const ticketFor = (product, viewer) =>
  (viewer.role === 'visitor' ? null : tickets[product.slug] || null)
