// The library page's one audio engine: what the mini player bar plays while you browse episodes.
// Plays a real <audio> when the episode has a `src`, otherwise (the theme preview has no audio files)
// moves a simulated playhead in real time, so the controls, progress and analytics behave the same.
//
// Analytics (src/lib/analytics): audio_play, audio_pause, audio_progress (every 10 s of listening),
// audio_ended, each with librarySlug, episodeId, position, duration, rate, segment, watchedSeconds and
// watchedPercent. markMediaPlaying() is on while anything plays.
import { useCallback, useEffect, useRef, useState } from 'react'
import { track, markMediaPlaying, createWatchTracker } from '@/lib/analytics/index.js'

const PROGRESS_EVERY = 10
const TICK = 250
export const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2]

const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible'

export default function useLibraryAudio(product, { onEnded } = {}) {
  const [state, setState] = useState({ episode: null, playing: false, position: 0, duration: 0, rate: 1 })
  const s = useRef({ episode: null, playing: false, position: 0, duration: 0, rate: 1 })
  const audio = useRef(null)
  const watch = useRef(null)
  const since = useRef(0)
  const segFrom = useRef(0)
  const positions = useRef(new Map())
  const endedRef = useRef(onEnded)
  useEffect(() => { endedRef.current = onEnded })

  const key = 'library-audio:' + product.slug
  const sync = () => setState({ ...s.current })

  const report = useCallback((type, extra) => {
    const cur = s.current
    if (!cur.episode) return
    const pos = Math.round(cur.position)
    track(type, {
      productType: 'media-library', librarySlug: product.slug, format: product.mediaLibrary?.format,
      episodeId: cur.episode.id, episodeNumber: cur.episode.n, title: cur.episode.title,
      position: pos, duration: Math.round(cur.duration) || undefined, rate: cur.rate,
      segment: pos > segFrom.current ? [Math.round(segFrom.current), pos] : undefined,
      watchedSeconds: watch.current ? Math.round(watch.current.watched()) : undefined,
      watchedPercent: watch.current?.percent() ?? undefined,
      ...extra,
    })
    segFrom.current = cur.position
    since.current = 0
  }, [product])

  const stop = useCallback((type) => {
    const cur = s.current
    if (!cur.playing) return
    cur.playing = false
    watch.current?.stop()
    markMediaPlaying(false, key)
    positions.current.set(cur.episode.id, cur.position)
    report(type)
    sync()
  }, [key, report])

  const start = useCallback(() => {
    const cur = s.current
    if (!cur.episode || cur.playing) return
    if (cur.position >= cur.duration - 0.5) cur.position = 0
    cur.playing = true
    segFrom.current = cur.position
    since.current = 0
    watch.current?.at(cur.position)
    markMediaPlaying(true, key)
    report('audio_play', { segment: undefined })
    if (audio.current) {
      audio.current.playbackRate = cur.rate
      audio.current.play().catch(() => stop('audio_pause'))
    }
    sync()
  }, [key, report, stop])

  // Playhead moved (real audio timeupdate, or a simulated tick).
  const moved = useCallback((next) => {
    const cur = s.current
    if (!cur.playing) return
    const step = next - cur.position
    cur.position = Math.min(next, cur.duration)
    watch.current?.at(cur.position)
    if (step > 0) since.current += step / cur.rate
    if (since.current >= PROGRESS_EVERY) report('audio_progress')
    if (cur.position >= cur.duration) {
      cur.playing = false
      watch.current?.stop()
      markMediaPlaying(false, key)
      positions.current.delete(cur.episode.id)
      report('audio_ended')
      sync()
      endedRef.current?.(cur.episode)
      return
    }
    sync()
  }, [key, report])

  // Simulated clock (no src).
  useEffect(() => {
    const id = setInterval(() => {
      const cur = s.current
      if (!cur.playing || audio.current || !visible()) return
      moved(cur.position + (TICK / 1000) * cur.rate)
    }, TICK)
    return () => clearInterval(id)
  }, [moved])

  // Leaving the page pauses (and reports) whatever was playing.
  useEffect(() => () => {
    if (s.current.playing) {
      s.current.playing = false
      markMediaPlaying(false, key)
      report('audio_pause')
    }
    audio.current?.pause()
  }, [key, report])

  const pause = useCallback(() => {
    audio.current?.pause()
    stop('audio_pause')
  }, [stop])

  const seek = useCallback((to) => {
    const cur = s.current
    if (!cur.episode) return
    const next = Math.max(0, Math.min(cur.duration - 0.5, to))
    if (cur.playing) { report('audio_progress'); watch.current?.stop() }
    cur.position = next
    segFrom.current = next
    if (cur.playing) watch.current?.at(next)
    if (audio.current) audio.current.currentTime = next
    sync()
  }, [report])

  const load = useCallback((ep, { at, autoplay = true } = {}) => {
    const cur = s.current
    if (cur.episode?.id === ep.id) {
      if (at !== undefined) seek(at)
      if (autoplay && !cur.playing) start()
      return
    }
    if (cur.playing) { audio.current?.pause(); stop('audio_pause') }
    if (cur.episode) positions.current.set(cur.episode.id, cur.position)
    audio.current?.removeAttribute('src')
    audio.current = null

    cur.episode = ep
    cur.duration = ep.seconds || 1
    cur.position = at ?? positions.current.get(ep.id) ?? 0
    watch.current = createWatchTracker(cur.duration)
    if (ep.src) {
      const a = new Audio(ep.src)
      a.preload = 'metadata'
      a.currentTime = cur.position
      a.addEventListener('loadedmetadata', () => { if (Number.isFinite(a.duration)) { cur.duration = a.duration; watch.current?.setDuration(a.duration); sync() } })
      a.addEventListener('timeupdate', () => moved(a.currentTime))
      a.addEventListener('pause', () => { if (!a.ended) stop('audio_pause') })
      a.addEventListener('ended', () => moved(cur.duration))
      audio.current = a
    }
    sync()
    if (autoplay) start()
  }, [moved, seek, start, stop])

  const setRate = useCallback((rate) => {
    s.current.rate = rate
    if (audio.current) audio.current.playbackRate = rate
    sync()
  }, [])

  const close = useCallback(() => {
    pause()
    if (s.current.episode) positions.current.set(s.current.episode.id, s.current.position)
    s.current.episode = null
    audio.current = null
    sync()
  }, [pause])

  return {
    ...state,
    load,
    play: start,
    pause,
    toggle: () => (s.current.playing ? pause() : start()),
    seek,
    skip: (delta) => seek(s.current.position + delta),
    setRate,
    close,
  }
}
