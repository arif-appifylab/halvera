// Bookings → Calendar: a month grid (Monday first, the visitor's time zone) with each booking on its
// day. Each booking in a day is a button that opens its details (the same card as the list view);
// clicking a day picks it and scrolls to its bookings, listed below the grid. Arrow keys move between
// days. On phones the cells show dots, and the list below the grid is the way in.
import { useRef } from 'react'
import { Button, IconButton } from '@/design-system'
import { dateKey, localTime } from '@/components/product/time.js'
import { monthOf, longDay } from './dates.js'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const pad = (n) => String(n).padStart(2, '0')
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const monthName = (y, m) => new Date(y, m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
const MAX_IN_CELL = 2

export default function BookingCalendar({ bookings, month, onMonth, selected, onSelect, onOpen, todayKey, now }) {
  const gridRef = useRef(null)
  const byDay = new Map()
  for (const b of bookings) {
    const k = dateKey(b.start)
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k).push(b)
  }

  const { y, m } = month
  const first = new Date(y, m, 1)
  const lead = (first.getDay() + 6) % 7 // Monday first
  const days = new Date(y, m + 1, 0).getDate()
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)

  const shift = (delta) => {
    const d = new Date(y, m + delta, 1)
    onMonth({ y: d.getFullYear(), m: d.getMonth() })
  }

  const onKey = (e, day) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (!step) return
    e.preventDefault()
    const d = new Date(y, m, day + step)
    const key = keyOf(d.getFullYear(), d.getMonth(), d.getDate())
    if (d.getMonth() !== m) onMonth({ y: d.getFullYear(), m: d.getMonth() })
    onSelect(key)
    requestAnimationFrame(() => gridRef.current?.querySelector(`[data-key="${key}"]`)?.focus())
  }

  return (
    <div className="bkd-cal">
      <div className="bkd-cal-head">
        <h2 className="t-heading-4" aria-live="polite">{monthName(y, m)}</h2>
        <div className="pg-row">
          <Button size="sm" variant="ghost" onClick={() => { onMonth(monthOf(todayKey)); onSelect(todayKey) }}>Today</Button>
          <IconButton icon="chevron-left" label="Previous month" onClick={() => shift(-1)} />
          <IconButton icon="chevron-right" label="Next month" onClick={() => shift(1)} />
        </div>
      </div>
      <div className="bkd-cal-grid" role="grid" aria-label={monthName(y, m)} ref={gridRef}>
        <div role="row" className="bkd-cal-row">
          {WEEKDAYS.map((w) => <div key={w} role="columnheader" className="bkd-cal-wd">{w}</div>)}
        </div>
        {Array.from({ length: cells.length / 7 }, (_, r) => (
          <div role="row" className="bkd-cal-row" key={r}>
            {cells.slice(r * 7, r * 7 + 7).map((day, i) => {
              if (!day) return <div key={`e${i}`} role="gridcell" className="bkd-cal-cell is-empty" />
              const key = keyOf(y, m, day)
              const list = byDay.get(key) || []
              const isSel = key === selected
              const label = `${longDay(key)}${list.length ? `, ${list.length} ${list.length === 1 ? 'booking' : 'bookings'}` : ''}`
              return (
                <div
                  key={key} role="gridcell" aria-selected={isSel}
                  className={'bkd-cal-cell' + (isSel ? ' is-selected' : '') + (key === todayKey ? ' is-today' : '') + (key < todayKey ? ' is-past' : '')}
                  onClick={() => onSelect(key, true)}
                >
                  <button type="button" data-key={key} tabIndex={isSel ? 0 : -1} aria-label={label} className="bkd-cal-day" onClick={(e) => { e.stopPropagation(); onSelect(key, true) }} onKeyDown={(e) => onKey(e, day)}>
                    {day}
                  </button>
                  <span className="bkd-cal-items">
                    {list.slice(0, MAX_IN_CELL).map((b) => (
                      <button
                        key={b.id} type="button"
                        className={`bkd-cal-item is-${b.kind}${b.end < now ? ' is-done' : ''}${b.status === 'Cancelled' ? ' is-cancelled' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onOpen(b) }}
                        aria-label={`${b.title}, ${localTime(b.start)}. Open details`}
                      >
                        <span className="bkd-cal-time">{localTime(b.start)}</span> {b.title}
                      </button>
                    ))}
                    {list.length > MAX_IN_CELL && (
                      <button type="button" className="bkd-cal-more" onClick={(e) => { e.stopPropagation(); onSelect(key, true) }}>+{list.length - MAX_IN_CELL} more</button>
                    )}
                  </span>
                  {list.length > 0 && <span className="bkd-cal-dots" aria-hidden="true">{list.slice(0, 3).map((b) => <i key={b.id} className={`is-${b.kind}`} />)}</span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <p className="bkd-cal-legend t-caption t-muted">
        <span><i className="is-appointment" aria-hidden="true" /> Appointments</span>
        <span><i className="is-event" aria-hidden="true" /> Events</span>
        <span>Choose a booking to see its details.</span>
      </p>
    </div>
  )
}
