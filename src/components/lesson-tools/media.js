import { useEffect, useState } from 'react'

// The lesson's playing media: the first <video> or <audio> inside the lesson stage. Lesson tools
// (notes, transcript) read its currentTime and seek it; they never own the player. A MutationObserver
// picks up players that load late (the interactive video is lazy) or are replaced (Try again).

export function useStageMedia(stageRef, key) {
  const [media, setMedia] = useState(null)
  useEffect(() => {
    const root = stageRef.current
    if (!root) return undefined
    const find = () => setMedia(root.querySelector('video, audio'))
    find()
    const mo = new MutationObserver(find)
    mo.observe(root, { childList: true, subtree: true })
    return () => { mo.disconnect(); setMedia(null) }
  }, [stageRef, key])
  return media
}

// The media's current time in seconds, updated on timeupdate and seeked.
export function useMediaTime(media) {
  const [time, setTime] = useState(0)
  useEffect(() => {
    if (!media) return undefined
    const on = () => setTime(media.currentTime || 0)
    on()
    media.addEventListener('timeupdate', on)
    media.addEventListener('seeked', on)
    media.addEventListener('loadedmetadata', on)
    return () => {
      media.removeEventListener('timeupdate', on)
      media.removeEventListener('seeked', on)
      media.removeEventListener('loadedmetadata', on)
    }
  }, [media])
  return media ? time : 0
}

// Jump to a time and play from there. Players that block seeking ahead (required in-video
// questions) handle that themselves on 'seeking'.
export function seekMedia(media, seconds) {
  if (!media) return false
  try {
    media.currentTime = Math.max(0, seconds)
    const p = media.play?.()
    if (p && typeof p.catch === 'function') p.catch(() => {})
  } catch { return false }
  return true
}

// 192 → '3:12'; 3725 → '1:02:05'
export function formatTime(s) {
  const t = Math.max(0, Math.floor(Number(s) || 0))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const sec = String(t % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

// '3:12' read aloud as '3 minutes 12 seconds'
export function spokenTime(s) {
  const t = Math.max(0, Math.floor(Number(s) || 0))
  const m = Math.floor(t / 60)
  const sec = t % 60
  const parts = []
  if (m) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`)
  if (sec || !m) parts.push(`${sec} ${sec === 1 ? 'second' : 'seconds'}`)
  return parts.join(' ')
}

// A minimal WebVTT parser: cue timings and text (tags stripped). Returns [{ start, end, text }].
export function parseVtt(src) {
  const toSec = (ts) => {
    const parts = ts.trim().split(':').map(Number)
    return parts.reduce((acc, n) => acc * 60 + n, 0)
  }
  const blocks = String(src || '').replace(/\r/g, '').split(/\n\n+/)
  const cues = []
  for (const block of blocks) {
    const lines = block.split('\n')
    const at = lines.findIndex((l) => l.includes('-->'))
    if (at === -1) continue
    const [a, b] = lines[at].split('-->')
    const text = lines.slice(at + 1).join(' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (text) cues.push({ start: toSec(a), end: toSec(b.trim().split(/\s+/)[0]), text })
  }
  return cues
}
