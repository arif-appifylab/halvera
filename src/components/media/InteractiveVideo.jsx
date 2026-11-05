import { Suspense, lazy, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  BufferingIndicator, CaptionsButton, Container, Controls, FullscreenButton, Gesture, Hotkey, Menu, MuteButton,
  PiPButton, PlayButton, Poster, StatusAnnouncer, Time, TimeSlider, Tooltip, VolumePopover, VolumeSlider,
  useAudioTrackOptions, useCaptionsOptions, useHotkey, useQualityOptions,
} from '@videojs/react'
import { Video, VideoPlayer as Player, usePlayer } from '@videojs/react/video'
import {
  CaptionsOffIcon, CaptionsOnIcon, CheckIcon, ChevronIcon, FullscreenEnterIcon, FullscreenExitIcon, GearIcon,
  PauseIcon, PipEnterIcon, PipExitIcon, PlayIcon, RestartIcon, SpinnerIcon, VolumeHighIcon, VolumeLowIcon,
  VolumeOffIcon,
} from '@videojs/react/icons'
import { cx, Badge, Button, Icon, IconButton, RadioCard, TextField } from '@/design-system'
import { track, markMediaPlaying, createWatchTracker } from '@/lib/analytics/index.js'
import VideoPlayer from '@/components/media/VideoPlayer.jsx'
import { pickTrack, useAudioTrackMemory } from '@/components/media/audio-tracks.js'
import './interactive-video.css'

// HLS (production Bunny streams) plays through hls.js via @videojs/hlsjs-video, loaded only for an HLS
// source; the preview MP4 plays in a plain <video>.
const HlsJsVideo = lazy(() => import('@videojs/react/media/hlsjs-video').then((m) => ({ default: m.HlsJsVideo })))

// Interactive video lessons: our own player (Video.js 10, @videojs/react) so the video can pause for
// questions, reflections and resource cards, with the overlays inside the player's Container (they stay
// visible in fullscreen, because fullscreen is applied to the Container). The controls are our own
// composition of Video.js UI components (not a packaged skin), so the timeline can carry the cue markers.
// Standard video lessons keep Bunny's iframe player (VideoPlayer.jsx). Why, and the cue schema:
// docs/video-player.md "Interactive video".
//
// Sources:
//   { provider: 'file', src, poster }                          a plain MP4 (the theme preview's clip)
//   { provider: 'bunny', pullZone, videoId, hls?, poster? }      Bunny Stream's HLS playlist, non-DRM:
//       https://{pullZone}.b-cdn.net/{videoId}/playlist.m3u8 (or `hls`, a URL the backend signed)
//   DRM on (`drm: true`) needs MediaCage Enterprise with our own Widevine/FairPlay licence handling,
//   which isn't built: those sources fall back to VideoPlayer, without the interactions.
//
// Props: source, title, cues (from src/data/learn.js), captions [{ src, srclang, label, default }],
// chapters (WebVTT chapters URL), duration (seconds, a hint until the media loads), resumeKey
// ("course/lesson": position and answers are kept for this visit), onRuleMet() (called once when
// ≥ 90 % is watched and every required question is answered), onEvent(event).
//
// Analytics through track(): video_play / pause / seek / progress / ended / rate (as VideoPlayer, with
// the watched intervals from createWatchTracker), plus ivideo_cue_shown, ivideo_answer,
// ivideo_reflection (length only) and ivideo_card_click. See docs/lesson-analytics.md.

const PROGRESS_EVERY = 10 // seconds of playback between video_progress events
const MAX_STEP = 2.5 // a position step longer than this (per 1× speed) is a seek, not playback
const LOCK_SLACK = 0.75 // seconds past an unanswered required question before playback is pulled back
const NOTE_SECONDS = 8 // how long a chapter note stays up
const RULE_PERCENT = 90
const SEEK_STEP = 5 // seconds, arrow keys and J/L
const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] // our own list; Video.js's speed state has a fixed one

const KIND = {
  question: { label: 'Question', icon: 'check-circle' },
  reflection: { label: 'Reflection', icon: 'heart' },
  card: { label: 'Resource', icon: 'book' },
  'chapter-note': { label: 'Note', icon: 'info' },
}

const STATUS = {
  answered: { label: 'Answered', icon: 'check-circle' },
  saved: { label: 'Saved', icon: 'check-circle' },
  skipped: { label: 'Skipped', icon: 'arrow-right' },
  opened: { label: 'Opened', icon: 'check' },
  continued: { label: 'Seen', icon: 'check' },
  seen: { label: 'Seen', icon: 'check' },
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Answers, statuses, reflections and the last position per resumeKey, in memory for this visit.
// A backend would persist them with the lesson progress.
const memory = new Map()
function recall(key = '') {
  if (!memory.has(key)) memory.set(key, { position: 0, answers: {}, done: {}, reflections: {} })
  return memory.get(key)
}
function keep(key = '', patch) { Object.assign(recall(key), patch) }

const round = (n) => Math.round((Number(n) || 0) * 10) / 10
const clock = (s) => {
  const t = Math.max(0, Math.floor(Number(s) || 0))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}
const noop = () => {}
const rateLabel = (r) => (r === 1 ? 'Normal' : `${r}×`)

// Player actions throw or reject until the player has attached to its media; nothing to do then.
function run(action) {
  try {
    const result = action()
    if (result && typeof result.catch === 'function') result.catch(noop)
  } catch {
    // not attached yet
  }
}

function mediaFor(source) {
  if (!source || source.drm) return null
  if (source.provider === 'bunny') {
    const base = source.pullZone && source.videoId ? `https://${source.pullZone}.b-cdn.net/${encodeURIComponent(source.videoId)}` : null
    const hls = source.hls || (base && `${base}/playlist.m3u8`)
    if (!hls) return null
    return { src: hls, hls: true, poster: source.poster || (base && `${base}/thumbnail.jpg`) }
  }
  if (!source.src) return null
  return { src: source.src, hls: /\.m3u8(\?|$)/.test(source.src), poster: source.poster }
}

// Turns player callbacks into video_* events; watched time is the union of played intervals.
function createReporter(key) {
  const w = createWatchTracker()
  const s = { pos: null, duration: 0, since: 0, playing: false, rate: 1, seekFrom: null }
  const mediaKey = 'ivideo:' + (key || 'video')
  let sink = null
  const emit = (type, data) => sink?.(type, data)
  const snapshot = () => ({ position: round(s.pos), duration: round(s.duration), watched: w.watched(), watchedPercent: w.percent() ?? 0 })
  const segment = (seg) => (seg ? { segment: [round(seg[0]), round(seg[1])] } : {})

  return {
    connect(fn) { sink = fn },
    duration(d) { if (Number.isFinite(d) && d > 0) { s.duration = d; w.setDuration(d) } },
    percent: () => w.percent() ?? 0,
    play() {
      if (s.playing) return
      s.playing = true
      markMediaPlaying(true, mediaKey) // keeps the lesson's active time counting while it plays
      emit('video_play', snapshot())
    },
    pause() {
      if (!s.playing) return
      s.playing = false
      markMediaPlaying(false, mediaKey)
      const seg = w.stop()
      emit('video_pause', { ...snapshot(), ...segment(seg) })
    },
    seeking() {
      if (s.seekFrom === null) s.seekFrom = s.pos
      w.stop()
    },
    seeked(to) {
      const from = s.seekFrom ?? s.pos
      s.seekFrom = null
      if (!Number.isFinite(to)) return
      s.pos = to
      if (from !== null && Math.abs(to - from) >= 1) emit('video_seek', { from: round(from), to: round(to), duration: round(s.duration) })
    },
    time(pos) {
      if (!Number.isFinite(pos)) return
      const prev = s.pos
      s.pos = pos
      if (!s.playing || s.seekFrom !== null) return
      w.at(pos)
      const step = prev === null ? 0 : pos - prev
      if (step <= 0 || step > MAX_STEP * Math.max(1, s.rate)) return
      s.since += step
      if (s.since >= PROGRESS_EVERY) {
        s.since = 0
        emit('video_progress', snapshot())
      }
    },
    ended() {
      if (s.duration) { w.at(s.duration); s.pos = s.duration }
      s.playing = false
      markMediaPlaying(false, mediaKey)
      const seg = w.stop()
      emit('video_ended', { ...snapshot(), ...segment(seg) })
    },
    rate(next) {
      if (!Number.isFinite(next) || next <= 0 || next === s.rate) return
      const from = s.rate
      s.rate = next
      emit('video_rate', { from, rate: next, position: round(s.pos) })
    },
    leave() { if (s.playing) markMediaPlaying(false, mediaKey) },
  }
}

export default function InteractiveVideo({ source, ...props }) {
  const media = mediaFor(source)
  if (!source) return null
  // DRM or an unknown source: the standard player, without in-video interactions.
  if (!media) return <VideoPlayer source={source} title={props.title} resumeKey={props.resumeKey} className={props.className} />
  return <Interactive source={source} media={media} {...props} />
}

// Player renders no element: it holds the player state for everything inside it (the Container with the
// video, controls and cue panels, and the "In this video" list under it).
function Interactive({ media, title, ...props }) {
  return (
    <Player title={title} poster={media.poster}>
      <InteractiveBody media={media} title={title} {...props} />
    </Player>
  )
}

function InteractiveBody({
  source, media, title, cues: cueList, captions = [], chapters, duration: durationHint = 0,
  resumeKey, onRuleMet, onEvent, className,
}) {
  const cues = useMemo(
    () => (cueList || []).filter((c) => c && c.id && Number.isFinite(c.at) && KIND[c.type]).sort((a, b) => a.at - b.at),
    [cueList],
  )
  const [answers, setAnswers] = useState(() => ({ ...recall(resumeKey).answers }))
  const [done, setDone] = useState(() => ({ ...recall(resumeKey).done }))
  const [active, setActive] = useState(null) // { cue, review, trap }
  const [note, setNote] = useState(null)
  const [percent, setPercent] = useState(0)
  const [announce, setAnnounce] = useState('')
  const [report] = useState(() => createReporter(resumeKey))

  const store = usePlayer() // the player store, without subscribing: actions and current state
  const containerRef = useRef(null)
  const listRef = useRef(null)
  const activeRef = useRef(null) // the open cue, set synchronously so player callbacks never open two
  const returnFocus = useRef(null)
  const lastTime = useRef(null)
  const seeking = useRef(false)
  const rate = useRef(1)
  const resumed = useRef(false)
  const percentRef = useRef(0)
  const metRule = useRef(false)
  const ids = useId()

  const required = cues.filter((c) => c.type === 'question' && c.required)
  const answeredRequired = required.filter((c) => answers[c.id]).length
  const lock = required.find((c) => !answers[c.id]) || null
  const meetsRule = percent >= RULE_PERCENT && answeredRequired === required.length

  // Latest values for the player callbacks.
  const live = useRef({ cues, lock, done })
  useLayoutEffect(() => { live.current = { cues, lock, done } })

  // Analytics: every video_* event goes through track(), which adds the course and lesson context.
  useEffect(() => {
    const meta = { title, provider: source.provider, player: 'interactive', ...(source.videoId && { videoId: source.videoId }) }
    report.connect((type, data) => {
      const event = track(type, { ...meta, ...data })
      onEvent?.(event)
    })
  })
  const emit = (type, data) => {
    const event = track(type, { title, ...data })
    onEvent?.(event)
  }

  useEffect(() => { keep(resumeKey, { answers, done }) }, [resumeKey, answers, done])
  useEffect(() => () => {
    report.leave()
    if (lastTime.current !== null) keep(resumeKey, { position: lastTime.current })
  }, [report, resumeKey])

  useEffect(() => {
    if (!meetsRule || metRule.current) return
    metRule.current = true
    onRuleMet?.()
  }, [meetsRule, onRuleMet])

  useEffect(() => {
    if (!note) return undefined
    const t = setTimeout(() => setNote(null), NOTE_SECONDS * 1000)
    return () => clearTimeout(t)
  }, [note])

  const markDone = (id, status) => setDone((d) => ({ ...d, [id]: status }))
  const seekTo = (t) => run(() => store.seek(t))

  /* ---------- Opening and closing cues ---------- */

  function showCue(cue, { review = false, trigger = 'playback' } = {}) {
    const el = containerRef.current
    emit('ivideo_cue_shown', { cueId: cue.id, cueType: cue.type, at: cue.at, required: !!cue.required, review, trigger })
    if (cue.type === 'chapter-note') {
      setNote(cue)
      markDone(cue.id, 'seen')
      setAnnounce(`${cue.title}. ${cue.body || ''}`)
      return
    }
    activeRef.current = cue
    run(() => store.pause())
    // Picture in picture and the iPhone's native video fullscreen can't show our overlay: leave them.
    if (store.state.isPictureInPicture) run(() => store.exitPictureInPicture())
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement
    if (store.state.isFullscreen && !(fsEl && el?.contains(fsEl))) run(() => store.exitFullscreen())
    // Move focus into the panel only when the student is using the player (or nothing in particular),
    // never away from something they're doing elsewhere on the page; announce it instead.
    const ae = document.activeElement
    const trap = !ae || ae === document.body || !!el?.contains(ae) || !!listRef.current?.contains(ae)
    returnFocus.current = trap ? ae : null
    setNote(null)
    setActive({ cue, review, trap })
    setAnnounce(trap ? '' : `The video paused at ${clock(cue.at)} for a ${KIND[cue.type].label.toLowerCase()}: ${cue.title}.`)
  }

  function closeCue(status, { play = true } = {}) {
    const cue = activeRef.current
    if (!cue) return
    activeRef.current = null
    if (status) markDone(cue.id, status)
    const trapped = active?.trap
    setActive(null)
    // From the cue's own time, so a cue right after this one still stops the video.
    lastTime.current = cue.at
    const back = returnFocus.current
    returnFocus.current = null
    if (trapped) {
      requestAnimationFrame(() => {
        const target = back && back !== document.body && back.isConnected ? back : containerRef.current
        target?.focus?.({ preventScroll: true })
      })
    }
    if (play) run(() => store.play())
  }

  // Seek to a cue (from the list) and open it; later cues stay locked behind a required question.
  // An open panel gives way, unless it is a required question still waiting for an answer.
  function goTo(cue, { again = false } = {}) {
    const open = activeRef.current
    if (open && open.type === 'question' && open.required && !answers[open.id]) {
      setAnnounce(`Answer “${open.title}” first.`)
      return
    }
    const { lock: l } = live.current
    if (!again && l && cue.at > l.at) return
    if (open) { activeRef.current = null; setActive(null) }
    if (again) askAgain(cue)
    seekTo(cue.at)
    lastTime.current = cue.at
    showCue(cue, { review: !again && !!done[cue.id] && cue.type !== 'chapter-note', trigger: 'list' })
  }

  function pullBack(cue) {
    seekTo(cue.at)
    lastTime.current = cue.at
    showCue(cue, { trigger: 'seek' })
  }

  const answer = (cue, choice) => {
    const correct = choice === cue.correct
    const attempt = (answers[cue.id]?.attempts || 0) + 1
    setAnswers((a) => ({ ...a, [cue.id]: { choice, correct, attempts: attempt } }))
    markDone(cue.id, 'answered')
    emit('ivideo_answer', { cueId: cue.id, correct, attempt, required: !!cue.required })
  }

  const askAgain = (cue) => {
    setAnswers((a) => { const n = { ...a }; delete n[cue.id]; return n })
    setDone((d) => { const n = { ...d }; delete n[cue.id]; return n })
  }

  const saveReflection = (cue, text) => {
    keep(resumeKey, { reflections: { ...recall(resumeKey).reflections, [cue.id]: text } })
    emit('ivideo_reflection', { cueId: cue.id, length: text.length })
    closeCue('saved')
  }

  const openCard = (cue) => {
    emit('ivideo_card_click', { cueId: cue.id, href: cue.action?.href })
    markDone(cue.id, 'opened')
    keep(resumeKey, { position: cue.at })
  }

  // Escape and "Continue": the status a cue keeps when the student moves on without acting on it.
  const dismissStatus = (cue) => {
    if (done[cue.id]) return done[cue.id]
    return cue.type === 'card' ? 'continued' : 'skipped'
  }

  /* ---------- Media events (React props on the <video>; e.currentTarget is the element) ---------- */

  const onTimeUpdate = (e) => {
    const t = e.currentTarget.currentTime
    report.time(t)
    const pct = report.percent()
    if (pct !== percentRef.current) { percentRef.current = pct; setPercent(pct) }
    const prev = lastTime.current
    lastTime.current = t
    if (activeRef.current) return
    const { lock: l, cues: list, done: d } = live.current
    if (l && t > l.at + LOCK_SLACK) { pullBack(l); return }
    if (seeking.current || prev === null) return
    const step = t - prev
    if (step <= 0 || step > MAX_STEP * Math.max(1, rate.current)) return
    // Answered, saved or skipped cues don't stop the video again on a rewatch; notes always show.
    const hit = list.find((c) => c.at > prev && c.at <= t && (c.type === 'chapter-note' || !d[c.id]))
    if (hit) showCue(hit)
  }

  const onSeeking = () => {
    seeking.current = true
    report.seeking()
  }

  const onSeeked = (e) => {
    const t = e.currentTarget.currentTime
    seeking.current = false
    report.seeked(t)
    lastTime.current = t
    const { lock: l } = live.current
    if (!activeRef.current && l && t > l.at + LOCK_SLACK) pullBack(l)
  }

  const onCanPlay = (e) => {
    if (resumed.current) return
    resumed.current = true
    const v = e.currentTarget
    const start = recall(resumeKey).position
    if (start > 1 && (!v.duration || start < v.duration - 1)) {
      v.currentTime = start
      lastTime.current = start
    }
  }

  const onPlay = () => {
    // Nothing plays behind an open question (media keys, picture in picture).
    if (activeRef.current) { run(() => store.pause()); return }
    report.play()
  }

  const onPause = (e) => {
    const v = e.currentTarget
    keep(resumeKey, { position: v.currentTime })
    if (v.duration && v.currentTime >= v.duration - 0.3) return // the end: video_ended follows
    report.pause()
  }

  const onEnded = () => {
    report.ended()
    keep(resumeKey, { position: 0 }) // finished: start from the top next time
  }

  const mediaEvents = {
    onCanPlay, onPlay, onPause, onEnded, onTimeUpdate, onSeeking, onSeeked,
    onRateChange: (e) => { rate.current = e.currentTarget.playbackRate; report.rate(e.currentTarget.playbackRate) },
    onDurationChange: (e) => report.duration(e.currentTarget.duration),
  }

  const activeCue = active?.cue
  const busy = !!activeCue // a panel is open: player shortcuts and gestures are off

  return (
    <div className={cx('iv', className)}>
      <Container
        ref={containerRef}
        className={cx('iv-player', activeCue && 'has-cue')}
        aria-label={title ? `Video: ${title}` : undefined}
      >
        <Media media={media} captions={captions} chapters={chapters} events={mediaEvents} />
        <Poster.Root className="iv-poster">
          <Poster.Image className="iv-poster-img" />
        </Poster.Root>
        <BufferingIndicator className="iv-buffering">
          <SpinnerIcon className="iv-spinner" aria-hidden="true" />
        </BufferingIndicator>
        <PlayButton className="iv-big-play">
          <PlayIcon aria-hidden="true" />
        </PlayButton>

        <PlayerControls
          cues={cues}
          done={done}
          answers={answers}
          lock={lock}
          durationHint={durationHint}
          onChapter={(c) => seekTo(c.startTime)}
        />

        <PlayerKeys disabled={busy} />
        <Gesture disabled={busy} type="tap" action="togglePaused" pointer="mouse" region="center" />
        <Gesture disabled={busy} type="tap" action="toggleControls" pointer="touch" />
        <Gesture disabled={busy} type="doubletap" action="seekStep" value={-10} region="left" />
        <Gesture disabled={busy} type="doubletap" action="toggleFullscreen" region="center" />
        <Gesture disabled={busy} type="doubletap" action="seekStep" value={10} region="right" />
        <StatusAnnouncer className="sg-sr" />

        {note && !activeCue && <CueNote cue={note} onClose={() => setNote(null)} />}

        {activeCue && (
          <CueDialog
            key={`${activeCue.id}:${active.review ? 'review' : 'ask'}`}
            cue={activeCue}
            review={active.review}
            trap={active.trap}
            previous={answers[activeCue.id]}
            reflection={recall(resumeKey).reflections[activeCue.id]}
            onAnswer={(choice) => answer(activeCue, choice)}
            onAskAgain={() => { askAgain(activeCue); setActive({ ...active, review: false }) }}
            onSaveReflection={(text) => saveReflection(activeCue, text)}
            onOpenCard={() => openCard(activeCue)}
            onContinue={() => closeCue(dismissStatus(activeCue))}
          />
        )}

        <p className="sg-sr" aria-live="polite">{announce}</p>
      </Container>

      <CueList
        listRef={listRef}
        headingId={`${ids}-list`}
        cues={cues}
        done={done}
        answers={answers}
        lock={lock}
        percent={percent}
        required={required.length}
        answeredRequired={answeredRequired}
        meetsRule={meetsRule}
        onGo={goTo}
        onAskAgain={(cue) => goTo(cue, { again: true })}
      />
    </div>
  )
}

/* ---------- The media: a plain <video> for files, hls.js for HLS ---------- */

function Media({ media, captions, chapters, events }) {
  const tracks = (
    <>
      {captions.map((c) => (
        <track key={c.src} kind="captions" src={c.src} srcLang={c.srclang} label={c.label} default={c.default} />
      ))}
      {chapters && <track kind="chapters" src={chapters} srcLang="en" label="Chapters" default />}
    </>
  )
  if (media.hls) {
    return (
      <Suspense fallback={null}>
        <HlsJsVideo
          className="iv-media"
          source={{ src: media.src, type: 'application/vnd.apple.mpegurl' }}
          playsInline
          preload="metadata"
          {...events}
        >
          {tracks}
        </HlsJsVideo>
      </Suspense>
    )
  }
  return (
    <Video className="iv-media" src={media.src} playsInline preload="metadata" {...events}>
      {tracks}
    </Video>
  )
}

/* ---------- Keyboard shortcuts (on the player; off while a panel is open) ---------- */

function PlayerKeys({ disabled }) {
  const store = usePlayer()
  // Speed keys step through our own list of rates.
  const stepRate = (dir) => {
    const now = store.state.playbackRate
    const near = RATES.reduce((best, r, i) => (Math.abs(r - now) < Math.abs(RATES[best] - now) ? i : best), 0)
    const next = RATES[Math.min(RATES.length - 1, Math.max(0, near + dir))]
    if (next !== now) run(() => store.setPlaybackRate(next))
  }
  useHotkey({ keys: '>', action: 'speedUp', disabled, onActivate: () => stepRate(1) })
  useHotkey({ keys: '<', action: 'speedDown', disabled, onActivate: () => stepRate(-1) })
  return (
    <>
      <Hotkey disabled={disabled} keys="Space" action="togglePaused" />
      <Hotkey disabled={disabled} keys="k" action="togglePaused" />
      <Hotkey disabled={disabled} keys="m" action="toggleMuted" />
      <Hotkey disabled={disabled} keys="f" action="toggleFullscreen" />
      <Hotkey disabled={disabled} keys="c" action="toggleSubtitles" />
      <Hotkey disabled={disabled} keys="i" action="togglePictureInPicture" />
      <Hotkey disabled={disabled} keys="ArrowRight" action="seekStep" value={SEEK_STEP} />
      <Hotkey disabled={disabled} keys="ArrowLeft" action="seekStep" value={-SEEK_STEP} />
      <Hotkey disabled={disabled} keys="l" action="seekStep" value={SEEK_STEP} />
      <Hotkey disabled={disabled} keys="j" action="seekStep" value={-SEEK_STEP} />
      <Hotkey disabled={disabled} keys="ArrowUp" action="volumeStep" />
      <Hotkey disabled={disabled} keys="ArrowDown" action="volumeStep" />
      <Hotkey disabled={disabled} keys="0-9" action="seekToPercent" />
      <Hotkey disabled={disabled} keys="Home" action="seekToPercent" value={0} />
      <Hotkey disabled={disabled} keys="End" action="seekToPercent" value={100} />
    </>
  )
}

/* ---------- Controls: our composition of Video.js components, themed in interactive-video.css ---------- */

// A tooltip over a control. Media buttons bring their own (state-aware) label; menus pass one.
function Tip({ children, label }) {
  return (
    <Tooltip.Root side="top">
      <Tooltip.Trigger render={children} />
      <Tooltip.Popup className="iv-pop iv-tip" data-theme="dark">
        {label ?? <Tooltip.Label />}
        {!label && <Tooltip.Shortcut className="iv-tip-key" />}
      </Tooltip.Popup>
    </Tooltip.Root>
  )
}

function PlayerControls({ cues, done, answers, lock, durationHint, onChapter }) {
  return (
    <Controls.Root>
      <Controls.Backdrop className="iv-backdrop" />
      {/* The controls sit on the video, so they always use the dark palette. */}
      <Controls.Content className="iv-controls" data-theme="dark">
        <Tooltip.Provider>
          <CueSlider cues={cues} done={done} answers={answers} lock={lock} durationHint={durationHint} />
          <Controls.Group className="iv-bar" aria-label="Video controls">
            <Tip>
              <PlayButton className="iv-btn iv-play">
                <RestartIcon className="iv-i-restart" aria-hidden="true" />
                <PlayIcon className="iv-i-play" aria-hidden="true" />
                <PauseIcon className="iv-i-pause" aria-hidden="true" />
              </PlayButton>
            </Tip>
            <VolumePopover.Root openOnHover delay={200} closeDelay={100} side="top">
              <VolumePopover.Trigger
                render={(
                  <MuteButton className="iv-btn iv-mute">
                    <VolumeOffIcon className="iv-i-off" aria-hidden="true" />
                    <VolumeLowIcon className="iv-i-low" aria-hidden="true" />
                    <VolumeHighIcon className="iv-i-high" aria-hidden="true" />
                  </MuteButton>
                )}
              />
              <VolumePopover.Popup className="iv-pop iv-volume" data-theme="dark">
                <VolumeSlider.Root className="iv-vslider" orientation="vertical">
                  <VolumeSlider.Track className="iv-vtrack">
                    <VolumeSlider.Fill className="iv-vfill" />
                  </VolumeSlider.Track>
                  <VolumeSlider.Thumb className="iv-vthumb" />
                </VolumeSlider.Root>
              </VolumePopover.Popup>
            </VolumePopover.Root>
            <Time.Group className="iv-time" dir="ltr">
              <Time.Value type="current" />
              <Time.Separator className="iv-time-sep" />
              <Time.Value type="duration" />
            </Time.Group>

            <span className="iv-bar-gap" />

            <ChaptersMenu lock={lock} onChapter={onChapter} />
            <Tip>
              <CaptionsButton className="iv-btn iv-captions">
                <CaptionsOffIcon className="iv-i-cc-off" aria-hidden="true" />
                <CaptionsOnIcon className="iv-i-cc-on" aria-hidden="true" />
              </CaptionsButton>
            </Tip>
            <SettingsMenu />
            <Tip>
              <PiPButton className="iv-btn iv-pip">
                <PipEnterIcon className="iv-i-pip-enter" aria-hidden="true" />
                <PipExitIcon className="iv-i-pip-exit" aria-hidden="true" />
              </PiPButton>
            </Tip>
            <Tip>
              <FullscreenButton className="iv-btn iv-fs">
                <FullscreenEnterIcon className="iv-i-fs-enter" aria-hidden="true" />
                <FullscreenExitIcon className="iv-i-fs-exit" aria-hidden="true" />
              </FullscreenButton>
            </Tip>
          </Controls.Group>
        </Tooltip.Provider>
      </Controls.Content>
    </Controls.Root>
  )
}

/* ---------- Menus: chapters, and settings (speed, quality, audio, captions) ---------- */

function MenuRadio({ value, children, disabled }) {
  return (
    <Menu.RadioItem className="iv-menu-item" value={value} disabled={disabled}>
      {children}
      <Menu.ItemIndicator forceMount className="iv-menu-check">
        <CheckIcon aria-hidden="true" />
      </Menu.ItemIndicator>
    </Menu.RadioItem>
  )
}

function Submenu({ label, hint, children }) {
  return (
    <Menu.Root>
      <Menu.Trigger className="iv-menu-item iv-menu-parent">
        <span>{label}</span>
        <span className="iv-menu-hint">
          {hint}
          <ChevronIcon className="iv-menu-chevron" aria-hidden="true" />
        </span>
      </Menu.Trigger>
      <Menu.Content className="iv-menu-content">
        <Menu.Item className="iv-menu-item iv-menu-back">
          <ChevronIcon className="iv-menu-chevron is-back" aria-hidden="true" />
          <span>{label}</span>
        </Menu.Item>
        <Menu.Separator className="iv-menu-sep" />
        {children}
      </Menu.Content>
    </Menu.Root>
  )
}

function SettingsMenu() {
  const playbackRate = usePlayer((s) => s.playbackRate)
  const setPlaybackRate = usePlayer((s) => s.setPlaybackRate)
  const quality = useQualityOptions()
  const captions = useCaptionsOptions()
  const hasQuality = quality?.state.availability === 'available'
  const hasCaptions = captions?.state.availability === 'available'
  const { audio, hasAudio, onAudio } = useAudioTracks()

  return (
    <Menu.Root side="top" align="end">
      <Tip label="Settings">
        <Menu.Trigger className="iv-btn" aria-label="Settings">
          <GearIcon aria-hidden="true" />
        </Menu.Trigger>
      </Tip>
      <Menu.Popup className="iv-pop iv-menu" data-theme="dark">
        <Menu.Content className="iv-menu-content">
          <Submenu label="Speed" hint={rateLabel(playbackRate)}>
            <Menu.RadioGroup
              className="iv-menu-group"
              value={String(playbackRate)}
              onValueChange={(v) => run(() => setPlaybackRate(Number(v)))}
              aria-label="Speed"
            >
              {RATES.map((r) => <MenuRadio key={r} value={String(r)}>{rateLabel(r)}</MenuRadio>)}
            </Menu.RadioGroup>
          </Submenu>
          {hasQuality && (
            <Submenu label="Quality" hint={quality.selectedLabel}>
              <Menu.RadioGroup className="iv-menu-group" value={quality.value} onValueChange={quality.setValue} aria-label="Quality">
                {quality.options.map((o) => <MenuRadio key={o.value} value={o.value} disabled={o.disabled}>{o.label}</MenuRadio>)}
              </Menu.RadioGroup>
            </Submenu>
          )}
          {hasAudio && (
            <Submenu label="Audio" hint={audio.selectedLabel}>
              <Menu.RadioGroup className="iv-menu-group" value={audio.value} onValueChange={onAudio} aria-label="Audio">
                {audio.options.map((o) => <MenuRadio key={o.value} value={o.value} disabled={o.disabled}>{o.label}</MenuRadio>)}
              </Menu.RadioGroup>
            </Submenu>
          )}
          {hasCaptions && (
            <Submenu label="Captions" hint={captions.selectedLabel}>
              <Menu.RadioGroup className="iv-menu-group" value={captions.value} onValueChange={captions.setValue} aria-label="Captions">
                {captions.options.map((o) => <MenuRadio key={o.value} value={o.value} disabled={o.disabled}>{o.label}</MenuRadio>)}
              </Menu.RadioGroup>
            </Submenu>
          )}
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  )
}

// Audio tracks of the stream (an HLS stream's alternate audio: dubs, audio description), from the
// player's audioTrack feature. When they arrive, the viewer's saved language (or the site language)
// is selected; a choice is remembered and reported as video_audio_track (./audio-tracks.js).
function useAudioTracks() {
  const audio = useAudioTrackOptions()
  const list = usePlayer((s) => s.audioTrackList)
  const selectAudioTrack = usePlayer((s) => s.selectAudioTrack)
  const { saved, remember } = useAudioTrackMemory()
  const applied = useRef(false)
  useEffect(() => {
    if (applied.current || !list || list.length < 2 || !selectAudioTrack) return
    applied.current = true
    const pick = pickTrack(list.map((t) => ({ ...t, lang: t.language })), saved(), { byKey: false })
    if (pick && !pick.enabled) selectAudioTrack(pick.id)
  }, [list, selectAudioTrack, saved])

  const onAudio = (value) => {
    const next = list?.find((t) => t.id === value)
    const from = list?.find((t) => t.enabled)
    audio?.setValue(value)
    if (next && next !== from) {
      remember({ ...next, lang: next.language }, value, { player: 'interactive' }, from && { lang: from.language })
    }
  }
  return { audio, hasAudio: audio?.state.availability === 'available', onAudio }
}

// Chapters from the default kind="chapters" track (Video.js reads its cues; it has no chapters menu of
// its own). Chapters past an unanswered required question are locked, like the timeline.
function ChaptersMenu({ lock, onChapter }) {
  const chapters = usePlayer((s) => s.chaptersCues) || []
  const current = usePlayer((s) => {
    const list = s.chaptersCues || []
    let at = -1
    list.forEach((c, i) => { if (s.currentTime >= c.startTime - 0.05) at = i })
    return at
  })
  if (!chapters.length) return null
  return (
    <Menu.Root side="top" align="end">
      <Tip label="Chapters">
        <Menu.Trigger className="iv-btn" aria-label="Chapters">
          <Icon name="menu" size={20} />
        </Menu.Trigger>
      </Tip>
      <Menu.Popup className="iv-pop iv-menu" data-theme="dark">
        <Menu.Content className="iv-menu-content">
          <Menu.RadioGroup
            className="iv-menu-group"
            value={String(current)}
            onValueChange={(v) => { const c = chapters[Number(v)]; if (c) onChapter(c) }}
            aria-label="Chapters"
          >
            {chapters.map((c, i) => {
              const locked = !!lock && c.startTime > lock.at + LOCK_SLACK
              return (
                <MenuRadio key={`${c.startTime}-${i}`} value={String(i)} disabled={locked}>
                  <span className="iv-menu-chapter">
                    <span>{c.text}</span>
                    <span className="iv-menu-hint" dir="ltr">
                      {locked && <Icon name="lock" size={14} />}
                      {locked && <span className="sg-sr">Locked, </span>}
                      {clock(c.startTime)}
                    </span>
                  </span>
                </MenuRadio>
              )
            })}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  )
}

/* ---------- Timeline with chapter segments and cue markers ---------- */

function CueSlider({ cues, done, answers, lock, durationHint }) {
  const loaded = usePlayer((s) => s.duration)
  const duration = loaded > 0 ? loaded : durationHint
  const at = (s) => `${Math.min(100, Math.max(0, (s / duration) * 100))}%`

  return (
    <TimeSlider.Root className="iv-slider" step={SEEK_STEP} dir="ltr">
      <TimeSlider.Chapters
        className="iv-chapters"
        renderChapter={(props) => (
          <div {...props} className="iv-chapter">
            <TimeSlider.Track className="iv-track">
              <TimeSlider.Buffer className="iv-track-buffer" />
              <TimeSlider.Fill className="iv-track-fill" />
            </TimeSlider.Track>
          </div>
        )}
      />

      {duration > 0 && (
        // Decorative: the "In this video" list below the player carries the same information.
        <div className="iv-marks" aria-hidden="true">
          {lock && <span className="iv-marks-locked" style={{ insetInlineStart: at(lock.at) }} />}
          {cues.map((c) => {
            const isLock = lock?.id === c.id
            return (
              <span
                key={c.id}
                className={cx('iv-mark', `is-${c.type}`, (answers[c.id] || done[c.id]) && 'is-done', isLock && 'is-lock')}
                style={{ insetInlineStart: at(c.at) }}
              >
                {isLock && <Icon name="lock" size={10} />}
              </span>
            )
          })}
        </div>
      )}

      <TimeSlider.Thumb className="iv-thumb" />
      <TimeSlider.Preview className="iv-preview" overflow="clamp">
        <TimeSlider.ChapterTitle className="iv-preview-title" />
        <TimeSlider.Value className="iv-preview-time" type="pointer" />
      </TimeSlider.Preview>
    </TimeSlider.Root>
  )
}

/* ---------- Chapter note: a short note that doesn't pause the video ---------- */

function CueNote({ cue, onClose }) {
  return (
    <div className="iv-note" data-interactive="">
      <Icon name="info" size={18} className="iv-note-icon" />
      <div className="iv-note-text">
        <p className="iv-note-title">{cue.title}</p>
        {cue.body && <p className="iv-note-body">{cue.body}</p>}
      </div>
      <IconButton icon="x" label="Dismiss note" size="sm" className="iv-note-close" onClick={onClose} />
    </div>
  )
}

/* ---------- The panel over the paused video ---------- */

function CueDialog({ cue, review, trap, previous, reflection, onAnswer, onAskAgain, onSaveReflection, onOpenCard, onContinue }) {
  const ref = useRef(null)
  const headId = useId()
  const kind = KIND[cue.type]
  // A required question that hasn't been answered can't be dismissed.
  const blocking = cue.type === 'question' && cue.required && !previous

  useEffect(() => {
    if (trap) ref.current?.querySelector('.iv-title')?.focus({ preventScroll: true })
  }, [trap])

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      if (!blocking) onContinue()
      return
    }
    if (e.key !== 'Tab' || !ref.current) return
    const items = [...ref.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement)
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    const inside = ref.current.contains(document.activeElement)
    if (e.shiftKey && (document.activeElement === first || !inside || document.activeElement === ref.current.querySelector('.iv-title'))) {
      e.preventDefault(); last.focus()
    } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
      e.preventDefault(); first.focus()
    }
  }

  return (
    <div className="iv-overlay" data-interactive="" onKeyDown={onKeyDown}>
      <div ref={ref} className={cx('iv-panel', `is-${cue.type}`)} role="dialog" aria-labelledby={headId}>
        <p className="iv-kicker">
          <Icon name={kind.icon} size={16} />
          <span>{kind.label} · <span dir="ltr">{clock(cue.at)}</span></span>
          {cue.required && <Badge tone="accent" icon="lock">Required</Badge>}
        </p>
        <h2 id={headId} className="iv-title" tabIndex={-1}>{cue.title}</h2>

        {cue.type === 'question' && (
          <QuestionBody cue={cue} previous={previous} review={review} onAnswer={onAnswer} onAskAgain={onAskAgain} onContinue={onContinue} />
        )}
        {cue.type === 'reflection' && (
          <ReflectionBody cue={cue} saved={reflection} onSave={onSaveReflection} onSkip={onContinue} />
        )}
        {cue.type === 'card' && (
          <>
            {cue.body && <p className="iv-body">{cue.body}</p>}
            <div className="iv-actions">
              {cue.action?.href && (
                <Button size="sm" href={cue.action.href} iconEnd="arrow-right" onClick={onOpenCard}>{cue.action.label}</Button>
              )}
              <Button size="sm" variant="secondary" onClick={onContinue}>Continue watching</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function QuestionBody({ cue, previous, review, onAnswer, onAskAgain, onContinue }) {
  const name = useId()
  const formRef = useRef(null)
  const [choice, setChoice] = useState(previous?.choice ?? null)
  const [checked, setChecked] = useState(!!previous)
  const focusNext = useRef(null) // what to focus after the form changes ('continue' | 'options')
  const option = checked ? cue.options.find((o) => o.id === choice) : null
  const correct = checked && choice === cue.correct

  useEffect(() => {
    const want = focusNext.current
    focusNext.current = null
    if (!want || !formRef.current) return
    const el = want === 'continue'
      ? formRef.current.querySelector('[data-continue]')
      : formRef.current.querySelector('input[type="radio"]')
    el?.focus({ preventScroll: true })
  }, [checked])

  const submit = (e) => {
    e.preventDefault()
    if (!choice) return
    focusNext.current = 'continue'
    setChecked(true)
    onAnswer(choice)
  }

  const tryAgain = () => {
    focusNext.current = 'options'
    setChoice(null)
    setChecked(false)
  }

  return (
    <form ref={formRef} className="iv-form" onSubmit={submit}>
      <fieldset className="iv-options" disabled={checked}>
        <legend className="iv-prompt">{cue.prompt}</legend>
        {cue.options.map((o) => (
          <RadioCard key={o.id} name={name} value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} title={o.label} />
        ))}
      </fieldset>

      <div role="status" className="iv-feedback-slot">
        {option && (
          <p className={cx('iv-feedback', correct ? 'is-correct' : 'is-wrong')}>
            <Icon name={correct ? 'check-circle' : 'info'} size={18} />
            <span><strong>{correct ? 'Correct.' : 'Not quite.'}</strong> {option.feedback}</span>
          </p>
        )}
      </div>

      <div className="iv-actions">
        {!checked ? (
          <>
            <Button type="submit" size="sm" disabled={!choice}>Check answer</Button>
            {!cue.required && <Button type="button" size="sm" variant="ghost" onClick={onContinue}>Skip</Button>}
            {cue.required && <span className="iv-hint">Answer to keep watching.</span>}
          </>
        ) : (
          <>
            <Button type="button" size="sm" data-continue="" onClick={onContinue}>Continue</Button>
            {!correct && <Button type="button" size="sm" variant="secondary" onClick={tryAgain}>Try again</Button>}
            {review && <Button type="button" size="sm" variant="link" onClick={onAskAgain}>Ask me again</Button>}
          </>
        )}
      </div>
    </form>
  )
}

function ReflectionBody({ cue, saved, onSave, onSkip }) {
  const [text, setText] = useState(saved || '')
  const value = text.trim()
  return (
    <form className="iv-form" onSubmit={(e) => { e.preventDefault(); if (value) onSave(value) }}>
      <TextField label={cue.prompt} hint={cue.hint} optional multiline rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="iv-actions">
        <Button type="submit" size="sm" disabled={!value}>Save and continue</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onSkip}>Skip</Button>
      </div>
    </form>
  )
}

/* ---------- "In this video": every cue, its status, and a way to jump to it ---------- */

function CueList({ listRef, headingId, cues, done, answers, lock, percent, required, answeredRequired, meetsRule, onGo, onAskAgain }) {
  if (!cues.length) return null
  const lockHintId = `${headingId}-lock`
  return (
    <section className="iv-list" aria-labelledby={headingId} ref={listRef}>
      <div className="iv-list-head">
        <h2 id={headingId} className="t-heading-4">In this video</h2>
        <p className="iv-progress">
          {meetsRule ? (
            <span className="iv-progress-done"><Icon name="check-circle" size={16} />Watched and answered. This lesson is complete.</span>
          ) : (
            <>
              <span>{percent}% watched</span>
              {required > 0 && <><span aria-hidden="true">·</span><span>{answeredRequired} of {required} questions answered</span></>}
            </>
          )}
        </p>
      </div>

      <ol className="iv-cues">
        {cues.map((c) => {
          const locked = !!lock && c.at > lock.at
          const isLock = lock?.id === c.id
          const st = locked ? { label: 'Locked', icon: 'lock' } : isLock ? { label: 'To answer', icon: 'lock' } : STATUS[done[c.id]]
          return (
            <li key={c.id} className={cx('iv-cue', locked && 'is-locked', isLock && 'is-lock', done[c.id] && 'is-done')}>
              <button
                type="button"
                className="iv-cue-btn"
                aria-disabled={locked || undefined}
                aria-describedby={locked ? lockHintId : undefined}
                onClick={() => { if (!locked) onGo(c) }}
              >
                <span className="iv-cue-time" dir="ltr">{clock(c.at)}</span>
                <span className="iv-cue-text">
                  <span className="iv-cue-title">{c.title}</span>
                  <span className="iv-cue-kind">{KIND[c.type].label}{c.required ? ' · Required' : ''}</span>
                </span>
                {st && (
                  <span className="iv-cue-state">
                    <Icon name={st.icon} size={16} />
                    <span>{st.label}</span>
                  </span>
                )}
              </button>
              {c.type === 'question' && answers[c.id] && !locked && (
                <Button variant="link" size="sm" className="iv-cue-again" onClick={() => onAskAgain(c)}>Ask me again</Button>
              )}
            </li>
          )
        })}
      </ol>

      {lock && cues.some((c) => c.at > lock.at) && (
        <p id={lockHintId} className="iv-lock-hint">
          <Icon name="lock" size={16} />
          <span>Answer the question at <span dir="ltr">{clock(lock.at)}</span> to unlock the rest of the video.</span>
        </p>
      )}
    </section>
  )
}
