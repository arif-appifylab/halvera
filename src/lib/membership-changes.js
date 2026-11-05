// Plan changes and cancellations the member makes from the dashboard, kept in this browser so the
// Membership tab, Payments and Home agree until the page is reloaded elsewhere. In EzyCourse these
// are the subscription itself (a scheduled switch, "Cancels at period end", "Cancellation undone").
//   switch:  { planId, priceId, when: 'now' | 'end', at, paidToday }   an upgrade applied now or a
//            downgrade waiting for the end of the paid period
//   cancel:  { at, reason, note, requestedAt }                         ends at the end of the period
//   offer:   { id, result }                                            an offer taken instead of cancelling
import { useSyncExternalStore } from 'react'

const KEY = 'halvera-membership-changes'
const listeners = new Set()
const read = () => {
  try { return JSON.parse(sessionStorage.getItem(KEY)) || {} } catch { return {} }
}
let state = typeof window === 'undefined' ? {} : read()

function save(next) {
  state = next
  try { sessionStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage blocked: this page only */ }
  notify()
}
const patch = (id, change) => save({ ...state, [id]: { ...state[id], ...change } })
const drop = (id, key) => { const { [key]: _gone, ...rest } = state[id] || {}; save({ ...state, [id]: rest }) }

export const membershipChanges = {
  switchPlan: (id, change) => patch(id, { switch: change }),
  undoSwitch: (id) => drop(id, 'switch'),
  cancel: (id, change) => patch(id, { cancel: change }),
  undoCancel: (id) => drop(id, 'cancel'),
  takeOffer: (id, offer) => patch(id, { offer }),
  undoOffer: (id) => drop(id, 'offer'),
}

// Custom success-path steps the member ticked (custom steps have no trigger). Kept in localStorage
// with the member's progress, and read back through the same subscription.
const STEPS_KEY = 'halvera-success-path'
const readSteps = () => { try { return JSON.parse(localStorage.getItem(STEPS_KEY)) || [] } catch { return [] } }
let ticked = typeof window === 'undefined' ? [] : readSteps()
let snap = { ...state, ticked }
const notify = () => { snap = { ...state, ticked }; listeners.forEach((fn) => fn()) }

export function tickStep(id, on) {
  ticked = on ? [...new Set([...ticked, id])] : ticked.filter((x) => x !== id)
  try { localStorage.setItem(STEPS_KEY, JSON.stringify(ticked)) } catch { /* storage blocked: this page only */ }
  notify()
}

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
const snapshot = () => snap

/** { [membershipId]: change, ticked: [stepId] } and re-renders when either changes. */
export function useMembershipChanges() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
