// Media library logic shared by the sales page and the library page: episode numbering and groups,
// the release schedule (admin → Media library → Drip), the expiration date and the viewer's place.
// Pure functions; "now" is passed in so the pages and tests agree on one moment.
import { parseDuration } from '@/lib/analytics/index.js'
import { libraryProgress } from '@/data/media-library.js'

const DAY = 86400000
export const TIME_ZONE = 'Europe/London'
const ZONE_LABEL = 'UK time'

const fmt = (opts) => new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, ...opts })
const dayFmt = fmt({ weekday: 'short', day: 'numeric', month: 'short' })
const dayYearFmt = fmt({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const timeFmt = fmt({ hour: '2-digit', minute: '2-digit', hour12: false })
const weekdayLong = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }

// "Mon 27 Oct", with the year when it isn't this year (or always, with `year`).
export function shortDate(date, now = new Date(), { year } = {}) {
  const d = new Date(date)
  const sameYear = fmt({ year: 'numeric' }).format(d) === fmt({ year: 'numeric' }).format(now)
  return (year || !sameYear ? dayYearFmt : dayFmt).format(d).replace(/,/g, '').replace('Sept', 'Sep')
}
export const clock = (date) => timeFmt.format(new Date(date))

// "04:30" or "1:02:03" → seconds; seconds → "4:30" / "1:02:03".
export const seconds = (duration) => parseDuration(duration) || 0
export function timecode(total) {
  const s = Math.max(0, Math.round(total || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}
// "32 min", "1 h 05 min" for lists.
export function minutes(duration) {
  const s = seconds(duration)
  if (!s) return duration || ''
  const m = Math.round(s / 60)
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${Math.max(1, m)} min`
}

// Calendar maths in the school's time zone, so a release keeps its clock time across summer time.
const ymd = fmt({ year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
function zoneParts(date) {
  const p = Object.fromEntries(ymd.formatToParts(date).map((x) => [x.type, x.value]))
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, min: +p.minute, s: +p.second }
}
const offsetOf = (date) => {
  const p = zoneParts(date)
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(date.getTime() / 1000) * 1000
}
const dayNumber = (date) => { const p = zoneParts(date); return Date.UTC(p.y, p.m - 1, p.d) / DAY }
function addUnits(date, n, unit) {
  const d = new Date(date)
  if (unit === 'month') {
    const p = zoneParts(d)
    const wall = Date.UTC(p.y, p.m - 1 + n, p.d, p.h, p.min, p.s)
    return new Date(wall - offsetOf(new Date(wall)))
  }
  const t = new Date(d.getTime() + n * (unit === 'week' ? 7 : 1) * DAY)
  return new Date(t.getTime() + offsetOf(d) - offsetOf(t))
}

export const FORMAT_LABEL = { video: 'Video library', audio: 'Audio library', podcast: 'Podcast' }
export const formatOf = (product) => product.mediaLibrary?.format || 'audio'
export const isVideo = (product) => formatOf(product) === 'video'

// Episodes in order, numbered (dividers don't count), each with its group title.
// Returns { groups: [{ title, episodes }], episodes }.
export function libraryEpisodes(product) {
  const rows = product.mediaLibrary?.episodes || []
  const groups = []
  const episodes = []
  let group = null
  rows.forEach((row, i) => {
    if (row.divider) { group = { title: row.divider, episodes: [] }; groups.push(group); return }
    if (!group) { group = { title: null, episodes: [] }; groups.push(group) }
    const ep = {
      ...row,
      id: row.id || `episode-${i}`,
      n: episodes.length + 1,
      tag: row.tag === 'Bonus' ? 'Bonus' : 'Main',
      free: Boolean(row.free || row.tag === 'Free'),
      seconds: seconds(row.duration),
      group: group.title,
    }
    group.episodes.push(ep)
    episodes.push(ep)
  })
  return { groups: groups.filter((g) => g.episodes.length), episodes }
}

// The viewer's purchase moment and saved place. Visitors are treated as joining now.
export function viewerPlace(product, { owned, now = new Date() } = {}) {
  const p = (owned && libraryProgress[product.slug]) || {}
  const joinedAt = owned ? addUnits(now, -(p.joinedDaysAgo || 0), 'day') : now
  return { joinedAt, last: p.last || null, position: p.position || 0, done: p.done || [] }
}

// When an episode unlocks for this viewer: null when it's open now, else { at, relative, label, hint }.
// Free episodes never wait ("Available for free" stays free whatever the drip says).
export function unlockOf(product, ep, { joinedAt, now = new Date(), owned = false } = {}) {
  const release = product.mediaLibrary?.release || { mode: 'immediate' }
  if (ep.free || release.mode === 'immediate') return null

  let at = null
  let relative = false
  if (release.mode === 'days') {
    at = addUnits(joinedAt, ep.days || 0, 'day')
    relative = true
  } else if (release.mode === 'date') {
    at = new Date(ep.unlocksAt || release.date)
  } else if (release.mode === 'recurring') {
    const index = libraryEpisodes(product).episodes.findIndex((e) => e.id === ep.id)
    const anchor = release.anchor === 'enroll' ? joinedAt : new Date(release.start)
    at = addUnits(anchor, Math.max(0, index) * (release.every || 1), release.unit || 'week')
    relative = release.anchor === 'enroll'
  }
  if (!at || at <= now) return null

  // Before buying, relative schedules are described from the day you join.
  if (relative && !owned) {
    const days = Math.round((at - joinedAt) / DAY)
    if (days <= 0) return null
    const label = days === 1 ? 'Unlocks the day after you join' : `Unlocks ${days} days after you join`
    return { at, relative, label, short: days === 1 ? 'Day after you join' : `${days} days after you join` }
  }
  const days = dayNumber(at) - dayNumber(now)
  const date = shortDate(at, now)
  if (relative) {
    const label = days <= 0 ? `Unlocks today at ${clock(at)}` : days === 1 ? 'Unlocks tomorrow' : `Unlocks in ${days} days`
    return { at, relative, label, short: label.replace('Unlocks ', ''), hint: `${date}, ${clock(at)} (${ZONE_LABEL})`, full: `${label}, on ${date} at ${clock(at)} (${ZONE_LABEL})` }
  }
  const label = days <= 0 ? `Unlocks today at ${clock(at)}` : `Unlocks on ${date}`
  return { at, relative, label, short: days <= 0 ? `Today, ${clock(at)}` : date, hint: `${date}, ${clock(at)} (${ZONE_LABEL})`, full: days <= 0 ? `${label} (${ZONE_LABEL})` : `${label} at ${clock(at)} (${ZONE_LABEL})` }
}

// When a released episode came out, for podcasts and dated libraries ("Mon 6 Oct").
export function releasedOn(product, ep, now = new Date()) {
  const release = product.mediaLibrary?.release || {}
  if (release.mode === 'date' && !ep.free) {
    const at = new Date(ep.unlocksAt || release.date)
    return at <= now ? shortDate(at, now) : null
  }
  if (release.mode === 'recurring' && release.anchor === 'date') {
    const index = libraryEpisodes(product).episodes.findIndex((e) => e.id === ep.id)
    const at = addUnits(new Date(release.start), Math.max(0, index) * (release.every || 1), release.unit || 'week')
    return at <= now ? shortDate(at, now) : null
  }
  return null
}

// One line about the release schedule, or null when everything is there at once.
export function releaseSummary(product, now = new Date()) {
  const r = product.mediaLibrary?.release || { mode: 'immediate' }
  const word = itemWord(product)
  if (r.mode === 'days') return `A new ${word} unlocks each day after you join, so you can take them one at a time.`
  if (r.mode === 'date') {
    const eps = libraryEpisodes(product).episodes.filter((e) => !e.free)
    const dates = [...new Set(eps.map((e) => e.unlocksAt || r.date))]
    if (dates.length > 1) return `Each ${word} opens on its own date, the same for everyone.`
    return `Everything opens on ${shortDate(r.date, now)} at ${clock(r.date)} (${ZONE_LABEL}), the same for everyone.`
  }
  if (r.mode === 'recurring') {
    const every = r.every > 1 ? `every ${r.every} ${r.unit}s` : `every ${r.unit}`
    if (r.unit === 'week' && r.weekday && r.anchor === 'date') return `New ${word} every ${weekdayLong[r.weekday]}${r.every > 1 ? `, every ${r.every} weeks` : ''}.`
    if (r.anchor === 'enroll') return `One ${word} unlocks ${every} from the day you join.`
    return `One ${word} unlocks ${every}, the same dates for everyone.`
  }
  return null
}

// Short release line for the facts list: "Every Monday", "One a day after you join", "All at once".
export function releaseShort(product) {
  const r = product.mediaLibrary?.release || { mode: 'immediate' }
  if (r.mode === 'days') return 'One a day after you join'
  if (r.mode === 'date') return 'On set dates'
  if (r.mode === 'recurring') {
    if (r.unit === 'week' && r.weekday) return `Every ${weekdayLong[r.weekday]}`
    return r.unit === 'day' ? 'One a day' : `One every ${r.unit}`
  }
  return 'All at once'
}

// The expiration date: { at, passed, label }.
export function expiryOf(product, now = new Date()) {
  const raw = product.mediaLibrary?.expiresAt
  if (!raw) return null
  const at = new Date(raw)
  const date = shortDate(at, now, { year: true })
  const passed = at <= now
  return { at, passed, date, label: passed ? `This library closed on ${date}` : `Available until ${date}` }
}

export const canDownload = (product, ep) => Boolean(ep.download ?? product.mediaLibrary?.downloads)

// Everything a page needs to list a library for this viewer: groups (by divider; a podcast lists
// what's coming up, then the latest episodes first), episodes with lock, release date and progress.
// `owned`: the viewer can open the library (bought, in their plan, or free and signed in).
export function buildLibrary(product, { owned = false, now = new Date() } = {}) {
  const place = viewerPlace(product, { owned, now })
  const { groups, episodes } = libraryEpisodes(product)
  const withState = (ep) => {
    const lock = unlockOf(product, ep, { joinedAt: place.joinedAt, now, owned })
    return {
      ...ep,
      lock,
      released: lock ? null : releasedOn(product, ep, now),
      done: place.done.includes(ep.id),
      // Sales page: free episodes play for everyone; the rest need the library.
      playable: !lock && (owned || ep.free),
      download: owned && !lock && canDownload(product, ep),
    }
  }
  const all = episodes.map(withState)
  const byId = new Map(all.map((e) => [e.id, e]))
  let shown = groups.map((g) => ({ title: g.title, episodes: g.episodes.map((e) => byId.get(e.id)) }))
  if (formatOf(product) === 'podcast') {
    const upcoming = all.filter((e) => e.lock)
    const out = all.filter((e) => !e.lock).reverse()
    shown = [
      upcoming.length && { title: 'Coming up', episodes: upcoming },
      out.length && { title: upcoming.length ? 'Latest episodes' : 'All episodes', episodes: out },
    ].filter(Boolean)
  }
  const total = all.reduce((n, e) => n + e.seconds, 0)
  return { place, groups: shown, episodes: all, total, open: all.filter((e) => !e.lock), expiry: expiryOf(product, now) }
}

// The word for one item, per format: "episode", "class", "session".
export function itemWord(product, plural = false) {
  const f = formatOf(product)
  const w = product.mediaLibrary?.noun || (f === 'podcast' ? 'episode' : f === 'video' ? 'class' : 'session')
  return plural ? (/(s|ch|sh)$/.test(w) ? w + 'es' : w + 's') : w
}
export const itemLabel = (product, ep) => `${itemWord(product).replace(/^./, (c) => c.toUpperCase())} ${ep.n}`

// Total running time: "6 h 55 min".
export function totalTime(totalSeconds) {
  const m = Math.round(totalSeconds / 60)
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`
}

// True when the library's expiration date has passed (closed to anyone without access).
export const libraryClosed = (product, now = new Date()) => Boolean(expiryOf(product, now)?.passed)

// The line under the library page's title.
const INTRO = {
  video: 'Roll out a mat, press play and go at your own pace. We’ll keep your place for next time.',
  audio: 'Find a comfortable spot, put on headphones and press play. The player stays with you while you browse.',
  podcast: 'Listen here, or follow along in your own podcast app with your private feed.',
}
export const libraryIntro = (product) => INTRO[formatOf(product)]
