// Audio tracks on a video (dubs, audio description): which one plays, remembered per viewer.
//
// A file source can list `audioTracks: [{ id?, label, lang, kind?, src? }]` (src/data/media.js); an
// HLS stream brings its own (the interactive player reads them from Video.js). The choice is kept in
// this browser per signed-in viewer ("halvera-audio-track:<email>", or ":guest") as { key, lang, kind },
// so the language carries over to other videos. Without a saved choice the site language
// (<html lang>, set by the language picker) decides, then the first track.
import { useCallback, useState } from 'react'
import { useViewer } from '@/app/viewer.jsx'
import { track } from '@/lib/analytics/index.js'

// HTML audio track kinds "descriptions" and "main-desc", and ours, "description".
export const isDescription = (kind) => /desc/.test(kind || '')
export const trackKey = (t, i = 0) => t.id || (isDescription(t.kind) ? `${t.lang || 'und'}-description` : t.lang) || String(i)

const storageKey = (viewer) => `halvera-audio-track:${viewer?.email || 'guest'}`
const siteLanguage = () => (typeof document === 'undefined' ? 'en' : (document.documentElement.lang || 'en').split('-')[0])
const baseLang = (lang) => (lang || '').split('-')[0]

function readSaved(viewer) {
  try { return JSON.parse(globalThis.localStorage?.getItem(storageKey(viewer)) || 'null') } catch { return null }
}
function writeSaved(viewer, value) {
  try { globalThis.localStorage?.setItem(storageKey(viewer), JSON.stringify(value)) } catch { /* storage blocked: keep it for this visit */ }
}

// The track to start with: the saved one (by key when `byKey`), then the saved language and kind,
// then a main track in the site language, then the first. Tracks: [{ id?, lang, kind? }].
export function pickTrack(tracks, saved, { byKey = true, lang = siteLanguage() } = {}) {
  if (!tracks?.length) return null
  const main = (l) => tracks.find((t) => baseLang(t.lang) === l && !isDescription(t.kind))
  return (byKey && saved?.key && tracks.find((t, i) => trackKey(t, i) === saved.key))
    || (saved?.lang && tracks.find((t) => baseLang(t.lang) === saved.lang && isDescription(t.kind) === isDescription(saved.kind)))
    || (saved?.lang && main(saved.lang))
    || main(lang)
    || tracks[0]
}

// The viewer's saved choice and a way to save a new one, plus the video_audio_track event.
export function useAudioTrackMemory() {
  const viewer = useViewer()?.viewer
  const saved = useCallback(() => readSaved(viewer), [viewer])
  const remember = useCallback((t, key, meta, from) => {
    writeSaved(viewer, { key, lang: baseLang(t.lang), kind: isDescription(t.kind) ? 'description' : 'main' })
    track('video_audio_track', {
      ...meta, lang: t.lang, kind: isDescription(t.kind) ? 'description' : 'main', label: t.label,
      from: from?.lang || undefined,
    })
  }, [viewer])
  return { saved, remember }
}

// File sources: { active, activeKey, options (for MediaMenu), select(key) }. `meta` is added to the
// video_audio_track event (title, provider).
export function useAudioTrackChoice(tracks, meta) {
  const { saved, remember } = useAudioTrackMemory()
  const list = tracks || []
  const [activeKey, setActiveKey] = useState(() => {
    const t = pickTrack(list, saved())
    return t ? trackKey(t, list.indexOf(t)) : null
  })
  const active = list.find((t, i) => trackKey(t, i) === activeKey) || list[0] || null

  const select = (key) => {
    const next = list.find((t, i) => trackKey(t, i) === key)
    if (!next || key === activeKey) return
    setActiveKey(key)
    remember(next, key, meta, active)
  }

  const options = list.map((t, i) => ({
    value: trackKey(t, i),
    label: t.label,
    lang: t.lang,
    hint: isDescription(t.kind) ? 'Describes what’s on screen' : undefined,
  }))

  return { active, activeKey: active ? trackKey(active, list.indexOf(active)) : null, options, select }
}
