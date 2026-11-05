// "Add to calendar" for events: the project's calendar types (Google, Apple, Outlook) as links.
// Google Calendar and Outlook.com / Office 365 open a prefilled event; Apple Calendar gets an
// .ics file. Times are sent in UTC, so every calendar shows them in its own zone.
import { occurrences, nextOccurrence, eventZone, datesSummary } from './dates.js'
import { whereLine, JOIN_EARLY_MINUTES } from './eventState.js'

const DAY = 86400000
const utcStamp = (t) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') // 20261021T180000Z
const isoUtc = (t) => new Date(t).toISOString().replace(/\.\d{3}/, '') // 2026-10-21T18:00:00Z
const origin = () => (typeof window !== 'undefined' ? window.location.origin : '')
// 20261021T190000 as wall-clock time in a zone (for repeating web calendar links).
function wallStamp(t, timeZone) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(t)).map((x) => [x.type, x.value]))
  return `${p.year}${p.month}${p.day}T${p.hour}${p.minute}${p.second}`
}

// The blocks to put in a calendar: { title, blocks: [{ start, end, label? }], rule, zone, location, description }.
// dates: per-date tickets (organiser date keys). Recurring events with ongoing access or a term
// pass get every upcoming date; multi-day events get one block per day. The .ics file lists each
// block in UTC; web calendars get the first block plus a repeat rule in the organiser's zone, so
// the wall-clock time holds across daylight-saving changes.
export function calendarEvent(product, { registered = true, dates, now = Date.now() } = {}) {
  const ev = product.event
  if (!ev?.startsAt) return null
  const all = occurrences(ev)
  let blocks
  let rule = null
  if (dates?.length) blocks = all.filter((o) => dates.includes(o.key) && o.end > now)
  else if (ev.days?.length) blocks = all
  else if (ev.recurring) {
    blocks = all.filter((o) => o.end > now)
    if (blocks.length > 1) rule = `FREQ=${ev.recurring.unit === 'day' ? 'DAILY' : 'WEEKLY'};INTERVAL=${ev.recurring.every || 1};COUNT=${blocks.length}`
  } else blocks = [nextOccurrence(ev, now) || all[0]]
  if (!blocks.length) blocks = [all[all.length - 1]]

  const virtual = ev.format === 'virtual'
  const ticket = `${origin()}/event/${product.slug}/open`
  const location = virtual ? ev.joinUrl : whereLine(ev, { registered })
  const description = [
    product.summary,
    virtual ? `Join: ${ev.joinUrl} (the link opens ${JOIN_EARLY_MINUTES} minutes before the start)` : `Venue: ${location}`,
    dates?.length > 1 && `Your dates: ${datesSummary(blocks)}`,
    `Your ticket: ${ticket}`,
  ].filter(Boolean).join('\n\n')
  return { title: product.title, blocks, rule, zone: eventZone(ev), location, description, slug: product.slug }
}

// One link per block is too many for a menu, so web calendars get the first block; when every
// block is the same time on consecutive days (a weekend workshop) they get a daily rule instead.
function webRule(cal) {
  if (cal.rule) return cal.rule
  const [a, ...rest] = cal.blocks
  if (!rest.length) return null
  const daily = rest.every((b, i) => b.start - cal.blocks[i].start === DAY && b.end - b.start === a.end - a.start)
  return daily ? `FREQ=DAILY;COUNT=${cal.blocks.length}` : null
}

export function googleHref(cal) {
  const [b] = cal.blocks
  const rule = webRule(cal)
  const q = new URLSearchParams({
    action: 'TEMPLATE', text: cal.title,
    dates: rule ? `${wallStamp(b.start, cal.zone)}/${wallStamp(b.end, cal.zone)}` : `${utcStamp(b.start)}/${utcStamp(b.end)}`,
    details: cal.description, location: cal.location || '',
  })
  if (rule) { q.set('ctz', cal.zone); q.set('recur', `RRULE:${rule}`) }
  return `https://calendar.google.com/calendar/render?${q}`
}

// Outlook.com (personal) and Office 365 (work or school) share the compose deep link.
function outlookHref(host, cal) {
  const [b] = cal.blocks
  const q = new URLSearchParams({
    path: '/calendar/action/compose', rru: 'addevent', subject: cal.title,
    startdt: isoUtc(b.start), enddt: isoUtc(b.end), body: cal.description, location: cal.location || '',
  })
  return `https://${host}/calendar/0/action/compose?${q}`
}
export const outlookComHref = (cal) => outlookHref('outlook.live.com', cal)
export const office365Href = (cal) => outlookHref('outlook.office.com', cal)

// iCalendar text: escape , ; \ and newlines, fold lines at 75 octets.
const esc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n')
function fold(line) {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const out = []
  let current = ''
  let size = 0
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length
    if (size + n > (out.length ? 74 : 75)) { out.push(current); current = ''; size = 0 }
    current += ch
    size += n
  }
  out.push(current)
  return out.join('\r\n ')
}

export function icsText(cal, now = Date.now()) {
  const events = cal.blocks.map((b, i) => [
    'BEGIN:VEVENT',
    `UID:${cal.slug}-${b.key || i + 1}@halvera.example`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(b.start)}`,
    `DTEND:${utcStamp(b.end)}`,
    `SUMMARY:${esc(b.label ? `${cal.title} (${b.label})` : cal.title)}`,
    `LOCATION:${esc(cal.location)}`,
    `DESCRIPTION:${esc(cal.description)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(cal.title)}`, 'TRIGGER:-PT30M', 'END:VALARM',
    'END:VEVENT',
  ])
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Halvera//Events//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ...events.flat(), 'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n'
}

export const icsHref = (cal) => `data:text/calendar;charset=utf-8,${encodeURIComponent(icsText(cal))}`

// The menu: [{ id, label, href, download?, external? }]
export function calendarLinks(cal) {
  if (!cal) return []
  const ics = icsHref(cal)
  const file = `${cal.slug}.ics`
  return [
    { id: 'google', label: 'Google Calendar', href: googleHref(cal), external: true },
    { id: 'apple', label: 'Apple Calendar (.ics)', href: ics, download: file },
    { id: 'outlook', label: 'Outlook.com', href: outlookComHref(cal), external: true },
    { id: 'office', label: 'Office 365 (Outlook web)', href: office365Href(cal), external: true },
  ]
}
