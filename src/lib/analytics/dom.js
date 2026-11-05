// Small hooks the lesson renderers use to report type-specific signals. Each one listens from
// outside the design system (on a wrapping element), so design-system components stay untouched.
// Events sent from a cleanup carry the ids captured at mount: on a lesson change the next
// lesson's context is already set when the previous renderer unmounts.

import { useEffect } from 'react'
import { track, getContext, markMediaPlaying } from './core.js'
import { createWatchTracker } from './watch.js'
import { isActiveNow, HEARTBEAT_MS } from './useLessonAnalytics.js'

const ids = (ctx) => ({ courseSlug: ctx.courseSlug, lessonId: ctx.lessonId, lessonType: ctx.lessonType, sessionId: ctx.sessionId })
const visible = () => document.visibilityState === 'visible'

// Text: read_progress { percent: 25 | 50 | 75 | 100 } once each per visit, from how much of the
// element has been inside the viewport. `fits: true` when it fit on one screen from the start
// (then time alone completes a reading lesson).
export function useReadProgress(ref, { thresholds = [25, 50, 75, 100], enabled = true } = {}) {
  const marks = thresholds.join(',')
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return undefined
    const sent = new Set()
    let first = true
    let fits = false
    let raf = 0

    const measure = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      if (!r.height) return
      const vh = window.innerHeight || document.documentElement.clientHeight
      if (first) { fits = r.top >= 0 && r.bottom <= vh; first = false }
      const pct = Math.round(Math.min(1, Math.max(0, (vh - r.top) / r.height)) * 100)
      for (const t of marks.split(',').map(Number)) {
        if (pct >= t && !sent.has(t)) {
          sent.add(t)
          track('read_progress', { percent: t, dedupeKey: `read-${t}`, fits: fits || undefined })
        }
      }
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure) }
    raf = requestAnimationFrame(measure)
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onScroll)
    }
  }, [ref, enabled, marks])
}

// Audio: audio_play / audio_pause / audio_progress (every 10 s of listening) / audio_ended, each
// with position, duration, the segment played since the last report and the de-duplicated
// watchedSeconds / watchedPercent. Works with a real <audio> inside `ref` (media events), or, when
// there's no source (the theme preview), follows the play button and simulates the playhead.
export function useAudioAnalytics(ref, { durationSeconds = null, progressEvery = 10 } = {}) {
  useEffect(() => {
    const root = ref.current
    if (!root) return undefined
    const ctx = getContext()
    const key = `audio-${ctx.sessionId || Math.random().toString(36).slice(2)}`
    const watch = createWatchTracker(durationSeconds)
    let duration = durationSeconds
    let playing = false
    let segFrom = 0
    let pos = 0
    let sim = null
    let ignoreClick = false

    const numbers = () => ({ position: Math.round(pos), duration: duration || undefined, watchedSeconds: watch.watched(), watchedPercent: watch.percent() ?? undefined })
    const segment = () => (pos > segFrom ? [Math.round(segFrom), Math.round(pos)] : undefined)
    const report = (type, extra = {}) => {
      track(type, { ...ids(ctx), ...numbers(), segment: segment(), ...extra })
      segFrom = pos
    }

    const start = (at) => {
      if (playing) return
      playing = true
      pos = at
      segFrom = at
      watch.at(at)
      markMediaPlaying(true, key)
      track('audio_play', { ...ids(ctx), ...numbers() })
    }
    const moved = (at) => {
      if (!playing) return
      if (at < pos || at - pos > 3) { report('audio_progress'); watch.stop(); segFrom = at }
      pos = at
      watch.at(at)
      if (pos - segFrom >= progressEvery) report('audio_progress')
    }
    const stop = (type) => {
      if (!playing) return
      playing = false
      watch.stop()
      markMediaPlaying(false, key)
      report(type)
    }

    // Real audio element.
    const audio = () => root.querySelector('audio')
    const onMedia = (e) => {
      const a = e.target
      if (!(a instanceof HTMLAudioElement)) return
      if (Number.isFinite(a.duration) && a.duration > 0) { duration = a.duration; watch.setDuration(a.duration) }
      if (e.type === 'play') start(a.currentTime)
      else if (e.type === 'timeupdate') moved(a.currentTime)
      else if (e.type === 'pause') { moved(a.currentTime); stop('audio_pause') }
      else if (e.type === 'ended') { moved(a.currentTime); stop('audio_ended') }
    }
    const mediaTypes = ['play', 'timeupdate', 'pause', 'ended']
    mediaTypes.forEach((t) => root.addEventListener(t, onMedia, true))

    // No source: follow the play button and move a simulated playhead in real time.
    const onClick = (e) => {
      if (ignoreClick || audio()) return
      const btn = e.target.closest?.('button')
      if (!btn || !root.contains(btn)) return
      if (!playing) {
        start(pos >= (duration || Infinity) ? 0 : pos)
        sim = setInterval(() => {
          if (!visible()) return
          const next = Math.min(pos + 1, duration || Infinity)
          moved(next)
          if (duration && next >= duration) {
            clearInterval(sim)
            stop('audio_ended')
            ignoreClick = true
            btn.click() // flip the player's own button back to Play
            ignoreClick = false
          }
        }, 1000)
      } else {
        clearInterval(sim)
        stop('audio_pause')
      }
    }
    root.addEventListener('click', onClick, true)

    return () => {
      clearInterval(sim)
      stop('audio_pause')
      mediaTypes.forEach((t) => root.removeEventListener(t, onMedia, true))
      root.removeEventListener('click', onClick, true)
    }
  }, [ref, durationSeconds, progressEvery])
}

// Time engaged with a region (an embedded tool): counts while the tab is visible, the pointer or
// focus is inside the region (or an iframe in it has focus) and the learner is active. Reports
// `type` { seconds, totalSeconds } every 15 s and on unmount.
export function useFocusTime(ref, { type = 'embed_active_time', data } = {}) {
  const dataKey = JSON.stringify(data || {})
  useEffect(() => {
    const root = ref.current
    if (!root) return undefined
    const ctx = getContext()
    let inside = false
    let ms = 0
    let unsent = 0
    let last = Date.now()
    const extra = JSON.parse(dataKey)

    const engaged = () => inside || root.contains(document.activeElement)
    const tick = () => {
      const now = Date.now()
      const dt = Math.min(now - last, 2000)
      last = now
      if (engaged() && isActiveNow(now)) { ms += dt; unsent += dt }
    }
    const report = (final) => {
      tick()
      const seconds = final ? Math.round(unsent / 1000) : Math.floor(unsent / 1000)
      if (seconds < 1) return
      unsent = Math.max(0, unsent - seconds * 1000)
      track(type, { ...ids(ctx), ...extra, seconds, totalSeconds: Math.round(ms / 1000) })
    }
    const enter = () => { inside = true }
    const leave = () => { inside = false }
    root.addEventListener('pointerenter', enter)
    root.addEventListener('pointerleave', leave)
    const tickId = setInterval(tick, 1000)
    const beatId = setInterval(() => report(false), HEARTBEAT_MS)
    return () => {
      report(true)
      clearInterval(tickId)
      clearInterval(beatId)
      root.removeEventListener('pointerenter', enter)
      root.removeEventListener('pointerleave', leave)
    }
  }, [ref, type, dataKey])
}
