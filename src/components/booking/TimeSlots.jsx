// The times for one day, as a radio group (arrow keys move and choose, like native radios).
import { useRef } from 'react'
import { cx, Icon } from '@/design-system'
import { timeIn, keyLong } from './time.js'
import { slotOpen } from './slots.js'

export default function TimeSlots({ day, dayKey, zone, value, onChange, group, dailyLimit, hostName, waitlistHref, id, emptyText = 'Choose a day to see its times.' }) {
  const ref = useRef(null)
  if (!day) {
    return <p className="bk-times-none t-body-sm" id={id}>{emptyText}</p>
  }
  if (day.status !== 'open') {
    return (
      <div className="bk-times-none" id={id} role="status">
        <Icon name="calendar" size={20} />
        <div className="pg-stack-sm">
          <p className="t-strong">{day.status === 'limit' ? `${keyLong(dayKey)} is fully booked` : `Every session on ${keyLong(dayKey)} is full`}</p>
          <p className="t-body-sm t-muted">
            {day.status === 'limit'
              ? `${hostName} takes up to ${dailyLimit} bookings a day, and this day has reached it. Try another day.`
              : <>Try another day, or <a href={waitlistHref}>join the waitlist</a> and we’ll email you if a place opens up.</>}
          </p>
        </div>
      </div>
    )
  }

  const enabled = day.slots.filter(slotOpen)
  const tabId = enabled.some((s) => s.id === value) ? value : enabled[0] && enabled[0].id

  const onKeyDown = (e) => {
    const i = enabled.findIndex((s) => s.id === e.target.getAttribute('data-slot'))
    if (i < 0) return
    const rtl = getComputedStyle(ref.current).direction === 'rtl'
    const step = { ArrowDown: 1, ArrowUp: -1, ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key]
    if (!step) return
    e.preventDefault()
    const next = enabled[(i + step + enabled.length) % enabled.length]
    onChange(next.id)
    const el = ref.current.querySelector(`[data-slot="${next.id}"]`)
    if (el) el.focus()
  }

  return (
    <div className="bk-times-grid" role="radiogroup" aria-label={`Times on ${keyLong(dayKey)}`} ref={ref} onKeyDown={onKeyDown} id={id}>
      {day.slots.map((s) => {
        const open = slotOpen(s)
        const on = value === s.id
        const note = group ? (s.full ? 'Full' : `${s.spots} spot${s.spots === 1 ? '' : 's'} left`) : null
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            data-slot={s.id}
            aria-checked={on}
            disabled={!open}
            tabIndex={s.id === tabId ? 0 : -1}
            className={cx('bk-time', on && 'is-selected', group && s.spots != null && s.spots <= 3 && !s.full && 'is-few')}
            onClick={() => onChange(s.id)}
          >
            <span className="bk-time-at">{timeIn(s.utc, zone)}</span>
            {note && <small>{note}</small>}
          </button>
        )
      })}
    </div>
  )
}
