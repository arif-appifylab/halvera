// Cohort course helpers: runs (the admin's cohorts), the student's own cohort, cohort-paced
// chapter release, live session times and states, and what the sales page and checkout offer.
// Data: product.cohort in src/data/products.js, cohortEnrolments in src/data/account.js.
//
// Preview states (query string, for the theme's demo pages only):
//   ?cohort=upcoming   the student's cohort hasn't started yet (player)
//   ?cohort=full       the next cohort is full (sales page, checkout)
//   ?cohort=waitlist   every open cohort is full and the school keeps a waitlist (sales page)
//   ?session=soon      the next live session starts in 10 minutes (player)
//   ?session=live      the next live session started 5 minutes ago (player)
import { cohortEnrolments } from '@/data/account.js'
import { localTime } from '@/components/product/time.js'
import { getProduct } from '@/lib/products.js'

const DAY = 864e5
const MIN = 6e4
export const JOIN_WINDOW = 15 * MIN // "Join live session" shows 15 minutes before the start
const REPLAY_AFTER = DAY // recordings are posted within a day

const param = (name) => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(name))
export const cohortPreview = () => param('cohort')
const sessionPreview = () => param('session')

// Preview links keep these parameters from lesson to lesson ('?session=soon'), or ''.
export function previewQuery() {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search)
  const keep = new URLSearchParams()
  for (const k of ['cohort', 'session', 'bundle']) if (params.get(k)) keep.set(k, params.get(k))
  const q = keep.toString()
  return q ? `?${q}` : ''
}

// The preview's "now" is fixed per course and query, so a moved session counts down normally.
let anchor = { key: null, at: 0 }
function previewAnchor(slug) {
  const key = slug + previewQuery()
  if (anchor.key !== key) anchor = { key, at: Date.now() }
  return anchor.at
}

// '2026-09-29' + n days → '2026-10-06'
function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function zoneOffset(ts, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ts))
  const get = (t) => Number(parts.find((p) => p.type === t)?.value)
  return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - ts
}

// A wall-clock time in the school's time zone → Date ('2026-10-20', '19:00', 'Europe/London').
export function zoned(date, time = '00:00', timeZone = 'UTC') {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  return new Date(guess - zoneOffset(guess, timeZone))
}

// "Tue 20 Oct" and "Tue 20 Oct, 19:00 BST" in the viewer's own time zone.
// Days use the school's calendar (pass its time zone); session times use the viewer's own, named.
export function dayLabel(d, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone }).formatToParts(d)
  const part = (t) => parts.find((p) => p.type === t)?.value || ''
  return `${part('weekday')} ${part('day')} ${part('month').replace('Sept', 'Sep')}`
}
export const whenLabel = (d) => `${dayLabel(d)}, ${localTime(d.toISOString(), { zone: true })}`
export const timeLabel = (d) => localTime(d.toISOString(), { zone: true })

const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`

// Every cohort of a product, with dates, phase and places. `now` is a timestamp.
export function cohortRuns(product, { now = Date.now(), preview = cohortPreview() } = {}) {
  const c = product?.cohort
  if (!c?.runs) return []
  let fullMarked = false
  return c.runs.map((r) => {
    const start = zoned(r.start, c.time, c.timeZone)
    const startDay = zoned(r.start, '00:00', c.timeZone)
    const last = zoned(addDays(r.start, 7 * (c.weeks - 1)), c.time, c.timeZone)
    const end = new Date(last.getTime() + c.sessionMinutes * MIN)
    const closes = zoned(addDays(r.enrolmentCloses, 1), '00:00', c.timeZone) // end of that day
    const phase = now < startDay.getTime() ? 'upcoming' : now < end.getTime() ? 'running' : 'ended'
    const week = Math.min(c.weeks, Math.floor((now - startDay.getTime()) / DAY / 7) + 1)
    let enrolled = r.enrolled
    // Preview: the first upcoming cohort is full ('full'), or all of them are ('waitlist').
    if (phase === 'upcoming' && (preview === 'waitlist' || (preview === 'full' && !fullMarked))) {
      enrolled = r.seats
      fullMarked = true
    }
    const seatsLeft = r.seats ? Math.max(0, r.seats - enrolled) : null
    const full = seatsLeft === 0
    const closed = now >= closes.getTime() || phase !== 'upcoming'
    return {
      ...r, startDate: r.start, start, startDay, last, end, closes, phase, week, weeks: c.weeks, seatsLeft, full, closed,
      open: !full && !closed,
      dates: `${dayLabel(start, c.timeZone)} – ${dayLabel(last, c.timeZone)}`,
      closesLabel: dayLabel(zoned(r.enrolmentCloses, '12:00', c.timeZone), c.timeZone),
      schedule: phaseLabel({ phase, week, weeks: c.weeks, start, last, timeZone: c.timeZone }),
    }
  })
}

// "Week 3 of 8", "Starts Tue 3 Nov", "Ended Tue 17 Nov"
export function phaseLabel({ phase, week, weeks, start, last, timeZone }) {
  if (phase === 'running') return `Week ${week} of ${weeks}`
  if (phase === 'upcoming') return `Starts ${dayLabel(start, timeZone)}`
  return `Ended ${dayLabel(last, timeZone)}`
}

// The cohort the student is in (or, with ?cohort=upcoming, the next one that hasn't started).
export function studentRun(product, opts) {
  const runs = cohortRuns(product, opts)
  if (cohortPreview() === 'upcoming') return runs.find((r) => r.phase === 'upcoming') || runs[0]
  return runs.find((r) => r.id === cohortEnrolments[product.slug]) || null
}

// What the sales page and checkout offer: open cohorts, the one new buyers join, and whether
// enrolment is closed altogether (every upcoming cohort full and the school keeps a waitlist).
export function cohortSale(product, opts) {
  const c = product.cohort || {}
  const runs = cohortRuns(product, opts)
  const upcoming = runs.filter((r) => r.phase === 'upcoming')
  const open = upcoming.filter((r) => r.open)
  const whenFull = cohortPreview() === 'waitlist' ? 'waitlist' : c.whenFull
  const firstFull = upcoming.find((r) => r.full && !r.closed)
  // With "Close enrollment and keep a waitlist", a full cohort doesn't pass buyers on to the next one.
  const offered = whenFull === 'waitlist' && firstFull && (!open[0] || firstFull.start < open[0].start) ? [] : open
  let closedReason = null
  if (!offered.length) closedReason = upcoming.some((r) => r.full) ? 'sold-out' : 'enrolment-closed'
  return { runs, upcoming, open: offered, next: offered[0] || null, firstFull, whenFull, routing: c.routing, closedReason }
}

// "4 of 12 places left", "1 place left", "Full"
export const placesLabel = (run) => {
  if (run.seatsLeft === null) return 'Places available'
  if (run.full) return 'Full'
  return `${plural(run.seatsLeft, 'place')} left`
}

/* ---------- Inside the player ---------- */

const flat = (product) => product.curriculum.flatMap((ch, ci) => ch.lessons.map((l) => ({ ...l, chapterIndex: ci })))

// Weeks before this chapter (bonus chapters don't count).
const weekOf = (product, chapterIndex) => product.curriculum.slice(0, chapterIndex).filter((x) => !x.bonus).length

// When a chapter opens for a cohort. Bonus chapters ignore drip (open on enrolment).
export function chapterOpensAt(product, run, chapterIndex) {
  const c = product.cohort
  const ch = product.curriculum[chapterIndex]
  if (!ch || ch.bonus) return null
  if (c.release === 'all') return run.startDay
  if (c.release === 'dates' && ch.opens) return zoned(ch.opens, '00:00', c.timeZone)
  return zoned(addDays(run.startDate, 7 * weekOf(product, chapterIndex)), '00:00', c.timeZone)
}

// Live sessions with their times and state: scheduled | soon | live | processing | replay.
// Each falls on its week's day at the cohort's time (lesson.liveAt, an ISO time, overrides it).
export function liveSessions(product, run, { now = Date.now(), preview = sessionPreview() } = {}) {
  if (!run) return []
  const c = product.cohort
  const list = flat(product).filter((l) => l.type === 'live').map((l) => {
    const start = l.liveAt ? new Date(l.liveAt) : zoned(addDays(run.startDate, 7 * weekOf(product, l.chapterIndex)), c.time, c.timeZone)
    return { lesson: l, start, end: new Date(start.getTime() + c.sessionMinutes * MIN) }
  })
  // Preview: move the next session close to now.
  if (preview === 'soon' || preview === 'live') {
    const base = previewAnchor(product.slug)
    const next = list.find((s) => s.end.getTime() > base)
    if (next) {
      const at = preview === 'soon' ? base + 10 * MIN : base - 5 * MIN
      next.start = new Date(Math.floor(at / MIN) * MIN)
      next.end = new Date(next.start.getTime() + c.sessionMinutes * MIN)
    }
  }
  return list.map((s) => ({ ...s, state: sessionState(s, now, c) }))
}

function sessionState({ start, end }, now, c) {
  if (now < start.getTime() - JOIN_WINDOW) return 'scheduled'
  if (now < start.getTime()) return 'soon'
  if (now < end.getTime()) return 'live'
  if (c.recordings && now < end.getTime() + REPLAY_AFTER) return 'processing'
  return 'replay'
}

export const nextSession = (sessions) => sessions.find((s) => ['scheduled', 'soon', 'live'].includes(s.state)) || null
export const canJoin = (s) => s && (s.state === 'soon' || s.state === 'live')

// Cohort-paced drip: { state: 'drip', unlockDate, cohort: true } or null. Live sessions are never
// locked: their page shows when they're scheduled.
export function cohortLock(product, run, lesson) {
  if (!run || lesson.type === 'live') return null
  const ci = product.curriculum.findIndex((ch) => ch.lessons.some((l) => l.id === lesson.id))
  const opens = chapterOpensAt(product, run, ci)
  if (!opens || opens.getTime() <= Date.now()) return null
  return { state: 'drip', unlockDate: dayLabel(opens, product.cohort.timeZone), opensAt: opens, cohort: true }
}

// The line under a live lesson in a list: "Tue 20 Oct, 19:00 BST · 75 min", "Live now", "Replay · 75 min".
export function sessionMeta(session, duration) {
  if (!session) return duration
  switch (session.state) {
    case 'live': return 'Live now'
    case 'soon': return `Starts at ${timeLabel(session.start)}`
    case 'processing': return 'Replay coming within a day'
    case 'replay': return `Replay · ${duration}`
    default: return `${whenLabel(session.start)} · ${duration}`
  }
}

// On the sales page: live lessons dated for the next cohort open for enrolment (or the student's own).
export function salesLessonMeta(product, lesson, owned) {
  if (lesson.type !== 'live' || !product.cohort?.runs) return lesson.duration
  const { next, upcoming } = cohortSale(product)
  const run = (owned && studentRun(product)) || next || upcoming[0]
  if (!run) return lesson.duration
  const s = liveSessions(product, run, { preview: null }).find((x) => x.lesson.id === lesson.id)
  return s ? `${whenLabel(s.start)} · ${lesson.duration}` : lesson.duration
}

// Where "Join live session" goes (the meeting link the school sets per cohort).
export const joinHref = (product) => product.cohort?.joinUrl || '#join'

// The cohort product in a checkout's items that needs a picker, or null.
export function cohortToChoose(items) {
  const product = items.map((i) => getProduct(i.productId)).find((p) => p?.cohort?.runs && p.cohort.routing === 'choose')
  if (!product) return null
  const sale = cohortSale(product)
  return sale.upcoming.length ? { product, ...sale } : null
}
