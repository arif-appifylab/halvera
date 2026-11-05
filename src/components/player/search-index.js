// Lesson search for one course: an index of chapter titles, lesson titles, lesson type labels and
// every human-readable string inside lessonContent[slug][lessonId] (walked generically, whatever its
// shape). Matching is case- and accent-insensitive; results are ranked, one per lesson.
import { lessonContent } from '@/data/learn.js'
import { TYPE_LABEL, shownType } from '@/components/player/lesson-types.js'

const MAX_RESULTS = 20
const SNIPPET = 120
const LEAD = 40
// Keys that hold machine values, not words a student would search for.
const SKIP_KEYS = new Set(['id', 'value', 'answer', 'answers', 'correct', 'href', 'src', 'url', 'poster', 'icon', 'key', 'slug'])
const FIELD_RANK = { 'Lesson title': 0, Chapter: 1, 'Lesson type': 2, 'In the lesson': 3 }

// Fold a string for matching and keep a map from each folded character to its original index.
export function fold(str) {
  let text = ''
  const map = []
  for (let i = 0; i < str.length; i++) {
    const n = str[i]
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[\u2018\u2019\u02bc'`]/g, '')
      .replace(/[\u201c\u201d\u00ab\u00bb]/g, '"')
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/\s/g, ' ')
    for (const c of n) {
      text += c
      map.push(i)
    }
  }
  map.push(str.length)
  return { text, map }
}

export const foldQuery = (q) => fold(String(q || '')).text.replace(/\s+/g, ' ').trim()

function collectStrings(value, out, key) {
  if (value == null || SKIP_KEYS.has(key)) return
  if (typeof value === 'string') {
    const s = value.trim()
    if (s && !/^(https?:|\/|#|data:)/.test(s)) out.push(s)
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectStrings(v, out, key))
  } else if (typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => collectStrings(v, out, k))
  }
}

const cache = new Map()

// One entry per lesson: { lesson, index, chapter, fields: [{ field, text, folded }] }.
export function buildIndex(product) {
  const hit = cache.get(product)
  if (hit) return hit
  const content = lessonContent[product.slug] || {}
  const entries = []
  let index = 0
  for (const ch of product.curriculum || []) {
    for (const lesson of ch.lessons) {
      const fields = []
      const add = (field, text) => { if (text) fields.push({ field, text, folded: fold(text) }) }
      add('Lesson title', lesson.title)
      add('Chapter', ch.title)
      add('Lesson type', TYPE_LABEL[shownType(lesson)])
      const strings = []
      collectStrings(content[lesson.id], strings)
      ;[...new Set(strings)].forEach((s) => add('In the lesson', s))
      entries.push({ lesson, index, chapter: ch.title, fields })
      index += 1
    }
  }
  cache.set(product, entries)
  return entries
}

// A ~120-character window around the match, cut at word boundaries, with the match's offsets.
function snippetFor(text, start, end) {
  if (text.length <= SNIPPET) return { snippet: text, match: [start, end] }
  let from = Math.max(0, start - LEAD)
  if (from > 0) {
    const space = text.indexOf(' ', from)
    if (space !== -1 && space < start) from = space + 1
  }
  let to = Math.min(text.length, Math.max(from + SNIPPET, end))
  if (to < text.length) {
    const space = text.lastIndexOf(' ', to)
    if (space > end) to = space
  }
  const pre = from > 0 ? '…' : ''
  const post = to < text.length ? '…' : ''
  const body = text.slice(from, to).trim()
  const lead = text.slice(from, to).length - text.slice(from, to).trimStart().length
  const offset = pre.length - from - lead
  return { snippet: pre + body + post, match: [start + offset, end + offset] }
}

const isWordStart = (folded, at) => at === 0 || /[^a-z0-9]/.test(folded[at - 1])

// searchCourse(product, query) → [{ lesson, index, chapter, field, snippet, match: [start, end] }]
// `field` is 'Lesson title' | 'Chapter' | 'Lesson type' | 'In the lesson'; `match` indexes the snippet.
export function searchCourse(product, query) {
  const q = foldQuery(query)
  if (q.length < 2) return []
  const results = []
  for (const entry of buildIndex(product)) {
    let best = null
    for (const f of entry.fields) {
      const at = f.folded.text.indexOf(q)
      if (at === -1) continue
      const score = FIELD_RANK[f.field] * 4 + (isWordStart(f.folded.text, at) ? 0 : 2) + (at === 0 ? 0 : 1)
      if (best && best.score <= score) continue
      const start = f.folded.map[at]
      const end = f.folded.map[at + q.length - 1] + 1
      best = { score, field: f.field, ...snippetFor(f.text, start, end) }
    }
    if (best) {
      const { score, ...rest } = best
      results.push({ lesson: entry.lesson, index: entry.index, chapter: entry.chapter, score, ...rest })
    }
  }
  return results
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, MAX_RESULTS)
    .map(({ score: _score, ...r }) => r)
}

// Split a string into [{ text, mark }] parts around `match` ([start, end]) for highlighting.
export function markParts(text, match) {
  if (!match || match[1] <= match[0]) return [{ text, mark: false }]
  const [s, e] = match
  return [
    { text: text.slice(0, s), mark: false },
    { text: text.slice(s, e), mark: true },
    { text: text.slice(e), mark: false },
  ].filter((p) => p.text)
}
