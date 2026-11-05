import { useEffect, useState } from 'react'

// Small helpers for the quiz layouts (src/pages/QuizAttempt.jsx, ./QuizPassage.jsx).

// Wide enough for the passage beside the questions (matches the 1024px break in quiz-attempt.css).
export function useWide(query = '(min-width: 1024px)') {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : true)
  const [wide, setWide] = useState(get)
  useEffect(() => {
    if (!window.matchMedia) return
    const m = window.matchMedia(query)
    const on = () => setWide(m.matches)
    m.addEventListener?.('change', on)
    return () => m.removeEventListener?.('change', on)
  }, [query])
  return wide
}

// Where the student last left the passage divider: a per-viewer convenience in localStorage.
const SPLIT_KEY = 'sw-quiz:split'
export const SPLIT_MIN = 28
export const SPLIT_MAX = 68
export const SPLIT_DEFAULT = 46

export function readSplit() {
  try {
    const v = Number(window.localStorage.getItem(SPLIT_KEY))
    return v >= SPLIT_MIN && v <= SPLIT_MAX ? v : SPLIT_DEFAULT
  } catch {
    return SPLIT_DEFAULT
  }
}

export function saveSplit(v) {
  try { window.localStorage.setItem(SPLIT_KEY, String(Math.round(v))) } catch { /* a convenience only */ }
}

// The time now, for event handlers (kept out of render).
export const nowMs = () => Date.now()
