// Sends recorded events to the school's backend in batches. Never blocks the UI: work is
// scheduled on timers / idle callbacks, and every failure is swallowed and retried.
//
//   POST {endpoint}  body { v: 1, sentAt, events: [...] }  (application/json, same-origin cookies)
//
// While the page is visible, batches go with fetch(keepalive) so the server's answer is known:
// 2xx done, 408/429/5xx/offline retried with exponential backoff + jitter, other 4xx dropped.
// When the page is hidden or closing (visibilitychange → hidden, pagehide) or flush({ beacon: true }),
// everything left goes with navigator.sendBeacon. Anything the browser refuses is kept in
// localStorage and sent on the next page load. The server must treat event ids as idempotent.
//
// Sending is OFF by default: the theme preview has no backend, so events stay in the in-memory
// store and reach subscribe() listeners only. Turn it on with configure({ send: true }), with
// VITE_ANALYTICS_ENDPOINT at build time, or window.__SW_ANALYTICS__ = { send: true, endpoint }.

const OUTBOX_KEY = 'sw-analytics-outbox'
const env = (() => { try { return import.meta.env || {} } catch { return {} } })()
const preset = globalThis.window?.__SW_ANALYTICS__ || {}

const cfg = {
  endpoint: preset.endpoint || env.VITE_ANALYTICS_ENDPOINT || '/api/learning-events',
  send: preset.send ?? !!env.VITE_ANALYTICS_ENDPOINT,
  batchSize: 25,
  flushInterval: 10000, // ms after the first queued event
  maxQueue: 1000,
  maxBackoff: 60000,
  beaconBytes: 60000, // sendBeacon payloads are capped near 64 KB
}

const queue = []
let timer = null
let inflight = false
let attempt = 0
let wired = false
let restored = false

export const transportConfig = () => ({ ...cfg })

export function configureTransport(opts = {}) {
  for (const k of ['endpoint', 'send', 'batchSize', 'flushInterval', 'maxQueue', 'maxBackoff']) {
    if (opts[k] !== undefined) cfg[k] = opts[k]
  }
  if (cfg.send) { wire(); restore(); schedule(cfg.flushInterval) }
}

export function enqueue(event) {
  if (!cfg.send) return
  wire()
  restore()
  queue.push(event)
  if (queue.length > cfg.maxQueue) queue.splice(0, queue.length - cfg.maxQueue)
  schedule(queue.length >= cfg.batchSize ? 0 : cfg.flushInterval)
}

function schedule(delay) {
  if (timer || !queue.length) return
  timer = setTimeout(() => {
    timer = null
    const run = () => { flushQueue() }
    if (globalThis.requestIdleCallback) globalThis.requestIdleCallback(run, { timeout: 2000 })
    else run()
  }, delay)
}

const payload = (events) => JSON.stringify({ v: 1, sentAt: new Date().toISOString(), events })

// Split events into chunks whose JSON stays under the beacon limit.
function chunks(events) {
  const out = []
  let cur = []
  for (const e of events) {
    const next = [...cur, e]
    if (cur.length && (next.length > cfg.batchSize || payload(next).length > cfg.beaconBytes)) { out.push(cur); cur = [e] } else cur = next
  }
  if (cur.length) out.push(cur)
  return out
}

function beaconAll() {
  const nav = globalThis.navigator
  const pending = queue.splice(0, queue.length)
  const failed = []
  for (const batch of chunks(pending)) {
    let ok = false
    try {
      ok = !!nav?.sendBeacon && nav.sendBeacon(cfg.endpoint, new Blob([payload(batch)], { type: 'application/json' }))
    } catch { ok = false }
    if (!ok) failed.push(...batch)
  }
  if (failed.length) {
    queue.unshift(...failed)
    persist()
  }
  return failed.length === 0
}

export function flushQueue({ beacon = false } = {}) {
  if (!cfg.send || !queue.length) return Promise.resolve(false)
  const hidden = globalThis.document?.visibilityState === 'hidden'
  if (beacon || hidden || typeof globalThis.fetch !== 'function') return Promise.resolve(beaconAll())
  if (inflight) return Promise.resolve(false)
  if (globalThis.navigator?.onLine === false) return Promise.resolve(false) // 'online' reschedules

  const batch = queue.splice(0, cfg.batchSize)
  inflight = true
  return globalThis.fetch(cfg.endpoint, {
    method: 'POST',
    keepalive: true,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: payload(batch),
  }).then((res) => {
    if (res.ok) return true
    if (res.status === 408 || res.status === 429 || res.status >= 500) throw new Error(String(res.status))
    return true // other 4xx: the batch is malformed; retrying won't help
  }).then(() => {
    inflight = false
    attempt = 0
    persist()
    if (queue.length) schedule(0)
    return true
  }).catch(() => {
    inflight = false
    queue.unshift(...batch)
    attempt += 1
    const delay = Math.min(cfg.maxBackoff, 1000 * 2 ** attempt) * (0.5 + Math.random() / 2)
    schedule(delay)
    return false
  })
}

function persist() {
  try {
    if (queue.length) globalThis.localStorage?.setItem(OUTBOX_KEY, JSON.stringify(queue.slice(-200)))
    else globalThis.localStorage?.removeItem(OUTBOX_KEY)
  } catch { /* storage full or blocked */ }
}

function restore() {
  if (restored) return
  restored = true
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(OUTBOX_KEY) || '[]')
    if (Array.isArray(saved) && saved.length) {
      const ids = new Set(queue.map((e) => e.id))
      queue.unshift(...saved.filter((e) => e && e.id && !ids.has(e.id)))
    }
  } catch { /* ignore a broken outbox */ }
}

function wire() {
  if (wired || typeof window === 'undefined') return
  wired = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushQueue({ beacon: true })
  })
  window.addEventListener('pagehide', () => flushQueue({ beacon: true }))
  window.addEventListener('online', () => { attempt = 0; schedule(0) })
}
