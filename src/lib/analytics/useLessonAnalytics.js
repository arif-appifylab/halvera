// useLessonAnalytics(lesson, product, { done, access, enabled }) — used once by the course player.
//
// • Sets the lesson context (a new lesson id = a new visit / sessionId) and emits lesson_view.
// • Measures ACTIVE time: it only counts while the tab is visible AND the learner was active in the
//   last 60 s (pointer, key, wheel, touch, scroll, focus) OR media is playing (markMediaPlaying, or
//   any <audio>/<video> on the page, picked up automatically) OR focus is inside an embedded
//   iframe (up to 5 minutes without parent-page input, since its input can't be seen from here).
//   Same rule as the admin's reading timer: "Timers pause when the tab is hidden or the user is
//   idle for 60 seconds."
// • Emits lesson_active_time { seconds, totalSeconds, reason } every 15 s while there is new
//   active time, and on leave (lesson change, unmount, tab hidden, pagehide). `seconds` is the
//   increment since the last report, so summing them never double counts.
// • Emits lesson_complete / lesson_uncomplete when `done` changes during the visit.

import { useEffect, useLayoutEffect, useRef } from 'react'
import { track, setLessonContext, getContext, isMediaPlaying, markMediaPlaying, flush } from './core.js'
import { parseDuration } from './watch.js'

export const IDLE_MS = 60000
export const IFRAME_IDLE_MS = 300000
export const HEARTBEAT_MS = 15000
const TICK_MS = 1000

let lastInput = Date.now()
let live = { courseSlug: null, lessonId: null, seconds: 0, active: false }
let pendingClear = null

// The current visit's active seconds, updated every second (the preview panel reads it).
export const getLiveActiveSeconds = () => live

const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible'
const inIframe = () => typeof document !== 'undefined' && document.activeElement?.tagName === 'IFRAME'

export function isActiveNow(now = Date.now()) {
  if (!visible()) return false
  if (isMediaPlaying()) return true
  const idle = now - lastInput
  return idle < IDLE_MS || (inIframe() && idle < IFRAME_IDLE_MS)
}

let wired = false
function wireActivity() {
  if (wired || typeof window === 'undefined') return
  wired = true
  const bump = () => { lastInput = Date.now() }
  const opts = { passive: true, capture: true }
  for (const t of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll', 'focusin', 'input']) window.addEventListener(t, bump, opts)
  let lastMove = 0
  window.addEventListener('pointermove', () => {
    const n = Date.now()
    if (n - lastMove > 1000) { lastMove = n; lastInput = n }
  }, opts)
  // Focus moving into an embedded iframe blurs the window: count it as input.
  window.addEventListener('blur', () => { setTimeout(() => { if (inIframe()) bump() }, 0) })

  // Any media element keeps the lesson active while it plays, without the player having to call
  // markMediaPlaying itself. (Media events don't bubble; capture sees them.)
  const keys = new WeakMap()
  let n = 0
  const onMedia = (e) => {
    const el = e.target
    if (!el || !(el instanceof HTMLMediaElement)) return
    if (!keys.has(el)) keys.set(el, `el-${++n}`)
    markMediaPlaying(e.type === 'playing', keys.get(el))
    if (e.type !== 'playing') bump() // the 60 s grace starts when playback stops
  }
  for (const t of ['playing', 'pause', 'ended', 'emptied', 'abort']) document.addEventListener(t, onMedia, true)
}

export function useLessonAnalytics(lesson, product, { done = false, access, enabled = true } = {}) {
  const lessonId = lesson?.id
  const courseSlug = product?.slug
  const meta = useRef({})
  // Latest props for the effects below, without restarting the visit when they change.
  useLayoutEffect(() => { meta.current = { lesson, access, enabled } })
  const doneRef = useRef({ lessonId: null, done: false })

  // Layout effect: the context must be set before the lesson renderers' own effects run.
  useLayoutEffect(() => {
    if (!lessonId || !courseSlug) return undefined
    wireActivity()
    clearTimeout(pendingClear)
    const l = meta.current.lesson || {}
    setLessonContext({ courseSlug, lessonId, lessonType: l.type })
    const ctx = getContext()
    track('lesson_view', {
      dedupeKey: 'view',
      access: meta.current.access,
      chapter: l.chapter,
      preview: !!l.preview,
      durationSeconds: parseDuration(l.duration) ?? undefined,
    })

    let activeMs = 0
    let unsentMs = 0
    let last = Date.now()
    live = { courseSlug, lessonId, seconds: 0, active: false }

    const tick = () => {
      const now = Date.now()
      const dt = Math.min(now - last, TICK_MS * 2) // a sleeping laptop doesn't add hours
      last = now
      const on = meta.current.enabled !== false && isActiveNow(now)
      if (on) { activeMs += dt; unsentMs += dt }
      live = { courseSlug, lessonId, seconds: Math.floor(activeMs / 1000), active: on }
    }

    const report = (reason) => {
      tick()
      const seconds = reason === 'heartbeat' ? Math.floor(unsentMs / 1000) : Math.round(unsentMs / 1000)
      if (seconds < 1) return
      unsentMs = Math.max(0, unsentMs - seconds * 1000)
      // Explicit ids: on a lesson change this runs after the next lesson's context is set.
      track('lesson_active_time', {
        courseSlug: ctx.courseSlug, lessonId: ctx.lessonId, lessonType: ctx.lessonType, sessionId: ctx.sessionId,
        seconds, totalSeconds: Math.round(activeMs / 1000), reason, mediaPlaying: isMediaPlaying(),
      })
    }

    const tickId = setInterval(tick, TICK_MS)
    const beatId = setInterval(() => report('heartbeat'), HEARTBEAT_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') { report('hidden'); flush({ beacon: true }) } else { last = Date.now(); lastInput = Date.now() }
    }
    const onPageHide = () => { report('leave'); flush({ beacon: true }) }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)

    return () => {
      report('leave')
      clearInterval(tickId)
      clearInterval(beatId)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      live = { ...live, active: false }
      // Deferred, so a StrictMode re-mount of the same lesson keeps its visit.
      pendingClear = setTimeout(() => setLessonContext(null), 0)
    }
  }, [courseSlug, lessonId])

  useEffect(() => {
    if (!lessonId) return
    const prev = doneRef.current
    doneRef.current = { lessonId, done }
    if (prev.lessonId !== lessonId || prev.done === done) return // first render of a lesson, or no change
    track(done ? 'lesson_complete' : 'lesson_uncomplete', { activeSeconds: live.lessonId === lessonId ? live.seconds : undefined })
  }, [lessonId, done])

  return { markMediaPlaying }
}
