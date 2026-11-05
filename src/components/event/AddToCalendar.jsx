// "Add to calendar": a button that opens a short list of calendars (Google Calendar, Apple
// Calendar (an .ics file), Outlook.com, Office 365). No separate "Download .ics" for other calendars. A disclosure of links:
// Escape or a click outside closes it, and focus returns to the button. The list opens above the
// button, so a panel that scrolls on its own (the sticky buy panel) can't cut it off; it only opens
// below when there isn't room above.
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { cx, Button, Icon } from '@/design-system'
import { calendarEvent, calendarLinks } from './calendar.js'
import './event.css'

export default function AddToCalendar({ product, dates, registered = true, variant = 'secondary', size = 'md', block = false, align = 'start' }) {
  const [open, setOpen] = useState(false)
  const [below, setBelow] = useState(false)
  const wrap = useRef(null)
  const menu = useRef(null)
  const id = useId()
  const cal = calendarEvent(product, { registered, dates })
  const links = calendarLinks(cal)

  // Room above the button, inside the nearest box that clips (or the window)?
  useLayoutEffect(() => {
    if (!open || !wrap.current || !menu.current) return
    let clip = wrap.current.parentElement
    while (clip && clip !== document.body && getComputedStyle(clip).overflowY === 'visible') clip = clip.parentElement
    const top = clip && clip !== document.body ? Math.max(0, clip.getBoundingClientRect().top) : 0
    setBelow(wrap.current.getBoundingClientRect().top - top < menu.current.offsetHeight + 8)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const away = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false) }
    const key = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      wrap.current?.querySelector('button')?.focus()
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', key) }
  }, [open])

  if (!links.length) return null
  return (
    <div className={cx('ev-cal', block && 'ev-cal-block')} ref={wrap}>
      <Button
        variant={variant} size={size} block={block} iconStart="calendar" iconEnd="chevron-down"
        aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}
      >
        Add to calendar
      </Button>
      <ul ref={menu} id={id} className={cx('ev-cal-menu', align === 'end' && 'ev-cal-menu-end', below && 'is-below')} hidden={!open} aria-label="Choose a calendar">
        {links.map((l) => (
          <li key={l.id}>
            <a
              className="ev-cal-link" href={l.href} download={l.download}
              target={l.external ? '_blank' : undefined} rel={l.external ? 'noopener noreferrer' : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon name={l.download ? 'download' : 'calendar'} size={16} />
              <span>{l.label}</span>
              {l.external && <span className="sg-sr"> (opens in a new tab)</span>}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
