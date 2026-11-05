// Derived metrics from raw events. The same maths runs on the client (preview panel) and can be
// ported 1:1 to the nightly rollup job (docs/lesson-analytics.md).
//
//   summarise(events, { rules, lessonTypes }) → { lessons: { 'course/lesson': LessonSummary }, courses: { slug: CourseSummary } }
//
// LessonSummary: active seconds, views and visits, media watched seconds and % (union of watched
// intervals ÷ duration), pages viewed / total, read depth, quiz best score / attempts, survey,
// assignment, SCORM, embed, AI, downloads, `completed` (marked complete) and `meetsRule`
// (the lesson type's completion rule, see COMPLETION_DEFAULTS).
// CourseSummary: lessons completed, active seconds ("Minimum time in the course"), watch seconds
// ("Course watch time" certificate / bonus-lesson condition) and quiz scores ("Quiz score").

import { mergeIntervals, intervalsLength } from './watch.js'

export const COMPLETION_DEFAULTS = {
  mediaPercent: 90, // video / audio / live replay: distinct watched share
  readSeconds: 240, // text: minimum active time …
  readPercent: 100, // … and scroll depth (time alone when the text fits on one screen)
  pagesPercent: 100, // pdf / slides / ebook: share of pages viewed …
  docSeconds: null, // … or this many active seconds, when set
  embedSeconds: 120, // embedded tool: time spent in the tool
  aiMessages: 1, // AI practice: messages sent by the learner
  scormStatuses: ['completed', 'passed'],
  assignment: 'submitted', // or 'graded'
}

const keyOf = (e) => `${e.courseSlug || '-'}/${e.lessonId || '-'}`
const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : null)
const ms = (e) => Date.parse(e.at) || 0

function blank(e) {
  return {
    courseSlug: e.courseSlug || null,
    lessonId: e.lessonId || null,
    lessonType: e.lessonType || null,
    views: 0,
    visits: 0,
    activeSeconds: 0,
    media: null,
    pages: null,
    readPercent: null,
    readFits: false,
    quiz: null,
    survey: null,
    assignment: null,
    scorm: null,
    embed: null,
    ai: null,
    downloads: 0,
    live: null,
    completed: false,
    completedAt: null,
    meetsRule: false,
    firstAt: e.at,
    lastAt: e.at,
  }
}

// Watched intervals for one media kind ('video' | 'audio') across every visit.
function mediaFor(events, kind) {
  const mine = events.filter((e) => e.type.startsWith(kind + '_'))
  if (!mine.length) return null
  const intervals = []
  let duration = null
  let reported = 0
  let ended = false
  let plays = 0

  const bySession = new Map()
  for (const e of mine) {
    const d = num(e.duration ?? e.durationSeconds)
    if (d && d > 0) duration = Math.max(duration || 0, d)
    if (e.type === `${kind}_ended`) ended = true
    if (e.type === `${kind}_play`) plays += 1
    const w = num(e.watchedSeconds ?? e.watched)
    if (w) reported = Math.max(reported, w)
    if (Array.isArray(e.segment)) intervals.push(e.segment.map(Number))
    if (Array.isArray(e.segments)) e.segments.forEach((s) => Array.isArray(s) && intervals.push(s.map(Number)))
    const s = e.sessionId || '-'
    if (!bySession.has(s)) bySession.set(s, [])
    bySession.get(s).push(e)
  }

  // Events with a position but no segment (e.g. periodic video_progress): join consecutive
  // positions in a visit when the playhead moved forward at a plausible speed (≤ 2.5×).
  for (const list of bySession.values()) {
    list.sort((a, b) => ms(a) - ms(b) || (a.seq || 0) - (b.seq || 0))
    let prev = null
    for (const e of list) {
      const pos = num(e.position ?? e.currentTime)
      const hasSegment = Array.isArray(e.segment) || Array.isArray(e.segments)
      if (e.type === `${kind}_seek`) { prev = num(e.to) != null ? { pos: num(e.to), t: ms(e) } : null; continue }
      if (pos == null) continue
      if (prev && !hasSegment && pos > prev.pos) {
        const wall = (ms(e) - prev.t) / 1000
        if (pos - prev.pos <= wall * 2.5 + 2) intervals.push([prev.pos, pos])
      }
      const stops = e.type === `${kind}_pause` || e.type === `${kind}_ended`
      prev = stops ? null : { pos, t: ms(e) }
    }
  }

  const merged = mergeIntervals(intervals)
  const union = Math.max(intervalsLength(merged), reported)
  const watchedSeconds = Math.round(duration ? Math.min(union, duration) : union)
  return {
    kind,
    plays,
    ended,
    watchedSeconds,
    durationSeconds: duration ? Math.round(duration) : null,
    watchedPercent: duration ? Math.min(100, Math.round((watchedSeconds / duration) * 100)) : null,
    segments: merged.map(([a, b]) => [Math.round(a), Math.round(b)]),
  }
}

function lessonSummary(list, rules, typeHint) {
  const s = blank(list[0])
  const visits = new Set()
  const pages = new Set()
  let pagesTotal = null
  for (const e of list) {
    if (!s.lessonType && e.lessonType) s.lessonType = e.lessonType
    if (e.at < s.firstAt) s.firstAt = e.at
    if (e.at > s.lastAt) s.lastAt = e.at
    if (e.sessionId) visits.add(e.sessionId)
    const t = e.type
    if (t === 'lesson_view') s.views += 1
    else if (t === 'lesson_active_time') s.activeSeconds += num(e.seconds) || 0
    else if (t === 'lesson_complete') { s.completed = true; s.completedAt = e.at }
    else if (t === 'lesson_uncomplete') { s.completed = false; s.completedAt = null }
    else if (t === 'doc_page_view') {
      if (num(e.page) != null) pages.add(num(e.page))
      if (num(e.total ?? e.pageCount)) pagesTotal = Math.max(pagesTotal || 0, num(e.total ?? e.pageCount))
    } else if (t === 'read_progress') {
      s.readPercent = Math.max(s.readPercent || 0, num(e.percent) || 0)
      if (e.fits) s.readFits = true
    } else if (t === 'quiz_start' || t === 'quiz_submit' || t === 'quiz_result') {
      const q = s.quiz || (s.quiz = { starts: 0, submits: 0, results: 0, bestScore: null, lastScore: null, passed: false })
      if (t === 'quiz_start') q.starts += 1
      if (t === 'quiz_submit') q.submits += 1
      if (t === 'quiz_result') q.results += 1
      const score = num(e.score ?? e.percent)
      if (score != null && t !== 'quiz_start') { q.bestScore = Math.max(q.bestScore ?? 0, score); q.lastScore = score }
      if (e.passed === true || e.pass === true) q.passed = true
    } else if (t === 'ivideo_cue_shown' || t === 'ivideo_answer') {
      // Interactive video: which required questions were shown and which were answered.
      const iv = s.interactive || (s.interactive = { required: new Set(), answered: new Set() })
      if (e.required) iv.required.add(e.cueId)
      if (t === 'ivideo_answer' && e.required) iv.answered.add(e.cueId)
    } else if (t === 'survey_submit') {
      s.survey = { submitted: true, times: (s.survey?.times || 0) + 1, answered: num(e.answered), total: num(e.total) }
    } else if (t === 'assignment_submit' || t === 'assignment_draft_saved' || t === 'assignment_graded') {
      const a = s.assignment || (s.assignment = { drafts: 0, submitted: false, graded: false })
      if (t === 'assignment_draft_saved') a.drafts += 1
      if (t === 'assignment_submit') a.submitted = true
      if (t === 'assignment_graded') { a.graded = true; a.score = num(e.score) }
    } else if (t.startsWith('scorm_')) {
      const sc = s.scorm || (s.scorm = { launches: 0, status: null, score: null, sessionSeconds: 0 })
      if (t === 'scorm_launch') sc.launches += 1
      if (t === 'scorm_status' && e.status) sc.status = e.status
      if (t === 'scorm_score' && num(e.raw) != null) sc.score = Math.max(sc.score ?? 0, num(e.raw))
      if (t === 'scorm_exit') { sc.sessionSeconds += num(e.sessionSeconds) || 0; if (e.status) sc.status = e.status }
    } else if (t === 'embed_open' || t === 'embed_active_time') {
      const em = s.embed || (s.embed = { opens: 0, activeSeconds: 0 })
      if (t === 'embed_open') em.opens += 1
      else em.activeSeconds += num(e.seconds) || 0
    } else if (t === 'ai_message') {
      const ai = s.ai || (s.ai = { messages: 0, learnerMessages: 0 })
      ai.messages += 1
      if (e.role === 'user') ai.learnerMessages += 1
    } else if (t === 'file_download' || t === 'doc_download') s.downloads += num(e.count) || 1
    else if (t === 'live_join') s.live = { attended: true }
  }
  s.visits = visits.size
  if (pages.size || pagesTotal) {
    const total = pagesTotal || pages.size
    s.pages = { viewed: pages.size, total, percent: total ? Math.round((pages.size / total) * 100) : null }
  }
  s.media = mediaFor(list, 'video') || mediaFor(list, 'audio')
  s.lessonType = s.lessonType || typeHint || null
  s.activeSeconds = Math.round(s.activeSeconds)
  s.meetsRule = meetsCompletion(s, rules)
  return s
}

// Does a lesson summary meet its lesson type's completion rule? (Marked complete always counts.)
export function meetsCompletion(s, rules = COMPLETION_DEFAULTS) {
  const r = { ...COMPLETION_DEFAULTS, ...rules }
  if (s.completed) return true
  const mediaOk = (s.media?.watchedPercent ?? 0) >= r.mediaPercent
  switch (s.lessonType) {
    case 'video':
    case 'audio':
      return mediaOk
    case 'live':
      return !!s.live?.attended || mediaOk
    case 'text': {
      const timeOk = s.activeSeconds >= r.readSeconds
      return s.readFits ? timeOk : timeOk && (s.readPercent ?? 0) >= r.readPercent
    }
    case 'pdf':
    case 'slide':
    case 'ebook':
      return (s.pages?.percent ?? 0) >= r.pagesPercent || (r.docSeconds != null && s.activeSeconds >= r.docSeconds)
    case 'interactive': {
      // ≥ 90% watched and every required question answered.
      const iv = s.interactive
      const allAnswered = !iv || [...iv.required].every((id) => iv.answered.has(id))
      return mediaOk && allAnswered
    }
    case 'quiz':
      return !!s.quiz?.passed
    case 'survey':
      return !!s.survey?.submitted
    case 'assignment':
      return r.assignment === 'graded' ? !!s.assignment?.graded : !!s.assignment?.submitted
    case 'scorm':
      return r.scormStatuses.includes(s.scorm?.status)
    case 'download':
      return s.downloads > 0
    case 'embedded':
      return Math.max(s.embed?.activeSeconds || 0, s.activeSeconds) >= r.embedSeconds
    case 'ai':
      return (s.ai?.learnerMessages || 0) >= r.aiMessages
    default:
      return false
  }
}

export function summarise(events = [], { rules, lessonTypes = {} } = {}) {
  const groups = new Map()
  for (const e of events) {
    if (!e || !e.type || e.type.startsWith('_') || !e.lessonId) continue
    const k = keyOf(e)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(e)
  }

  const lessons = {}
  for (const [k, list] of groups) lessons[k] = lessonSummary(list, rules, lessonTypes[list[0].lessonId])

  const courses = {}
  for (const l of Object.values(lessons)) {
    const slug = l.courseSlug || '-'
    const c = courses[slug] || (courses[slug] = {
      courseSlug: l.courseSlug, lessonsSeen: 0, lessonsCompleted: 0, activeSeconds: 0, watchSeconds: 0, quizzes: {},
    })
    c.lessonsSeen += 1
    if (l.completed || l.meetsRule) c.lessonsCompleted += 1
    c.activeSeconds += l.activeSeconds
    c.watchSeconds += l.media?.watchedSeconds || 0
    if (l.quiz) c.quizzes[l.lessonId] = { bestScore: l.quiz.bestScore, attempts: l.quiz.results || l.quiz.submits, passed: l.quiz.passed }
  }
  return { lessons, courses }
}

export function summariseLesson(events, lessonId, courseSlug) {
  const list = events.filter((e) => e && e.lessonId === lessonId && (!courseSlug || e.courseSlug === courseSlug) && !e.type.startsWith('_'))
  return list.length ? lessonSummary(list) : null
}
