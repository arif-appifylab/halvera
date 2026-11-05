// One week of days with previous/next week buttons. Days are tabs that control the times panel.
import { useRef } from 'react'
import { cx, Icon } from '@/design-system'
import { addDays, dayOf, keyLabel, keyLong, weekdayOf, weekdayName } from './time.js'

const rangeLabel = (start) => {
  const end = addDays(start, 6)
  const [a, b] = [keyLabel(start).split(' '), keyLabel(end).split(' ')] // ['Mon', '19', 'Oct']
  const year = end.slice(0, 4)
  return a[2] === b[2] ? `${a[1]}–${b[1]} ${b[2]} ${year}` : `${a[1]} ${a[2]} – ${b[1]} ${b[2]} ${year}`
}

export default function WeekStrip({ start, onWeekChange, days, selected, onSelect, today, minStart, maxStart, panelId }) {
  const listRef = useRef(null)
  const keys = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const enabled = keys.filter((k) => days.has(k))
  const tabKey = enabled.includes(selected) ? selected : enabled[0]

  const onKeyDown = (e) => {
    const i = enabled.indexOf(e.target.getAttribute('data-day'))
    if (i < 0) return
    const rtl = getComputedStyle(listRef.current).direction === 'rtl'
    let next = null
    if (e.key === 'ArrowRight') next = enabled[i + (rtl ? -1 : 1)]
    else if (e.key === 'ArrowLeft') next = enabled[i + (rtl ? 1 : -1)]
    else if (e.key === 'Home') next = enabled[0]
    else if (e.key === 'End') next = enabled[enabled.length - 1]
    else return
    e.preventDefault()
    if (!next) return
    onSelect(next)
    const el = listRef.current.querySelector(`[data-day="${next}"]`)
    if (el) el.focus()
  }

  return (
    <div className="bk-week">
      <div className="bk-cal-head">
        <button type="button" className="bk-cal-nav" onClick={() => onWeekChange(addDays(start, -7))} disabled={start <= minStart} aria-label="Previous week">
          <Icon name="chevron-left" size={20} />
        </button>
        <h3 className="bk-cal-title" aria-live="polite">{rangeLabel(start)}</h3>
        <button type="button" className="bk-cal-nav" onClick={() => onWeekChange(addDays(start, 7))} disabled={start >= maxStart} aria-label="Next week">
          <Icon name="chevron-right" size={20} />
        </button>
      </div>
      <div className="bk-week-days" role="tablist" aria-label="Choose a day" ref={listRef} onKeyDown={onKeyDown}>
        {keys.map((k) => {
          const day = days.get(k)
          const on = k === selected
          const count = day ? day.slots.filter((s) => s.free.length && !s.full && !s.limit).length : 0
          return (
            <button
              key={k}
              type="button"
              role="tab"
              data-day={k}
              aria-selected={on}
              aria-controls={panelId}
              aria-disabled={day ? undefined : 'true'}
              aria-label={`${k === today ? 'Today, ' : ''}${keyLong(k)}, ${!day ? 'no times' : day.status === 'open' ? `${count} time${count === 1 ? '' : 's'}` : 'fully booked'}`}
              tabIndex={k === tabKey ? 0 : -1}
              disabled={!day}
              className={cx('bk-week-day', day && (day.status === 'open' ? 'is-open' : 'is-booked'), on && 'is-selected', k === today && 'is-today')}
              onClick={() => onSelect(k)}
            >
              <span className="bk-week-wd" aria-hidden="true">{weekdayName(weekdayOf(k), 'short')}</span>
              <strong aria-hidden="true">{dayOf(k)}</strong>
              <span className="bk-week-count" aria-hidden="true">{!day ? '–' : day.status === 'open' ? count : 'Full'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
