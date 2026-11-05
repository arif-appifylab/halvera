// Meetup poll: registrants vote on the proposed times ("Votes per user": one, or any slot).
import { useId } from 'react'
import { cx, Badge, Checkbox, RadioCard } from '@/design-system'
import { whenIn } from './time.js'
import { pollOptions } from './slots.js'

const votesWord = (n) => `${n} vote${n === 1 ? '' : 's'}`

export default function PollPicker({ poll, zone, value = [], onChange, error }) {
  const name = useId()
  const options = pollOptions(poll)
  const count = (o) => o.votes + (value.includes(o.id) ? 1 : 0)
  const top = Math.max(...options.map(count))
  const many = poll.votesPer === 'many'
  const toggle = (id) => onChange(many ? (value.includes(id) ? value.filter((x) => x !== id) : [...value, id]) : [id])

  return (
    <fieldset className={cx('bk-fieldset', error && 'has-error')}>
      <legend className="sg-label">{many ? 'Which times could you make?' : 'Which time suits you best?'}</legend>
      <p className="sg-field-msg">{many ? 'Tick every time that works. The time with the most votes is booked.' : 'The time with the most votes is booked.'}</p>
      <ul className="bk-poll">
        {options.map((o) => {
          const n = count(o)
          const on = value.includes(o.id)
          const label = whenIn(o.utc, zone)
          const desc = `${votesWord(n)}${on ? ', including yours' : ''}`
          return (
            <li key={o.id} className={cx('bk-poll-opt', on && 'is-on')}>
              {many ? (
                <Checkbox label={label} description={desc} checked={on} onChange={() => toggle(o.id)} />
              ) : (
                <RadioCard name={name} value={o.id} checked={on} onChange={() => toggle(o.id)} title={label} description={desc} />
              )}
              {n === top && n > 0 && <Badge tone="primary">Leading</Badge>}
              <span className="bk-poll-bar" aria-hidden="true"><span style={{ inlineSize: `${Math.round((n / Math.max(top, 1)) * 100)}%` }} /></span>
            </li>
          )
        })}
      </ul>
      {error && <p className="sg-field-msg sg-field-error" role="alert">{error}</p>}
    </fieldset>
  )
}
