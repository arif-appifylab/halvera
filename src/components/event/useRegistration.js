// What this viewer holds for an event: a ticket, a waitlist place, or nothing. Combines the
// account's tickets (src/data/event-registrations.js) with what they do in this visit (register,
// join the waitlist, cancel), which stays in sessionStorage so the ticket page sees it too.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { ownsProduct } from '@/lib/products.js'
import { ticketFor, waitlist as accountWaitlist, eventPlaces } from '@/data/event-registrations.js'

const KEY = 'halvera-event-registrations'
let local = (() => {
  try { return JSON.parse(sessionStorage.getItem(KEY)) || {} } catch { return {} }
})()
const listeners = new Set()

function save(slug, entry) {
  local = { ...local, [slug]: entry }
  try { sessionStorage.setItem(KEY, JSON.stringify(local)) } catch { /* storage unavailable */ }
  listeners.forEach((l) => l())
}
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }
const snapshot = () => local

const ticketNumber = (slug) => `HH-E-${String(40600 + (slug.length * 37) % 400)}`

export function registrationFor(product, viewer, entries = local) {
  const mine = entries[product.slug]
  if (mine?.kind === 'cancelled') return { ticket: null, cancelled: mine, waitlist: null }
  if (mine?.kind === 'registered') return { ticket: mine, waitlist: null }
  if (mine?.kind === 'waitlist') return { ticket: null, waitlist: mine }
  const account = ticketFor(product, viewer)
  if (account) return { ticket: account, waitlist: null }
  // Bought through an order (src/data/account.js). Membership events need a place, so plan access alone isn't a ticket.
  if (product.visibility !== 'membership' && ownsProduct(product, viewer)) return { ticket: { status: 'Paid', number: ticketNumber(product.slug) }, waitlist: null }
  const position = viewer.role !== 'visitor' ? accountWaitlist[product.slug] : null
  return { ticket: null, waitlist: position ? { position } : null }
}

// Does the viewer hold (or just cancelled) a ticket? The ticket page opens for them.
export const holdsTicket = (product, viewer) => {
  if (product.type !== 'event' || viewer.role === 'visitor') return false
  const reg = registrationFor(product, viewer)
  return Boolean(reg.ticket || reg.cancelled)
}

export function useRegistration(product, viewer) {
  const entries = useSyncExternalStore(subscribe, snapshot, snapshot)
  const reg = registrationFor(product, viewer, entries)
  const usedPlaces = eventPlaces.used + Object.values(entries).filter((e) => e.kind === 'registered' && e.viaPlace).length
  return {
    ...reg,
    places: { ...eventPlaces, used: Math.min(usedPlaces, eventPlaces.perMonth) },
    register: (extra = {}) => save(product.slug, { kind: 'registered', status: 'Registered', number: ticketNumber(product.slug), ...extra }),
    joinWaitlist: (position, email) => save(product.slug, { kind: 'waitlist', position, email }),
    cancel: (refund) => save(product.slug, { kind: 'cancelled', status: reg.ticket?.status, refund }),
  }
}

// Every event the viewer holds a ticket for (or cancelled in this visit), for the dashboard's
// Tickets page: [{ product, ticket, cancelled, cancel(refund) }].
export function useEventTickets(products, viewer) {
  const entries = useSyncExternalStore(subscribe, snapshot, snapshot)
  if (viewer.role === 'visitor') return []
  return products.filter((p) => p.type === 'event').map((product) => {
    const reg = registrationFor(product, viewer, entries)
    return {
      product, ticket: reg.ticket, cancelled: reg.cancelled || null,
      cancel: (refund) => save(product.slug, { kind: 'cancelled', status: reg.ticket?.status, number: reg.ticket?.number, refund }),
    }
  }).filter((r) => r.ticket || r.cancelled)
}

// The current time, refreshed every 30 seconds so join links appear on time.
export function useNow(every = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every)
    return () => clearInterval(t)
  }, [every])
  return now
}
