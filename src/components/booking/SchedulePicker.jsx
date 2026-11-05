// Step 1 "Date and time": a Calendar (month grid + available times) or Week (day strip + times)
// view of an appointment's slots, shown in the visitor's chosen time zone.
import { useId, useMemo, useState } from 'react'
import { SegmentedToggle } from '@/design-system'
import { bookingNow, practitionerZone } from '@/data/appointments.js'
import MonthCalendar from './MonthCalendar.jsx'
import WeekStrip from './WeekStrip.jsx'
import TimeSlots from './TimeSlots.jsx'
import TimeZoneBox from './TimeZoneBox.jsx'
import { addDays, dateKeyIn, keyLong, localeWeekStart, monthOf, startOfWeek, zoneLabel, zonedToUtc } from './time.js'
import { slotsByDay } from './slots.js'
import './booking-ui.css'

const VIEWS = [{ value: 'calendar', label: 'Calendar' }, { value: 'week', label: 'Week' }]

export default function SchedulePicker({ slots, zone, onZoneChange, visitorZone, value, onChange, view, onViewChange, group, dailyLimit, hostName, waitlistHref, initialDay }) {
  const timesId = useId()
  const panelId = useId()
  const weekStart = useMemo(() => localeWeekStart(), [])
  const today = dateKeyIn(bookingNow, zone)
  const days = useMemo(() => slotsByDay(slots, zone), [slots, zone])
  const keys = [...days.keys()].sort()
  const valueSlot = slots.find((s) => s.id === value)
  const valueDay = valueSlot ? dateKeyIn(valueSlot.utc, zone) : null
  const firstOpen = keys.find((k) => days.get(k).status === 'open') || keys[0]

  const [dayPick, setDayPick] = useState(initialDay || null)
  const [monthPick, setMonthPick] = useState(null)
  const [weekPick, setWeekPick] = useState(null)

  const day = dayPick && days.has(dayPick) ? dayPick : valueDay || firstOpen
  const month = monthPick || monthOf(day || today)
  const week = weekPick || startOfWeek(day || today, weekStart)
  const last = keys[keys.length - 1] || today

  const pickDay = (key) => {
    setDayPick(key)
    setMonthPick(monthOf(key))
    setWeekPick(startOfWeek(key, weekStart))
  }
  const changeZone = (z) => {
    onZoneChange(z)
    const key = valueSlot ? dateKeyIn(valueSlot.utc, z) : null
    setDayPick(key)
    setMonthPick(null)
    setWeekPick(null)
  }
  const changeWeek = (start) => {
    setWeekPick(start)
    // Move the chosen day into the new week: its first day with open times, else any bookable day.
    const end = addDays(start, 6)
    const inWeek = keys.filter((k) => k >= start && k <= end)
    const first = inWeek.find((k) => days.get(k).status === 'open') || inWeek[0]
    if (first) { setDayPick(first); setMonthPick(monthOf(first)) }
  }

  // Offsets for the time-zone box are taken on the chosen day (London changes clocks on 25 Oct).
  const at = day ? zonedToUtc(day, '12:00', zone) : bookingNow
  // In the week view the chosen day has to be in the week on screen.
  const shownDay = view === 'week' && day && (day < week || day > addDays(week, 6)) ? null : day
  const times = (
    <TimeSlots
      id={timesId}
      day={shownDay ? days.get(shownDay) : null}
      dayKey={shownDay}
      emptyText={view === 'week' ? 'No times this week. Try the next week.' : undefined}
      zone={zone}
      value={value}
      onChange={onChange}
      group={group}
      dailyLimit={dailyLimit}
      hostName={hostName}
      waitlistHref={waitlistHref}
    />
  )
  const tzBox = <TimeZoneBox zone={zone} onZoneChange={changeZone} practitionerZone={practitionerZone} visitorZone={visitorZone} at={at} />

  return (
    <div className="bk-pick">
      <div className="bk-pick-top">
        <SegmentedToggle options={VIEWS} value={view} onChange={onViewChange} label="Show availability as" />
      </div>

      {view === 'calendar' ? (
        <div className="bk-cal-layout">
          <div className="pg-stack">
            <MonthCalendar
              month={month}
              onMonthChange={setMonthPick}
              days={days}
              selected={day}
              onSelect={pickDay}
              today={today}
              weekStart={weekStart}
              minMonth={monthOf(today)}
              maxMonth={monthOf(last)}
            />
            {tzBox}
          </div>
          <section className="bk-times" aria-label="Available times">
            <div className="pg-stack-sm">
              <h3 className="t-heading-4">Available times</h3>
              {day && <p className="t-body-sm t-muted">{keyLong(day)} · {zoneLabel(zone, at)}</p>}
            </div>
            {times}
          </section>
        </div>
      ) : (
        <div className="pg-stack">
          <WeekStrip
            start={week}
            onWeekChange={changeWeek}
            days={days}
            selected={day}
            onSelect={pickDay}
            today={today}
            minStart={startOfWeek(today, weekStart)}
            maxStart={startOfWeek(last, weekStart)}
            panelId={panelId}
          />
          <div role="tabpanel" id={panelId} aria-label={day ? keyLong(day) : 'Times'} className="pg-stack-sm">
            {shownDay && <p className="t-body-sm t-muted">{keyLong(shownDay)} · times in {zoneLabel(zone, at)}</p>}
            {times}
          </div>
          {tzBox}
        </div>
      )}
    </div>
  )
}
