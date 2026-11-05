// Changing plan or price, from the Membership tab (Memberships → Groups: "Users can switch plans from
// their account"). Steps:
//   1. Choose   every tier and price in the plan's group, lowest first, marked Upgrade, Downgrade
//               or "Billing change"; the current one can't be picked
//   2. Review   when it starts (the group's settings: upgrades right away, downgrades at the end of the
//               paid period; a billing change at the next renewal), what's charged today (the
//               difference for the days left, when the group prorates), the new price and date,
//               what's added and what stops. Progress, certificates and bookings always stay.
//   3. Done     upgraded, or "Switching on …" with a way to keep the current plan
import { useState } from 'react'
import { Badge, Button, Card, Icon, Modal, Notice, RadioCard, Stepper } from '@/design-system'
import { paymentMethod } from '@/data/dashboard-extra.js'
import { switchQuote, fullDate } from '@/lib/student.js'

const STEPS = ['Choose', 'Review', 'Done']
const TAG = { up: ['accent', 'Upgrade'], down: [undefined, 'Downgrade'], price: [undefined, 'Billing change'] }

export default function ChangePlanFlow({ m, onClose, onConfirm }) {
  const [step, setStep] = useState(0)
  const [pick, setPick] = useState(null) // `${planId}:${priceId}`
  // Kept once confirmed: an upgrade changes the plan right away, so it's no longer in the list.
  const [confirmed, setConfirmed] = useState(null)
  const option = m.switchTo.find((o) => `${o.plan.id}:${o.priceId}` === pick)
  const quote = confirmed || (option ? switchQuote(m, option.plan, option.priceId) : null)

  const confirm = () => { setConfirmed(quote); onConfirm(quote); setStep(2) }

  let footer
  if (step === 0) footer = <><Button variant="secondary" onClick={onClose}>Keep {m.plan.name}</Button><Button disabled={!quote} onClick={() => setStep(1)}>Continue</Button></>
  else if (step === 1) {
    footer = (
      <>
        <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
        <Button onClick={confirm}>{quote.when === 'now' ? (quote.paidToday ? `Upgrade and pay ${quote.paidTodayLabel}` : `Switch to ${quote.plan.name}`) : 'Schedule the change'}</Button>
      </>
    )
  } else footer = <Button onClick={onClose}>Done</Button>

  return (
    <Modal open onClose={onClose} title={confirmed ? 'Plan changed' : `Change your ${m.plan.name} plan`} footer={footer}>
      <div className="pg-stack">
        <Stepper steps={STEPS} current={step} />

        {step === 0 && (
          <fieldset className="ap-fieldset pg-stack-sm">
            <legend className="t-strong">Choose a plan</legend>
            <RadioCard name="plan" value="current" disabled checked={false} title={`${m.plan.name} · ${m.priceLabel}`} description="Your plan now" onChange={() => {}} />
            {m.switchTo.map((o) => {
              const q = switchQuote(m, o.plan, o.priceId)
              const [tone, text] = TAG[q.direction]
              return (
                <RadioCard
                  key={`${o.plan.id}:${o.priceId}`} name="plan" value={`${o.plan.id}:${o.priceId}`}
                  checked={pick === `${o.plan.id}:${o.priceId}`} onChange={() => setPick(`${o.plan.id}:${o.priceId}`)}
                  title={<span className="cp-title">{o.plan.name} · {q.priceLabel} <Badge tone={tone}>{text}</Badge></span>}
                  description={q.when === 'now' ? 'Starts right away.' : `Starts ${fullDate(q.startsAt)}, when your paid period ends.`}
                />
              )
            })}
          </fieldset>
        )}

        {step === 1 && quote && (
          <div className="pg-stack">
            <Card tone="sunken" padding="sm">
              <dl className="cp-facts">
                <div><dt>From</dt><dd>{m.plan.name} · {m.priceLabel}</dd></div>
                <div><dt>To</dt><dd>{quote.plan.name} · {quote.priceLabel}</dd></div>
                <div><dt>Starts</dt><dd>{quote.when === 'now' ? 'Right away' : fullDate(quote.startsAt)}</dd></div>
                {quote.when === 'now'
                  ? <div><dt>Today</dt><dd>{quote.paidTodayLabel} <span className="t-muted">for the {quote.daysLeft} days left in this period</span></dd></div>
                  : <div><dt>Today</dt><dd>Nothing to pay</dd></div>}
                <div><dt>Then</dt><dd>{quote.priceLabel}, from {fullDate(m.nextAt)}</dd></div>
                <div><dt>Paid with</dt><dd>{paymentMethod.brand} ending {paymentMethod.last4}</dd></div>
              </dl>
            </Card>
            {quote.when === 'end' && <p className="t-body-sm">Until then nothing changes: you keep everything in {m.plan.name}.</p>}
            {quote.gains.length > 0 && (
              <div className="pg-stack-sm">
                <p className="t-strong">You’ll also get</p>
                <ul className="pg-ticks t-body-sm">{quote.gains.map((g) => <li key={g}><Icon name="check" size={16} /><span>{g}</span></li>)}</ul>
              </div>
            )}
            {quote.loses.length > 0 && (
              <div className="pg-stack-sm">
                <p className="t-strong">{quote.when === 'now' ? 'These stop now' : `These stop on ${fullDate(quote.startsAt)}`}</p>
                <ul className="pg-ticks t-body-sm">{quote.loses.map((g) => <li key={g}><Icon name="minus" size={16} /><span>{g}</span></li>)}</ul>
              </div>
            )}
            <p className="t-body-sm t-muted">Your progress, certificates, community posts and bookings stay with you.</p>
          </div>
        )}

        {step === 2 && quote && (
          <Notice tone="success" title={quote.when === 'now' ? `You’re on ${quote.plan.name} now` : `You’ll switch to ${quote.plan.name} on ${fullDate(quote.startsAt)}`}>
            {quote.when === 'now'
              ? `We charged ${quote.paidTodayLabel} to your ${paymentMethod.brand} ending ${paymentMethod.last4} and emailed your receipt. Everything in ${quote.plan.name} is open.`
              : `Nothing changes until then, and you can keep ${m.plan.name} any time before. We’ve emailed you the details.`}
          </Notice>
        )}
      </div>
    </Modal>
  )
}
