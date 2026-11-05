// Month grid for choosing a day (WAI-ARIA grid pattern).
// Days with open times are soft primary circles, the selected day is solid primary,
// fully booked days are outlined, and past or unavailable days are muted and skipped by focus.
// Keys: arrows move between bookable days (mirrored in right to left), Home/End go to the
// first/last bookable day of the week, Page Up/Page Down change month, Enter or Space selects.
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cx, Icon } from '@/design-system'
import { addDays, addMonths, keyLong, monthLabel, monthOf, dayOf, monthWeeks, startOfWeek, weekdayName } from './time.js'

const STATUS_WORDS = { open: 'times available', limit: 'fully booked', full: 'fully booked' }

export default function MonthCalendar({ month, onMonthChange, days, selected, onSelect, today, weekStart, minMonth, maxMonth }) {
  const titleId = useId()
  const gridRef = useRef(null)
  const [focusKey, setFocusKey] = useState(null)
  const wantFocus = useRef(false)

  // Every day that can take focus, across the whole booking window, in order.
  const focusable = useMemo(() => [...days.keys()].sort(), [days])
  const canFocus = (key) => days.has(key)
  const weeks = monthWeeks(month, weekStart)
  const headers = Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7)

  const inMonth = (key) => key && monthOf(key) === month
  const tabKey = [focusKey, selected].find((k) => inMonth(k) && canFocus(k))
    || focusable.find((k) => monthOf(k) === month)

  useEffect(() => {
    if (!wantFocus.current || !focusKey) return
    wantFocus.current = false
    const el = gridRef.current && gridRef.current.querySelector(`[data-day="${focusKey}"]`)
    if (el) el.focus()
  }, [focusKey, month])

  const moveTo = (key) => {
    if (!key) return
    wantFocus.current = true
    setFocusKey(key)
    if (monthOf(key) !== month) onMonthChange(monthOf(key))
  }
  const nextFrom = (key, dir) => (dir > 0 ? focusable.find((k) => k > key) : [...focusable].reverse().find((k) => k < key))
  const nearest = (key, dir) => (canFocus(key) ? key : nextFrom(key, dir))

  const onKeyDown = (e) => {
    const key = e.target.getAttribute && e.target.getAttribute('data-day')
    if (!key) return
    const rtl = getComputedStyle(gridRef.current).direction === 'rtl'
    const fwd = rtl ? -1 : 1
    let target = null
    switch (e.key) {
      case 'ArrowRight': target = nextFrom(key, fwd); break
      case 'ArrowLeft': target = nextFrom(key, -fwd); break
      case 'ArrowDown': target = nearest(addDays(key, 7), 1); break
      case 'ArrowUp': target = nearest(addDays(key, -7), -1); break
      case 'Home': { const s = startOfWeek(key, weekStart); target = focusable.find((k) => k >= s && k <= addDays(s, 6)); break }
      case 'End': { const s = startOfWeek(key, weekStart); target = [...focusable].reverse().find((k) => k >= s && k <= addDays(s, 6)); break }
      case 'PageDown': { const m = addMonths(monthOf(key), 1); target = focusable.find((k) => monthOf(k) === m) ; break }
      case 'PageUp': { const m = addMonths(monthOf(key), -1); target = focusable.find((k) => monthOf(k) === m); break }
      default: return
    }
    e.preventDefault()
    moveTo(target)
  }

  const goMonth = (n) => { setFocusKey(null); onMonthChange(addMonths(month, n)) }

  return (
    <div className="bk-cal">
      <div className="bk-cal-head">
        <button type="button" className="bk-cal-nav" onClick={() => goMonth(-1)} disabled={month <= minMonth} aria-label="Previous month">
          <Icon name="chevron-left" size={20} />
        </button>
        <h3 className="bk-cal-title" id={titleId} aria-live="polite">{monthLabel(month)}</h3>
        <button type="button" className="bk-cal-nav" onClick={() => goMonth(1)} disabled={month >= maxMonth} aria-label="Next month">
          <Icon name="chevron-right" size={20} />
        </button>
      </div>

      <table className="bk-cal-grid" role="grid" aria-labelledby={titleId} ref={gridRef} onKeyDown={onKeyDown}>
        <thead>
          <tr>
            {headers.map((wd) => (
              <th key={wd} scope="col" abbr={weekdayName(wd)}>
                <span aria-hidden="true">{weekdayName(wd, 'short').slice(0, 2)}</span>
                <span className="sg-sr">{weekdayName(wd)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((key, di) => {
                if (!key) return <td key={di} role="gridcell" className="bk-cal-cell is-empty" />
                const day = days.get(key)
                const isToday = key === today
                const isSel = key === selected
                if (!day) {
                  return (
                    <td key={key} role="gridcell" aria-disabled="true" className="bk-cal-cell">
                      <span className={cx('bk-cal-day', 'is-off', isToday && 'is-today')}>
                        <span aria-hidden="true">{dayOf(key)}</span>
                        <span className="sg-sr">{isToday ? 'Today, ' : ''}{keyLong(key)}, no times</span>
                      </span>
                    </td>
                  )
                }
                return (
                  <td key={key} role="gridcell" aria-selected={isSel} className="bk-cal-cell">
                    <button
                      type="button"
                      data-day={key}
                      tabIndex={key === tabKey ? 0 : -1}
                      aria-current={isToday ? 'date' : undefined}
                      aria-label={`${isToday ? 'Today, ' : ''}${keyLong(key)}, ${STATUS_WORDS[day.status]}`}
                      className={cx('bk-cal-day', day.status === 'open' ? 'is-open' : 'is-booked', isSel && 'is-selected', isToday && 'is-today')}
                      onClick={() => { setFocusKey(key); onSelect(key) }}
                      onFocus={() => setFocusKey(key)}
                    >
                      {dayOf(key)}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="bk-cal-legend t-caption" aria-hidden="true">
        <li><span className="bk-cal-key is-open" />Open times</li>
        <li><span className="bk-cal-key is-booked" />Fully booked</li>
        <li><span className="bk-cal-key is-selected" />Selected</li>
      </ul>
    </div>
  )
}
