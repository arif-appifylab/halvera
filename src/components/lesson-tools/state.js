import { useCallback, useEffect, useMemo, useState } from 'react'
import { discussionFor } from '@/data/lesson-tools.js'
import { lessonNotes } from '@/data/account.js'

// Lesson tools state that outlives one lesson: the student's discussion posts and likes, and their
// notes. Both are kept in this browser (localStorage) per course; the backend would store them per
// student. Every read and write is guarded so blocked storage only loses persistence.

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage blocked */ }
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

// A slice of localStorage that reloads when the key changes (another course).
function useStored(key, fallback) {
  const [state, setState] = useState(() => ({ key, value: read(key, fallback) }))
  const value = state.key === key ? state.value : read(key, fallback)
  const set = useCallback((fn) => {
    setState((s) => {
      const base = s.key === key ? s.value : read(key, fallback)
      const next = typeof fn === 'function' ? fn(base) : fn
      write(key, next)
      return { key, value: next }
    })
  }, [key, fallback])
  // Keep other tabs in step.
  useEffect(() => {
    const on = (e) => { if (e.key === key) setState({ key, value: read(key, fallback) }) }
    window.addEventListener('storage', on)
    return () => window.removeEventListener('storage', on)
  }, [key, fallback])
  return [value, set]
}

/* ---------- Discussion ---------- */

const EMPTY_DISCUSSION = { posts: {}, replies: {}, liked: [] }

// Threads for one lesson: the seeded ones plus what this student posted, with likes applied.
export function useDiscussion(slug, lessonId, viewer) {
  const [saved, setSaved] = useStored(`halvera-lesson-discussion:${slug}`, EMPTY_DISCUSSION)
  const [now] = useState(() => Date.now())

  const threads = useMemo(() => {
    const liked = new Set(saved.liked || [])
    const withMeta = (item) => {
      const at = item.at ?? now - (item.ago || 0) * 60000
      const mine = liked.has(item.id)
      return { ...item, at, liked: mine, likes: (item.likes || 0) + (mine ? 1 : 0) }
    }
    const seeded = discussionFor(slug, lessonId)
    const local = saved.posts?.[lessonId] || []
    return [...seeded, ...local].map((t) => ({
      ...withMeta(t),
      replies: [...(t.replies || []), ...(saved.replies?.[t.id] || [])].map(withMeta).sort((a, b) => a.at - b.at),
    }))
  }, [saved, slug, lessonId, now])

  const me = { author: viewer?.name || 'You', mine: true }

  const ask = (html) => setSaved((s) => ({
    ...s,
    posts: { ...s.posts, [lessonId]: [...(s.posts?.[lessonId] || []), { id: uid(), ...me, at: Date.now(), likes: 0, text: html, replies: [] }] },
  }))

  const reply = (threadId, html) => setSaved((s) => ({
    ...s,
    replies: { ...s.replies, [threadId]: [...(s.replies?.[threadId] || []), { id: uid(), ...me, at: Date.now(), likes: 0, text: html }] },
  }))

  const toggleLike = (id) => setSaved((s) => {
    const liked = new Set(s.liked || [])
    if (liked.has(id)) liked.delete(id); else liked.add(id)
    return { ...s, liked: [...liked] }
  })

  return { threads, count: threads.length, ask, reply, toggleLike }
}

/* ---------- Notes ---------- */

const EMPTY_NOTES = {}

// All of the student's notes in a course: { [lessonId]: [{ id, text, time, at, edited }] }.
export function useNotes(slug) {
  // Until the student changes them in this browser, the account's notes (src/data/account.js).
  const [all, setAll] = useStored(`halvera-lesson-notes:${slug}`, lessonNotes[slug] || EMPTY_NOTES)

  const add = (lessonId, text, time) => setAll((s) => ({
    ...s,
    [lessonId]: [...(s[lessonId] || []), { id: uid(), text, time: time ?? null, at: Date.now() }],
  }))

  const edit = (lessonId, id, text) => setAll((s) => ({
    ...s,
    [lessonId]: (s[lessonId] || []).map((n) => (n.id === id ? { ...n, text, edited: Date.now() } : n)),
  }))

  // Returns what was removed, so the caller can offer Undo.
  const remove = (lessonId, id) => {
    const list = all[lessonId] || []
    const index = list.findIndex((n) => n.id === id)
    if (index === -1) return null
    setAll((s) => {
      const next = { ...s, [lessonId]: (s[lessonId] || []).filter((n) => n.id !== id) }
      if (!next[lessonId].length) delete next[lessonId]
      return next
    })
    return { lessonId, note: list[index], index }
  }

  const restore = ({ lessonId, note, index }) => setAll((s) => {
    const list = [...(s[lessonId] || [])]
    list.splice(Math.min(index, list.length), 0, note)
    return { ...s, [lessonId]: list }
  })

  return { all, add, edit, remove, restore }
}

/* ---------- Times ---------- */

export function relativeTime(at, now = Date.now()) {
  const mins = Math.floor((now - at) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.floor(hours / 24)
  if (days < 2) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '')
}
