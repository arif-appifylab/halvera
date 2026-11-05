import { useCallback, useEffect, useState } from 'react'
import { cx, Icon } from '@/design-system'
import { track, getContext, markMediaPlaying, createWatchTracker, parseDuration } from '@/lib/analytics/index.js'
import MediaMenu from './MediaMenu.jsx'
import './audio-stage.css'

// The audio player for audio lessons, audio parts of multi-part lessons and audio files in the asset
// and media libraries: a full-width stage with the artwork, title, length, a timeline that fills the
// width, play, skip 15 seconds back and forward and playback speed (0.75–2×). The design system's
// AudioPlayer is a compact card (play and a static bar) sized by its content, so it sat narrow and
// start-aligned inside the lesson's wide figure; this one is sized by its container.
//
// Plays a real <audio> when there's a `src`; without one (the theme preview has no audio files) a
// simulated playhead moves in real time, so the controls and analytics behave the same.
//
// Analytics through track(): audio_play, audio_pause, audio_progress (every 10 s of listening),
// audio_ended, each with position, duration, rate, segment (played since the last report),
// watchedSeconds and watchedPercent (de-duplicated, src/lib/analytics/watch.js), plus audio_rate
// { from, rate, position }. The lesson ids are taken when playback starts, as the analytics hook
// for audio does. markMediaPlaying() is on while it plays.
//
// Props: title, subtitle, duration ("05:00" or seconds), src, cover (image URL), eyebrow ("Audio"),
// compact (no artwork, for inline samples), resumeKey (remembers the position for this visit),
// meta (added to every event), className.

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2]
const PROGRESS_EVERY = 10
const TICK = 250
const positions = new Map()

const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible'
const ids = (c) => ({ courseSlug: c.courseSlug, lessonId: c.lessonId, lessonType: c.lessonType, sessionId: c.sessionId })
const rateLabel = (r) => (r === 1 ? 'Normal' : `${r}×`)

function clock(total) {
  const s = Math.max(0, Math.round(total || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

function createEngine({ duration, position, resumeKey }) {
  const key = `audio-stage:${resumeKey || Math.random().toString(36).slice(2)}`
  const s = {
    playing: false, position, duration: duration || 0, rate: 1,
    el: null, timer: 0, seg: position, since: 0, ctx: {}, meta: {}, listener: null,
    watch: createWatchTracker(duration || null),
  }
  const notify = () => s.listener?.({ playing: s.playing, position: s.position, duration: s.duration, rate: s.rate })
  const remember = () => { if (resumeKey) positions.set(resumeKey, s.position) }
  const report = (type, extra) => {
    const pos = Math.round(s.position)
    track(type, {
      ...ids(s.ctx), ...s.meta,
      position: pos, duration: Math.round(s.duration) || undefined, rate: s.rate,
      segment: pos > Math.round(s.seg) ? [Math.round(s.seg), pos] : undefined,
      watchedSeconds: Math.round(s.watch.watched()), watchedPercent: s.watch.percent() ?? undefined,
      ...extra,
    })
    s.seg = s.position
    s.since = 0
  }
  const stopClock = () => { clearInterval(s.timer); s.timer = 0 }
  const halt = () => {
    s.playing = false
    stopClock()
    s.watch.stop()
    markMediaPlaying(false, key)
  }

  const engine = {
    listen(fn) { s.listener = fn; notify(); return () => { s.listener = null } },
    setMeta(meta) { s.meta = meta || {} },
    play() {
      if (s.playing) return
      if (s.duration && s.position >= s.duration - 0.5) s.position = 0
      s.ctx = getContext()
      s.playing = true
      s.seg = s.position
      s.since = 0
      s.watch.at(s.position)
      markMediaPlaying(true, key)
      report('audio_play', { segment: undefined })
      if (s.el) {
        s.el.playbackRate = s.rate
        if (Math.abs(s.el.currentTime - s.position) > 0.5) s.el.currentTime = s.position
        s.el.play().catch(() => engine.pause())
      } else {
        s.timer = setInterval(() => { if (visible()) engine.moved(s.position + (TICK / 1000) * s.rate) }, TICK)
      }
      notify()
    },
    pause() {
      if (!s.playing) return
      halt()
      s.el?.pause()
      remember()
      report('audio_pause')
      notify()
    },
    toggle() { if (s.playing) engine.pause(); else engine.play() },
    moved(next) {
      if (!s.playing) return
      const step = next - s.position
      s.position = s.duration ? Math.min(next, s.duration) : next
      s.watch.at(s.position)
      if (step > 0) s.since += step / s.rate
      if (s.since >= PROGRESS_EVERY) { remember(); report('audio_progress') }
      if (s.duration && s.position >= s.duration) { engine.end(); return }
      notify()
    },
    end() {
      if (!s.playing) return
      if (s.duration) s.position = s.duration
      halt()
      if (resumeKey) positions.delete(resumeKey)
      report('audio_ended')
      notify()
    },
    seek(to) {
      const max = s.duration ? s.duration - 0.5 : Infinity
      const next = Math.max(0, Math.min(max, to))
      if (s.playing) { report('audio_progress'); s.watch.stop() }
      s.position = next
      s.seg = next
      if (s.playing) s.watch.at(next)
      if (s.el) s.el.currentTime = next
      remember()
      notify()
    },
    skip(delta) { engine.seek(s.position + delta) },
    setRate(rate) {
      if (!Number.isFinite(rate) || rate === s.rate) return
      const from = s.rate
      s.rate = rate
      if (s.el) s.el.playbackRate = rate
      track('audio_rate', { ...ids(s.ctx), ...s.meta, from, rate, position: Math.round(s.position) })
      notify()
    },
    // The real <audio>, when there is a source (a ref callback; returns its cleanup).
    attach(el) {
      if (!el) return undefined
      s.el = el
      const onMeta = () => {
        if (Number.isFinite(el.duration) && el.duration > 0) { s.duration = el.duration; s.watch.setDuration(el.duration); notify() }
        if (s.position > 0 && s.position < el.duration - 1) el.currentTime = s.position
      }
      const onTime = () => engine.moved(el.currentTime)
      const onPause = () => { if (!el.ended) engine.pause() }
      const onEnded = () => { engine.moved(s.duration); engine.end() }
      el.addEventListener('loadedmetadata', onMeta)
      el.addEventListener('timeupdate', onTime)
      el.addEventListener('pause', onPause)
      el.addEventListener('ended', onEnded)
      return () => {
        el.removeEventListener('loadedmetadata', onMeta)
        el.removeEventListener('timeupdate', onTime)
        el.removeEventListener('pause', onPause)
        el.removeEventListener('ended', onEnded)
        if (s.el === el) s.el = null
      }
    },
    // Leaving the page pauses (and reports) whatever was playing.
    leave() {
      if (s.playing) { halt(); s.el?.pause(); remember(); report('audio_pause') }
    },
  }
  return engine
}

// Skip back / forward 15 seconds, on the design system's 24px, 1.75px stroke grid.
function Skip15({ forward = false }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <g transform={forward ? 'matrix(-1 0 0 1 24 0)' : undefined}>
        <path d="M4 12a8 8 0 1 0 2.4-5.7" />
        <path d="M4 3.5v3.2h3.2" />
      </g>
      <text x="12" y="15.4" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="currentColor" stroke="none">15</text>
    </svg>
  )
}

export default function AudioStage({
  title, subtitle, duration, src, cover, eyebrow = 'Audio', compact = false, resumeKey, meta, className,
}) {
  const total = parseDuration(duration) || 0
  const [engine] = useState(() => createEngine({ duration: total, position: (resumeKey && positions.get(resumeKey)) || 0, resumeKey }))
  const [ui, setUi] = useState({ playing: false, position: 0, duration: total, rate: 1 })
  const attach = useCallback((el) => engine.attach(el), [engine])
  useEffect(() => engine.listen(setUi), [engine])
  useEffect(() => () => engine.leave(), [engine])
  const metaKey = JSON.stringify({ title, ...meta })
  useEffect(() => { engine.setMeta(JSON.parse(metaKey)) }, [engine, metaKey])

  const length = ui.duration || total
  const pct = length ? Math.min(100, (ui.position / length) * 100) : 0
  const name = title || 'Audio'

  return (
    <div className={cx('as', compact && 'is-compact', className)}>
      <div className="as-inner" role="group" aria-label={`Audio player: ${name}`}>
        {!compact && (
          <div className="as-art">
            {cover
              ? <img className="as-cover" src={cover} alt="" decoding="async" />
              : <span className="as-cover as-cover-ph"><Icon name="headphones" size={32} /></span>}
          </div>
        )}

        <div className="as-head">
          <p className="as-eyebrow">
            <Icon name="headphones" size={16} />
            <span>{eyebrow}</span>
            {length > 0 && <><span aria-hidden="true">·</span><span>{clock(length)}</span></>}
          </p>
          <p className="as-title">{title}</p>
          {subtitle && <p className="as-sub">{subtitle}</p>}
        </div>

        <div className="as-progress" dir="ltr">
          <span className="as-time">{clock(ui.position)}</span>
          <input
            type="range"
            className="as-range"
            min={0}
            max={Math.max(1, Math.round(length))}
            step={1}
            value={Math.round(ui.position)}
            onChange={(e) => engine.seek(Number(e.target.value))}
            aria-label="Position"
            aria-valuetext={`${clock(ui.position)} of ${clock(length)}`}
            style={{ '--as-fill': `${pct}%` }}
          />
          <span className="as-time is-end"><span className="sg-sr">Time left </span>−{clock(Math.max(0, length - ui.position))}</span>
        </div>

        <div className="as-controls">
          <div className="as-transport" dir="ltr">
            <button type="button" className="as-skip" onClick={() => engine.skip(-15)} aria-label="Back 15 seconds">
              <Skip15 />
            </button>
            <button type="button" className={cx('as-play', ui.playing && 'is-playing')} onClick={() => engine.toggle()} aria-label={ui.playing ? `Pause ${name}` : `Play ${name}`}>
              <Icon name={ui.playing ? 'pause' : 'play'} size={compact ? 22 : 26} />
            </button>
            <button type="button" className="as-skip" onClick={() => engine.skip(15)} aria-label="Forward 15 seconds">
              <Skip15 forward />
            </button>
          </div>
          <MediaMenu
            className="as-speed"
            label="Playback speed"
            text={`${ui.rate}×`}
            value={String(ui.rate)}
            options={RATES.map((r) => ({ value: String(r), label: rateLabel(r) }))}
            onChange={(v) => engine.setRate(Number(v))}
            placement="top"
          />
        </div>

        {src && <audio ref={attach} src={src} preload="metadata" />}
      </div>
    </div>
  )
}
