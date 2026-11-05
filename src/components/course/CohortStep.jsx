// Checkout step for cohort courses with "Let users choose at checkout" on: every cohort that's
// open for enrolment, with its dates and places left. Full cohorts show, but can't be picked.
import { Badge, Icon, RadioCard } from '@/design-system'
import StepCard from '@/components/checkout/StepCard.jsx'
import { placesLabel } from './cohort.js'
import './course.css'

export default function CohortStep({ choice, value, onChange, error }) {
  const { product, upcoming } = choice
  const c = product.cohort
  return (
    <StepCard id="co-cohort" title="Choose your cohort" intro={`${c.weeks} weeks, ${c.schedule}. You can move to a later cohort before yours starts.`}>
      <fieldset className="cr-pick" aria-describedby={error ? 'co-cohort-error' : undefined}>
        <legend className="sg-sr">Cohort for {product.title}</legend>
        {upcoming.map((r) => (
          <RadioCard
            key={r.id} name="cohort" value={r.id} checked={value === r.id} disabled={!r.open}
            onChange={() => onChange(r.id)}
            title={r.name}
            description={r.open ? `${r.dates} · Enrolment closes ${r.closesLabel}` : `${r.dates} · ${r.full ? 'Every place has been taken' : 'Enrolment has closed'}`}
            meta={<Badge tone={r.full ? 'warning' : r.seatsLeft <= 4 ? 'accent' : 'neutral'} icon={r.full ? 'users' : undefined}>{placesLabel(r)}</Badge>}
          />
        ))}
      </fieldset>
      {error && <p id="co-cohort-error" className="sg-field-error" role="alert"><Icon name="alert" size={16} />{error}</p>}
    </StepCard>
  )
}
