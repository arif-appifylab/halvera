// Event and cohort times. Everything shows in the visitor's own time zone (Intl resolvedOptions)
// in the brand's date style ("Thu 22 Oct, 19:00 BST"), with helpers to name the zone and to
// build wall-clock times in the organiser's zone (so demo dates stay relative to today).

const LOCALE = 'en-GB'
const part = (parts, type) => parts.find((p) => p.type === type)?.value || ''
const formatters = new Map()
const fmt = (locale, options) => {
  const key = locale + JSON.stringify(options)
  if (!formatters.has(key)) formatters.set(key, new Intl.DateTimeFormat(locale, options))
  return formatters.get(key)
}
const toDate = (t) => (t instanceof Date ? t : new Date(t))

// The visitor's IANA zone, e.g. "Europe/London" or "Asia/Dhaka".
export function visitorZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } catch { return 'UTC' }
}
// "Europe/London" → "London", "America/New_York" → "New York"
export const zoneCity = (tz) => (tz || '').split('/').pop().replace(/_/g, ' ')

// The zone's short name at that moment: "BST", "GMT", "CET", "EDT", else "GMT+6".
export function zoneName(t, { timeZone } = {}) {
  const at = toDate(t)
  const get = (locale) => part(fmt(locale, { timeZone, hour: 'numeric', timeZoneName: 'short' }).formatToParts(at), 'timeZoneName')
  const gb = get(LOCALE)
  if (!/^(GMT|UTC)[+−-]/.test(gb)) return gb
  const us = get('en-US')
  return /^[A-Z]{2,5}$/.test(us) ? us : gb
}

// "Thu 22 Oct"
export function localDate(t, { timeZone } = {}) {
  const parts = fmt(LOCALE, { timeZone, weekday: 'short', day: 'numeric', month: 'short' }).formatToParts(toDate(t))
  return `${part(parts, 'weekday')} ${part(parts, 'day')} ${part(parts, 'month')}`
}
// "Wednesday"
export const localWeekday = (t, { timeZone } = {}) => fmt(LOCALE, { timeZone, weekday: 'long' }).format(toDate(t))

// "19:00", or "19:00 BST" with zone
export function localTime(t, { zone = false, timeZone } = {}) {
  const parts = fmt(LOCALE, { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(toDate(t))
  const time = `${part(parts, 'hour')}:${part(parts, 'minute')}`
  return zone ? `${time} ${zoneName(t, { timeZone })}` : time
}

// "19:00–20:15 BST"
export const localRange = (start, end, { timeZone } = {}) => (end
  ? `${localTime(start, { timeZone })}–${localTime(end, { zone: true, timeZone })}`
  : localTime(start, { zone: true, timeZone }))

// "Thu 22 Oct, 19:00 BST"
export const localWhen = (t, { timeZone } = {}) => `${localDate(t, { timeZone })}, ${localTime(t, { zone: true, timeZone })}`

export const YOUR_TIME = '(your time)'

// 'YYYY-MM-DD' for that moment in a zone (the visitor's by default).
export function dateKey(t, { timeZone } = {}) {
  const parts = fmt('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(toDate(t))
  return `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}`
}

// 'Today' / 'Tomorrow' in the visitor's zone, else null.
export function relativeDay(t, now = Date.now()) {
  const key = dateKey(t)
  if (key === dateKey(now)) return 'Today'
  if (key === dateKey(now + 86400000)) return 'Tomorrow'
  return null
}

// How far a zone is ahead of UTC at a moment, in ms.
function zoneOffset(ms, timeZone) {
  const p = fmt('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms))
  const n = (type) => Number(part(p, type))
  return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour') % 24, n('minute'), n('second')) - Math.floor(ms / 1000) * 1000
}

// The UTC ms for a wall-clock date and time in a zone.
function fromWall(y, m, d, h, min, timeZone) {
  const guess = Date.UTC(y, m - 1, d, h, min)
  const first = guess - zoneOffset(guess, timeZone)
  return guess - zoneOffset(first, timeZone)
}

// "hh:mm" in a zone, `days` after today there, as an ISO string. Demo dates use this so every
// event keeps its state (upcoming, live, ended) relative to the real clock.
export function wallTime(days, hhmm, timeZone) {
  const [y, m, d] = dateKey(Date.now(), { timeZone }).split('-').map(Number)
  const [h, min] = hhmm.split(':').map(Number)
  return new Date(fromWall(y, m, d + days, h, min, timeZone)).toISOString()
}

// The same wall-clock time `days` later in a zone (holds across daylight-saving changes).
export function shiftDays(t, days, timeZone) {
  const ms = toDate(t).getTime()
  const local = new Date(ms + zoneOffset(ms, timeZone))
  return fromWall(local.getUTCFullYear(), local.getUTCMonth() + 1, local.getUTCDate() + days, local.getUTCHours(), local.getUTCMinutes(), timeZone)
}

// Days from today (in a zone) to the next given weekday (0 Sunday … 6 Saturday), 1–7.
export function daysUntil(weekday, timeZone) {
  const [y, m, d] = dateKey(Date.now(), { timeZone }).split('-').map(Number)
  const today = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return ((weekday - today + 7) % 7) || 7
}

export const isFuture = (iso) => Boolean(iso) && new Date(iso).getTime() > Date.now()
