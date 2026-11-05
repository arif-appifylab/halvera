import { useEffect, useRef, useState } from 'react'
import playerjs from 'player.js'
import { cx, Badge, Button, Icon } from '@/design-system'
import { track, markMediaPlaying } from '@/lib/analytics/index.js'
import MediaMenu from './MediaMenu.jsx'
import { useAudioTrackChoice } from './audio-tracks.js'
import './video-player.css'

// The lesson video player. One component, one event model, two kinds of source:
//
//   { provider: 'bunny', libraryId, videoId, drm, token?, expires? }
//       A school's video on Bunny Stream (EzyCourse hosts every video there). Rendered as Bunny's own
//       iframe player, with or without MediaCage DRM, and observed through Player.js (postMessage).
//   { provider: 'file', src, poster, captions?, audioTracks? }
//       A plain MP4 in a native <video>. Used for the theme preview, and as the fallback.
//       audioTracks [{ id?, label, lang, kind?, src? }]: an "Audio" menu under the video switches
//       between them (a track with its own src swaps the file and keeps the position; without one,
//       as in the preview, the clip stays and the caption language follows). Bunny's own player
//       lists a stream's audio tracks itself. The choice is remembered (./audio-tracks.js).
//
// Props: source, title (names the player for screen readers), startAt (seconds), onEvent(event),
// resumeKey (remembers the last position for this visit; the course player passes "<course>/<lesson>").
// Every event goes through track() from src/lib/analytics: video_play, video_pause, video_seek,
// video_progress (every ~10 s of playback, with position, duration and watched = unique seconds seen),
// video_ended, video_rate. See docs/video-player.md.

const PROGRESS_EVERY = 10 // seconds of playback between video_progress events
const MAX_STEP = 2.5 // a position step longer than this (per 1× speed) is a seek, not watching
const BUNNY_EMBED = 'https://iframe.mediadelivery.net/embed'

// Last position per resumeKey, in memory for this visit.
const positions = new Map()
let embedCount = 0

const round = (n) => Math.round((Number(n) || 0) * 10) / 10

// Merge [from, to] into a sorted list of watched intervals.
function addInterval(list, from, to) {
  const all = [...list, [from, to]].sort((a, b) => a[0] - b[0])
  const out = []
  for (const [a, b] of all) {
    const last = out[out.length - 1]
    if (last && a <= last[1]) last[1] = Math.max(last[1], b)
    else out.push([a, b])
  }
  return out
}

// Turns raw player callbacks (from Player.js or a <video>) into analytics events.
function createReporter(resumeKey) {
  const s = { pos: null, duration: 0, intervals: [], since: 0, playing: false, rate: 1, seekFrom: null }
  let sink = null
  const emit = (type, data) => sink?.(type, data)
  const watched = () => round(s.intervals.reduce((n, [a, b]) => n + (b - a), 0))
  const snapshot = () => ({ position: round(s.pos), duration: round(s.duration), watched: watched() })
  const remember = () => { if (resumeKey && s.pos !== null) positions.set(resumeKey, s.pos) }

  return {
    connect(fn) { sink = fn },
    // Forget the last position, so the next time update is a fresh baseline (used for resume).
    rebase() { s.pos = null; s.seekFrom = null },
    play() {
      if (s.playing) return
      s.playing = true
      // Keeps the lesson's active time counting while a video plays (iframe players can't be seen by the DOM listener).
      markMediaPlaying(true, 'video:' + resumeKey)
      emit('video_play', snapshot())
    },
    pause() {
      if (!s.playing) return
      s.playing = false
      markMediaPlaying(false, 'video:' + resumeKey)
      remember()
      emit('video_pause', snapshot())
    },
    seek() { if (s.seekFrom === null) s.seekFrom = s.pos },
    time(pos, duration) {
      if (!Number.isFinite(pos)) return
      if (Number.isFinite(duration) && duration > 0) s.duration = duration
      const prev = s.pos
      s.pos = pos
      if (prev === null) return
      const step = pos - prev
      if (s.seekFrom !== null || step < 0 || step > MAX_STEP * Math.max(1, s.rate)) {
        const from = s.seekFrom ?? prev
        s.seekFrom = null
        remember()
        if (from !== null && Math.abs(pos - from) >= 1) {
          emit('video_seek', { from: round(from), to: round(pos), duration: round(s.duration) })
        }
        return
      }
      if (!s.playing || step === 0) return
      s.intervals = addInterval(s.intervals, prev, pos)
      s.since += step
      if (s.since >= PROGRESS_EVERY) {
        s.since = 0
        remember()
        emit('video_progress', snapshot())
      }
    },
    ended() {
      if (s.duration) s.pos = s.duration
      s.playing = false
      markMediaPlaying(false, 'video:' + resumeKey)
      const data = snapshot()
      s.pos = null
      if (resumeKey) positions.delete(resumeKey) // finished: start from the top next time
      emit('video_ended', data)
    },
    rate(next) {
      if (!Number.isFinite(next) || next <= 0 || next === s.rate) return
      const from = s.rate
      s.rate = next
      emit('video_rate', { from, rate: next, position: round(s.pos) })
    },
    leave() { remember() },
  }
}

function bunnyEmbedUrl({ libraryId, videoId, token, expires }, { start = 0, nonce } = {}) {
  const q = new URLSearchParams({
    autoplay: 'false',
    preload: 'false', // don't spend the school's bandwidth until the student presses play
    responsive: 'true',
    rememberPosition: 'false', // we resume ourselves, so both players agree on the start
  })
  if (start > 0) q.set('t', String(Math.floor(start)))
  if (token && expires) { q.set('token', token); q.set('expires', String(expires)) }
  // Player.js matches each "ready" message to its iframe by src, so every embed on a page needs a unique one.
  if (nonce) q.set('pjs', String(nonce))
  return `${BUNNY_EMBED}/${encodeURIComponent(libraryId)}/${encodeURIComponent(videoId)}?${q}`
}

export default function VideoPlayer({ source, title, startAt = 0, onEvent, resumeKey, className }) {
  const bunny = source?.provider === 'bunny'
  const drm = bunny && !!source.drm
  const [start] = useState(() => (resumeKey && positions.get(resumeKey)) || startAt || 0)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const fileTracks = !bunny && source?.audioTracks?.length > 1 ? source.audioTracks : null
  const audio = useAudioTrackChoice(fileTracks, { title, provider: source?.provider })

  // The reporter lives for the whole mount; connect() hands it the latest props after each render.
  const [report] = useState(() => createReporter(resumeKey))
  useEffect(() => {
    const meta = {
      title, provider: source?.provider, drm, ...(bunny && { videoId: source.videoId }),
      ...(audio.active && { audioLang: audio.active.lang, audioKind: audio.active.kind || 'main' }),
    }
    report.connect((type, data) => {
      const event = track(type, { ...meta, ...data })
      onEvent?.(event)
    })
  })
  useEffect(() => () => report.leave(), [report])

  if (!source) return null

  return (
    <div className={cx('vp', className)}>
      <div className={cx('vp-stage', error && 'is-error')}>
        {bunny
          ? <BunnyEmbed key={attempt} source={source} title={title} start={start} report={report} onError={() => setError(true)} />
          : <FileVideo key={attempt} source={source} audio={audio.active} title={title} start={start} report={report} onError={() => setError(true)} />}
        {error && (
          <div className="vp-error" role="alert">
            <Icon name="alert" size={24} />
            <p className="t-body">This video can’t play right now. Check your connection and try again.</p>
            <Button size="sm" variant="secondary" onClick={() => { setError(false); setAttempt((n) => n + 1) }}>Try again</Button>
          </div>
        )}
      </div>
      {fileTracks && (
        <div className="vp-tools">
          <MediaMenu label="Audio" icon="headphones" value={audio.activeKey} options={audio.options} onChange={audio.select} />
          <span className="sg-sr" role="status">{audio.active ? `Audio: ${audio.active.label}` : ''}</span>
        </div>
      )}
      {drm && (
        <p className="vp-meta">
          <Badge tone="neutral" icon="lock">Protected video</Badge>
          <span className="vp-meta-text">Streaming only. This video is encrypted and can’t be downloaded.</span>
        </p>
      )}
    </div>
  )
}

// Bunny Stream's iframe player (DRM or not), observed with Player.js.
function BunnyEmbed({ source, title, start, report, onError }) {
  const ref = useRef(null)
  const [nonce] = useState(() => { embedCount += 1; return embedCount })
  const src = bunnyEmbedUrl(source, { start, nonce })
  const errorRef = useRef(onError)
  useEffect(() => { errorRef.current = onError })

  useEffect(() => {
    if (!ref.current) return undefined
    const player = new playerjs.Player(ref.current)
    let alive = true
    const handlers = {
      play: () => report.play(),
      pause: () => report.pause(),
      timeupdate: (d) => d && report.time(Number(d.seconds), Number(d.duration)),
      seeked: () => report.seek(),
      ended: () => report.ended(),
      playbackratechange: (r) => report.rate(Number(r?.rate ?? r?.value ?? r)),
      // Command errors carry a code (5 = play() blocked by autoplay policy); media errors carry none.
      error: (e) => { if (!e || e.code === undefined) errorRef.current?.() },
    }
    const bound = []
    player.on('ready', () => {
      if (!alive) return
      for (const [name, fn] of Object.entries(handlers)) {
        if (player.supports('event', name)) { player.on(name, fn); bound.push([name, fn]) }
      }
    })
    return () => {
      alive = false
      bound.forEach(([name, fn]) => player.off(name, fn))
    }
  }, [src, report])

  return (
    <iframe
      ref={ref}
      className="vp-frame"
      src={src}
      title={title ? `Video: ${title}` : 'Video player'}
      loading="lazy"
      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
    />
  )
}

// A plain MP4 in the browser's own player (keyboard accessible controls, captions, picture in picture).
function FileVideo({ source, audio, title, start, report, onError }) {
  const ref = useRef(null)
  const src = audio?.src || source.src
  // Switching to an audio track with its own file: carry the position and play state over.
  const last = useRef({ at: 0, playing: false })
  const carry = useRef(null)
  const prevSrc = useRef(src)
  useEffect(() => {
    if (src === prevSrc.current) return
    prevSrc.current = src
    carry.current = { ...last.current }
  }, [src])
  const remember = (v) => { if (v.readyState > 0) last.current = { at: v.currentTime, playing: !v.paused } }

  // Captions follow the audio language: the default caption track is the one in that language, and
  // if captions are showing when the audio changes, they switch to it.
  const lang = audio?.lang
  const captions = source.captions || []
  const captionsDefault = captions.some((c) => c.default)
  const hasLangCaptions = !!lang && captions.some((c) => c.srclang === lang)
  useEffect(() => {
    const list = ref.current?.textTracks
    if (!list || !lang) return
    const tracks = [...list].filter((t) => t.kind === 'captions' || t.kind === 'subtitles')
    const match = tracks.find((t) => t.language === lang)
    if (!match || !tracks.some((t) => t.mode === 'showing')) return
    tracks.forEach((t) => { t.mode = t === match ? 'showing' : 'disabled' })
  }, [lang])

  const onLoadedMetadata = (e) => {
    const v = e.currentTarget
    const resume = carry.current
    carry.current = null
    const at = resume ? resume.at : start
    if (at > 0 && at < v.duration - 1) {
      report.rebase()
      v.currentTime = at
    }
    if (resume?.playing) v.play().catch(() => {})
  }

  return (
    <video
      ref={ref}
      className="vp-video"
      src={src}
      controls
      controlsList="nodownload"
      playsInline
      preload="metadata"
      poster={source.poster}
      aria-label={title ? `Video: ${title}` : 'Video player'}
      onLoadedMetadata={onLoadedMetadata}
      onPlay={() => report.play()}
      onPause={(e) => { if (!e.currentTarget.ended) report.pause() }}
      onSeeking={() => report.seek()}
      onTimeUpdate={(e) => { remember(e.currentTarget); report.time(e.currentTarget.currentTime, e.currentTarget.duration) }}
      onEnded={() => report.ended()}
      onRateChange={(e) => report.rate(e.currentTarget.playbackRate)}
      onError={onError}
    >
      {captions.map((c) => (
        <track
          key={c.src}
          kind="captions"
          src={c.src}
          srcLang={c.srclang}
          label={c.label}
          default={captionsDefault && (hasLangCaptions ? c.srclang === lang : !!c.default)}
        />
      ))}
    </video>
  )
}
