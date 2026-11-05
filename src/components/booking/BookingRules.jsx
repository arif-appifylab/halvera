// The booking rules a registrant should know (admin: Limits and buffers, Minimum notice,
// Cancellations and rescheduling, poll settings).
import { Icon } from '@/design-system'
import { practitionerZone } from '@/data/appointments.js'
import { whenIn, zonedToUtc } from './time.js'

const hours = (n) => `${n} hour${n === 1 ? '' : 's'}`

function rulesFor(type, zone) {
  if (type.poll) {
    const closes = zonedToUtc(type.poll.closes.date, type.poll.closes.time, practitionerZone)
    return [
      { icon: 'clock', text: `${type.duration} session` },
      { icon: 'calendar', text: `Voting ends ${whenIn(closes, zone)}` },
      { icon: 'users', text: `Up to ${type.poll.cap} people. If more choose the winning time, the first ${type.poll.cap} to vote get a place and the rest join the waitlist` },
      { icon: 'check', text: type.poll.votesPer === 'many' ? 'Choose as many times as suit you' : 'Choose one time' },
      { icon: 'settings', text: 'You can change your answers until voting ends' },
    ]
  }
  const b = type.buffer || {}
  const buffer = b.before && b.after ? `${b.before} min kept free before and ${b.after} min after`
    : b.after ? `${b.after} min kept free after, so nothing is rushed` : null
  return [
    { icon: 'clock', text: `${type.duration} session${buffer ? `, with ${buffer}` : ''}` },
    type.noticeHours && type.kind !== 'magic-slot' ? { icon: 'bell', text: `Book at least ${hours(type.noticeHours)} ahead` } : null,
    type.format === 'group' ? { icon: 'users', text: `Up to ${type.capacity} people per session. You’ll see the spots left` } : null,
    type.dailyLimit ? { icon: 'calendar', text: `Up to ${type.dailyLimit} bookings a day` } : null,
    type.changeHours ? { icon: 'settings', text: `Reschedule or cancel up to ${hours(type.changeHours)} before` } : null,
  ].filter(Boolean)
}

export default function BookingRules({ type, zone }) {
  return (
    <div className="bk-rules">
      <h3 className="t-heading-4">Good to know</h3>
      <ul className="t-body-sm">
        {rulesFor(type, zone).map((r) => <li key={r.text}><Icon name={r.icon} size={16} />{r.text}</li>)}
      </ul>
    </div>
  )
}
