import { useEffect, useState } from 'react'

// The current time, refreshed every `every` ms (default 30 s), so live-session states move on
// (scheduled → join window → live → replay) without a reload.
export function useNow(every = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every)
    return () => clearInterval(t)
  }, [every])
  return now
}

const plural = (n, one) => `${n} ${one}${n === 1 ? '' : 's'}`

// "3 days, 4 hours", "4 hours, 12 minutes", "12 minutes", "less than a minute"
export function untilText(ms) {
  if (ms < 60000) return 'less than a minute'
  const days = Math.floor(ms / 864e5)
  const hours = Math.floor((ms % 864e5) / 36e5)
  const mins = Math.floor((ms % 36e5) / 6e4)
  if (days) return hours ? `${plural(days, 'day')}, ${plural(hours, 'hour')}` : plural(days, 'day')
  if (hours) return mins ? `${plural(hours, 'hour')}, ${plural(mins, 'minute')}` : plural(hours, 'hour')
  return plural(mins, 'minute')
}
