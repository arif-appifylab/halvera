// Cancelling a subscription or membership, from Payments or the Membership tab. Steps:
//   1. Reason   the admin records it ("Cancellation reasons" in revenue analytics)
//   2. Offer    only where the school set one up (a month's pause, or a discount). Pausing is
//               offered here and nowhere else.
//   3. Confirm  when it ends (the end of the paid period: students can't end it early), what
//               stops, and what they keep
//   4. Done     "Cancels on …", with "Keep my membership" until that date ("Cancellation undone")
// sub: { id, name, kind, next (date text), offers?, loses?: [text], keeps?: [text], pendingSwitch? }
import { useState } from 'react'
import { Button, Card, Icon, Modal, Notice, RadioCard, Stepper, TextField } from '@/design-system'
import { cancelReasons } from '@/data/dashboard-extra.js'

export default function CancelFlow({ sub, onClose, onCancel, onOffer }) {
  const offers = sub.offers || []
  const steps = offers.length ? ['Reason', 'An offer for you', 'Confirm'] : ['Reason', 'Confirm']
  const [step, setStep] = useState(0)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [result, setResult] = useState(null)

  const label = steps[step]
  // Someone leaving over cost sees the discount first.
  const sorted = reason === 'cost' ? [...offers.filter((o) => o.id === 'discount'), ...offers.filter((o) => o.id !== 'discount')] : offers
  const isMembership = sub.kind === 'Membership'
  const keepLabel = isMembership ? 'Keep my membership' : 'Keep subscription'

  const cancel = () => {
    const next = { status: 'Cancelling', message: `${sub.name} ends on ${sub.next}` }
    onCancel({ reason, note })
    setResult(next)
    setStep(steps.length)
  }
  const takeOffer = (offer) => {
    onOffer(offer)
    setResult(offer.result)
    setStep(steps.length)
  }

  let footer
  if (result) footer = <Button onClick={onClose}>Done</Button>
  else if (label === 'Reason') {
    footer = <><Button variant="secondary" onClick={onClose}>{keepLabel}</Button><Button disabled={!reason} onClick={() => setStep(1)}>Continue</Button></>
  } else if (label === 'An offer for you') {
    footer = <><Button variant="ghost" onClick={() => setStep(0)}>Back</Button><Button variant="secondary" onClick={() => setStep(2)}>No thanks, continue</Button></>
  } else {
    footer = (
      <>
        <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>
        <Button variant="secondary" onClick={onClose}>{keepLabel}</Button>
        <Button variant="danger" onClick={cancel}>{isMembership ? 'Cancel membership' : 'Cancel subscription'}</Button>
      </>
    )
  }

  return (
    <Modal open onClose={onClose} title={`Cancel ${sub.name}`} footer={footer}>
      <div className="pg-stack">
        <Stepper steps={steps} current={step} />

        {result && (
          <Notice tone="success" title={result.message}>
            {result.status === 'Cancelling'
              ? `Everything stays open until ${sub.next}, and you won’t be charged again. We’ve emailed you a confirmation. Changed your mind? You can keep it any time before then.`
              : 'We’ve emailed you the details. You can change this from your dashboard at any time.'}
          </Notice>
        )}

        {!result && label === 'Reason' && (
          <fieldset className="ap-fieldset pg-stack-sm">
            <legend className="t-strong">What’s the main reason you’re leaving?</legend>
            <p className="t-body-sm t-muted">Your answer helps us shape what we offer. It doesn’t change anything else.</p>
            {cancelReasons.map((r) => (
              <RadioCard key={r.value} name="cancel-reason" value={r.value} title={r.label} checked={reason === r.value} onChange={() => setReason(r.value)} />
            ))}
            {reason === 'other' && <TextField label="Tell us a little more" optional multiline rows={3} value={note} onChange={(e) => setNote(e.target.value)} />}
          </fieldset>
        )}

        {!result && label === 'An offer for you' && (
          <Card tone="sage" className="pg-stack-sm">
            <h3 className="t-heading-4">Before you go</h3>
            <p className="t-body-sm">If now isn’t the right time, these keep your place without the full cost.</p>
            <ul className="ap-offers">
              {sorted.map((o) => (
                <li key={o.id} className="ap-offer">
                  <div><p className="t-strong">{o.title}</p><p className="t-body-sm t-muted">{o.text}</p></div>
                  <Button variant="secondary" size="sm" onClick={() => takeOffer(o)}>{o.action}</Button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {!result && label === 'Confirm' && (
          <div className="pg-stack-sm">
            <p>Your {sub.name} ends at the end of this billing period, on <strong>{sub.next}</strong>. Until then, everything stays open and you won’t be charged again.</p>
            {sub.pendingSwitch && <p className="t-body-sm">Your planned switch to {sub.pendingSwitch} won’t happen.</p>}
            {sub.loses?.length > 0 && (
              <>
                <p className="t-strong">After that date</p>
                <ul className="pg-ticks t-body-sm">{sub.loses.map((e) => <li key={e}><Icon name="minus" size={16} /><span>{e}</span></li>)}</ul>
              </>
            )}
            {sub.keeps?.length > 0 && (
              <>
                <p className="t-strong">You keep</p>
                <ul className="pg-ticks t-body-sm">{sub.keeps.map((e) => <li key={e}><Icon name="check" size={16} /><span>{e}</span></li>)}</ul>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
