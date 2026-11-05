// Time zones and calendar dates for the booking page.
// Slots are stored as wall-clock times in the practitioner's zone; we turn them into instants
// (ms since epoch) and format them in whichever zone the visitor chooses. Plain calendar dates
// are 'YYYY-MM-DD' keys and are handled in UTC so no zone can shift them.

const formatters = new Map()
function formatter(zone, opts) {
  const key = zone + JSON.stringify(opts)
  if (!formatters.has(key)) formatters.set(key, new Intl.DateTimeFormat('en-GB', { timeZone: zone, ...opts }))
  return formatters.get(key)
}

const pad = (n) => String(n).padStart(2, '0')

export function isValidZone(zone) {
  if (!zone) return false
  try { new Intl.DateTimeFormat('en-GB', { timeZone: zone }); return true } catch { return false }
}

export function detectZone() {
  try {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone
    return isValidZone(z) ? z : 'UTC'
  } catch { return 'UTC' }
}

// Wall-clock parts of an instant in a zone.
export function partsIn(ms, zone) {
  const out = {}
  formatter(zone, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(ms))
    .forEach((p) => { if (p.type !== 'literal') out[p.type] = Number(p.value) })
  if (out.hour === 24) out.hour = 0
  return out
}

// Minutes the zone is ahead of UTC at that instant.
export function offsetMinutes(ms, zone) {
  const p = partsIn(ms, zone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
  return Math.round((asUtc - Math.floor(ms / 60000) * 60000) / 60000)
}

// '2026-10-21' + '10:30' in Europe/London → instant.
export function zonedToUtc(date, time, zone) {
  const [y, m, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, h, mi)
  const first = offsetMinutes(guess, zone)
  let ms = guess - first * 60000
  const second = offsetMinutes(ms, zone)
  if (second !== first) ms = guess - second * 60000
  return ms
}

export function offsetLabel(ms, zone) {
  const off = offsetMinutes(ms, zone)
  const sign = off < 0 ? '−' : '+'
  const abs = Math.abs(off)
  return `UTC${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

// "UTC+01:00 Europe/London"
export const zoneLabel = (zone, ms) => `${offsetLabel(ms, zone)} ${zone}`

export function dateKeyIn(ms, zone) {
  const p = partsIn(ms, zone)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

export function timeIn(ms, zone) {
  const p = partsIn(ms, zone)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

// "Tue 21 Oct, 10:30"
export function whenIn(ms, zone) {
  return `${keyLabel(dateKeyIn(ms, zone))}, ${timeIn(ms, zone)}`
}

/* ---------- plain calendar dates ---------- */

const keyToUtc = (key) => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d, 12) }
const utcKey = (ms) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` }

export const addDays = (key, n) => utcKey(keyToUtc(key) + n * 86400000)
export const weekdayOf = (key) => new Date(keyToUtc(key)).getUTCDay() // 0 = Sunday
export const monthOf = (key) => key.slice(0, 7)
export const dayOf = (key) => Number(key.slice(8, 10))
export function addMonths(month, n) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}
export const daysInMonth = (month) => { const [y, m] = month.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate() }

const fmtKey = (key, opts) => formatter('UTC', opts).format(new Date(keyToUtc(key)))
export const keyLabel = (key) => fmtKey(key, { weekday: 'short', day: 'numeric', month: 'short' }) // Tue 21 Oct
export const keyLong = (key) => fmtKey(key, { weekday: 'long', day: 'numeric', month: 'long' }) // Tuesday 21 October
export const monthLabel = (month) => fmtKey(month + '-01', { month: 'long', year: 'numeric' }) // October 2026
export const weekdayName = (wd, style = 'long') => fmtKey(addDays('2026-10-18', wd), { weekday: style }) // 18 Oct 2026 is a Sunday

// Weeks of a month for a grid: arrays of 7 keys (null outside the month).
export function monthWeeks(month, weekStart) {
  const first = month + '-01'
  const lead = (weekdayOf(first) - weekStart + 7) % 7
  const cells = Array.from({ length: lead }, () => null)
  for (let d = 1; d <= daysInMonth(month); d += 1) cells.push(`${month}-${pad(d)}`)
  while (cells.length % 7) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export const startOfWeek = (key, weekStart) => addDays(key, -((weekdayOf(key) - weekStart + 7) % 7))

// First day of the week for the visitor's locale: 0 = Sunday, 1 = Monday, 6 = Saturday.
const SUNDAY_REGIONS = ['US', 'CA', 'MX', 'BR', 'JP', 'KR', 'IL', 'PH', 'IN', 'ZA', 'AU', 'HK', 'TW', 'SA', 'PE', 'CO', 'GT', 'PR']
export function localeWeekStart() {
  try {
    const lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-GB'
    const loc = new Intl.Locale(lang)
    const info = (typeof loc.getWeekInfo === 'function' ? loc.getWeekInfo() : loc.weekInfo)
    if (info && info.firstDay) return info.firstDay % 7
    const region = (loc.maximize && loc.maximize().region) || ''
    return SUNDAY_REGIONS.includes(region) ? 0 : 1
  } catch { return 1 }
}
