// Cart and checkout sessions, the way Shopify keeps them: a cart token for the cart, and a
// checkout token for each checkout, so an abandoned-checkout email can link back to the exact
// checkout (/checkout/recover/<token>). In EzyCourse the server stores both; here localStorage
// stands in, on this device only. Data model, expiry and privacy: docs/cart-sessions.md.
import { useCallback, useEffect, useRef } from 'react'

export const ABANDONED_AFTER = 60 * 60 * 1000 // 1 hour with no activity
export const LINK_EXPIRES_AFTER = 30 * 24 * 60 * 60 * 1000 // recovery links work for 30 days
const SAVE_DELAY = 600 // ms: details typed at checkout are saved once the buyer pauses
const KEEP = 20 // newest checkout sessions kept on this device
const CART_KEY = 'halvera-cart'
const SESSIONS_KEY = 'halvera-checkouts'
const STEPS = ['contact', 'billing', 'payment', 'review']

const now = () => Date.now()
const load = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
const store = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}

// 'c_' or 'co_' + 24 random base-36 characters. Unguessable: the token is the only key to a checkout.
export function newToken(prefix) {
  const bytes = new Uint8Array(24)
  try { crypto.getRandomValues(bytes) } catch { bytes.forEach((_, i) => { bytes[i] = Math.floor(Math.random() * 256) }) }
  return prefix + Array.from(bytes, (b) => (b % 36).toString(36)).join('')
}

// ---- Cart ------------------------------------------------------------------------------
// { token, items: [{ productId, priceId, amount?, dates?, quantity? }], email, status, checkoutToken, createdAt, updatedAt }
// quantity: library items at a one-time price only (1–10); missing reads as 1.
// status: 'active' → 'checkout_started' → 'completed' (or 'abandoned', worked out on read)

export const emptyCart = () => ({ token: null, items: [], email: null, status: 'active', checkoutToken: null, createdAt: null, updatedAt: null })

export function newCart(items = []) {
  const t = now()
  return { ...emptyCart(), token: newToken('c_'), items, createdAt: t, updatedAt: t }
}

// The saved cart, or null when there isn't one. Reads the old plain-array shape too.
export function readCart() {
  const saved = load(CART_KEY)
  if (Array.isArray(saved)) return saved.length ? newCart(saved) : emptyCart()
  if (saved && Array.isArray(saved.items)) return { ...emptyCart(), ...saved }
  return null
}

export const writeCart = (cart) => store(CART_KEY, cart)

// A cart whose checkout has gone quiet for an hour is abandoned.
export function cartStatus(cart) {
  if (cart.status === 'checkout_started' && getCheckoutSession(cart.checkoutToken)?.status === 'abandoned') return 'abandoned'
  return cart.status
}

// ---- Checkout sessions -----------------------------------------------------------------
// { token, cartToken, route, kind, items, lines, total, coupon, bump, siteAccessPriceId, gift, cohortId,
//   email, name, marketingConsent, step, status, createdAt, updatedAt, completedAt, recoveredAt }
// stored status: 'open' | 'completed'. Read status adds 'abandoned' (1 hour quiet) and 'expired' (30 days).

const allSessions = () => {
  const s = load(SESSIONS_KEY)
  return s && typeof s === 'object' && !Array.isArray(s) ? s : {}
}

function statusOf(s, at = now()) {
  if (s.status === 'completed') return 'completed'
  if (at - s.updatedAt > LINK_EXPIRES_AFTER) return 'expired'
  if (at - s.updatedAt > ABANDONED_AFTER) return 'abandoned'
  return 'open'
}

export function getCheckoutSession(token) {
  if (!token || typeof token !== 'string') return null
  const s = allSessions()[token]
  return s ? { ...s, status: statusOf(s) } : null
}

// Open and abandoned checkouts can be picked up again; completed and expired ones can't.
export const isResumable = (session) => Boolean(session) && (session.status === 'open' || session.status === 'abandoned')

const later = (a, b) => (STEPS.indexOf(b) > STEPS.indexOf(a) ? b : a)

// Create or update a checkout session. Completed sessions don't change.
export function saveCheckoutSession(token, patch) {
  const sessions = allSessions()
  const old = sessions[token]
  if (old?.status === 'completed') return { ...old }
  const t = now()
  const next = {
    status: 'open', createdAt: t,
    ...old, ...patch,
    token, step: later(old?.step || 'contact', patch.step || 'contact'), updatedAt: t,
  }
  sessions[token] = next
  // Keep the newest few on this device.
  const keep = Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, KEEP)
  store(SESSIONS_KEY, Object.fromEntries(keep.map((s) => [s.token, s])))
  return { ...next, status: statusOf(next, t) }
}

export function completeCheckoutSession(token) {
  const sessions = allSessions()
  if (!sessions[token]) return
  const t = now()
  sessions[token] = { ...sessions[token], status: 'completed', completedAt: t, updatedAt: t }
  store(SESSIONS_KEY, sessions)
}

export function markRecovered(token) {
  const sessions = allSessions()
  if (!sessions[token]) return
  sessions[token] = { ...sessions[token], recoveredAt: now(), updatedAt: now() }
  store(SESSIONS_KEY, sessions)
}

// Checkout for the cart, carrying on with the checkout already started for it (coupon, email) while it's open.
export function cartCheckoutHref(checkoutToken) {
  const session = checkoutToken ? getCheckoutSession(checkoutToken) : null
  return isResumable(session) && session.kind === 'cart' ? `/checkout/cart?session=${encodeURIComponent(session.token)}` : '/checkout/cart'
}

// The link an abandoned-checkout email carries.
export const recoveryUrl = (token) => `/checkout/recover/${encodeURIComponent(token)}`

// Where a recovered session continues: the cart checkout, or the single-product checkout URL.
export function resumeHref(session) {
  const p = new URLSearchParams()
  if (session.kind !== 'cart') {
    const item = session.items?.[0]
    if (item) {
      if (item.priceId) p.set('price', item.priceId)
      if (item.amount != null) p.set('amount', String(item.amount))
    }
    if (session.gift) p.set('gift', '1')
    if (session.cohortId) p.set('cohort', session.cohortId)
  }
  p.set('session', session.token)
  const route = session.kind === 'cart' ? 'cart' : session.route
  return `/checkout/${route}?${p}`
}

// Which step the buyer has reached, from what they've filled in so far.
export function stepReached({ signedIn, emailValid, country, cardStarted, terms }) {
  if (cardStarted || terms) return 'review'
  if (country) return 'payment'
  if (signedIn || emailValid) return 'billing'
  return 'contact'
}

// Keep a checkout session up to date while the buyer types: the first save is immediate (so the
// session exists straight away), then saves wait until the buyer pauses. Pending saves are flushed
// when the page is left. snapshot: the fields to store, or null to stop saving (thank-you page).
// Returns flush(), which saves anything pending now.
export function useCheckoutSessionSaver(token, snapshot, onSaved) {
  const json = snapshot ? JSON.stringify(snapshot) : null
  const first = useRef(true)
  const pending = useRef(null)
  const saved = useRef(onSaved)
  useEffect(() => { saved.current = onSaved })

  useEffect(() => {
    if (!json) { pending.current = null; return undefined }
    const run = () => {
      pending.current = null
      saved.current?.(saveCheckoutSession(token, JSON.parse(json)))
    }
    pending.current = run
    if (first.current) { first.current = false; run(); return undefined }
    const timer = setTimeout(run, SAVE_DELAY)
    return () => clearTimeout(timer)
  }, [token, json])

  useEffect(() => {
    const flush = () => pending.current?.()
    window.addEventListener('pagehide', flush)
    return () => { window.removeEventListener('pagehide', flush); flush() }
  }, [])

  return useCallback(() => pending.current?.(), [])
}
