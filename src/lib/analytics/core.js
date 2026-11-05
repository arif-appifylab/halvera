// Core of the lesson tracker: context, consent, dedupe, in-memory store, listeners.
// Import from '@/lib/analytics' (index.js), not from here.

import { enqueue, flushQueue, configureTransport, transportConfig } from './transport.js'

const listeners = new Set()
const store = [] // recent events, newest last (preview panel, summarise in the preview)
const seenIds = new Set()
let context = {}
let seq = 0

const config = {
  storeLimit: 500,
  // Events that keep the course working (progress, certificates, grading). They are part of the
  // service, so they are still recorded when analytics consent is off.
  essential: new Set([
    'lesson_complete', 'lesson_uncomplete', 'quiz_submit', 'quiz_result', 'survey_submit',
    'assignment_submit', 'scorm_status', 'scorm_score', 'scorm_exit',
  ]),
}

// Fields that could carry personal data or free text. Dropped from every event: the backend
// already knows the signed-in user from the session, and we never send what someone wrote.
const BLOCKED_FIELDS = ['email', 'name', 'userName', 'fullName', 'phone', 'text', 'answer', 'answers', 'message', 'content', 'body', 'suspendData']

const uid = () => {
  try { if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID() } catch { /* fall through */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const safeStorage = {
  get(key) { try { return globalThis.localStorage?.getItem(key) ?? null } catch { return null } },
  set(key, v) { try { globalThis.localStorage?.setItem(key, v) } catch { /* private mode */ } },
  remove(key) { try { globalThis.localStorage?.removeItem(key) } catch { /* private mode */ } },
}
export { safeStorage as _storage }

/* ---------- Consent ---------- */

const CONSENT_KEY = 'sw-analytics-consent'
const dnt = () => {
  const n = globalThis.navigator
  return !!n && (n.doNotTrack === '1' || n.globalPrivacyControl === true || globalThis.doNotTrack === '1')
}

// true / false once the person chose; otherwise Do Not Track or Global Privacy Control decide.
export function getConsent() {
  const v = safeStorage.get(CONSENT_KEY)
  if (v === 'granted') return { allowed: true, source: 'choice' }
  if (v === 'denied') return { allowed: false, source: 'choice' }
  return dnt() ? { allowed: false, source: 'do-not-track' } : { allowed: true, source: 'default' }
}

export function setConsent(allowed) {
  if (allowed == null) safeStorage.remove(CONSENT_KEY)
  else safeStorage.set(CONSENT_KEY, allowed ? 'granted' : 'denied')
  return getConsent()
}

/* ---------- Context ---------- */

export function setLessonContext(ctx) {
  if (!ctx) { context = {}; return }
  const newVisit = ctx.lessonId !== context.lessonId || ctx.courseSlug !== context.courseSlug || ctx.newVisit
  const rest = { ...ctx }
  delete rest.newVisit
  context = { ...rest, sessionId: ctx.sessionId || (newVisit ? uid() : context.sessionId) || uid() }
}

export const getContext = () => ({ ...context })

/* ---------- Media playing (keeps a lesson active without input) ---------- */

const playing = new Set()
export function markMediaPlaying(on, key = 'media') {
  if (on) playing.add(key); else playing.delete(key)
}
export const isMediaPlaying = () => playing.size > 0

/* ---------- Track ---------- */

function notify(event) {
  listeners.forEach((fn) => { try { fn(event) } catch { /* a listener never breaks tracking */ } })
}

function clean(data) {
  const out = {}
  for (const [k, v] of Object.entries(data || {})) {
    if (BLOCKED_FIELDS.includes(k) || v === undefined || typeof v === 'function') continue
    out[k] = v
  }
  return out
}

export function track(type, data = {}) {
  try {
    if (!type || typeof type !== 'string') return null
    if (!config.essential.has(type) && !getConsent().allowed) return null

    const { dedupeKey, id: givenId, ...rest } = data || {}
    const sessionId = rest.sessionId || context.sessionId
    const id = givenId || (dedupeKey ? `${sessionId || 'nosession'}:${type}:${dedupeKey}` : uid())
    if (seenIds.has(id)) return null
    seenIds.add(id)
    if (seenIds.size > 5000) seenIds.delete(seenIds.values().next().value)

    const event = {
      id,
      type,
      at: new Date().toISOString(),
      seq: ++seq,
      ...context,
      ...clean(rest),
    }
    if (sessionId) event.sessionId = sessionId

    store.push(event)
    if (store.length > config.storeLimit) store.splice(0, store.length - config.storeLimit)
    enqueue(event)
    notify(event)
    return event
  } catch {
    return null
  }
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Recent events (newest last). Optional filter: { lessonId, courseSlug, sessionId, type }.
export function getEvents(filter = {}) {
  const keys = Object.keys(filter).filter((k) => filter[k] != null)
  return keys.length ? store.filter((e) => keys.every((k) => e[k] === filter[k])) : store.slice()
}

export function clearEvents() {
  store.length = 0
}

// Send queued events now. `{ beacon: true }` forces navigator.sendBeacon (page hide / unload).
export function flush(opts) { return flushQueue(opts) }

// Current settings, without changing anything.
export const getConfig = () => ({ ...transportConfig(), storeLimit: config.storeLimit, essential: [...config.essential] })

// { endpoint, send, batchSize, flushInterval, storeLimit, essential } — see ./transport.js.
export function configure(opts = {}) {
  if (opts.storeLimit) config.storeLimit = opts.storeLimit
  if (opts.essential) config.essential = new Set(opts.essential)
  configureTransport(opts)
  return getConfig()
}

