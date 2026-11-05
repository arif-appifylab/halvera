import { Checkbox, TextField } from '@/design-system'
import StepCard from './StepCard.jsx'

// Gift (the price's "Allow gifting", one-time prices only): a checkbox. Ticked, it's a gift and the
// recipient's details appear; unticked, the buyer gets it themselves. Gift orders have no order bump or
// upsell (the admin turns both off for gift purchases).
const zone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'your time zone' } })()

export default function GiftStep({ on, onToggle, field }) {
  return (
    <StepCard id="co-gift" title="Gift">
      <Checkbox
        label="This is a gift"
        description="We’ll email them on the date you choose, with a link to claim it. You get the receipt."
        checked={on} onChange={(e) => onToggle(e.target.checked)}
      />
      {on && (
        <>
          <div className="pg-grid-2 co-pair">
            <TextField label="Their name" autoComplete="off" {...field('giftName')} />
            <TextField label="Their email" type="email" autoComplete="off" {...field('giftEmail')} />
          </div>
          <div className="pg-grid-2 co-pair">
            <TextField label="Send on" type="date" {...field('giftDate')} />
            <TextField label="At" type="time" {...field('giftTime')} />
          </div>
          <p className="t-body-sm t-muted co-gift-note">In your time zone ({zone}). A time that has already passed sends it straight away.</p>
          <TextField label="Your message" optional multiline rows={3} maxLength={300} {...field('giftMessage')} />
        </>
      )}
    </StepCard>
  )
}
