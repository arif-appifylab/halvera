// The cohort line in the sales page's buy panel: which cohort a buyer joins (or that they choose
// at checkout), and for students, the cohort they're in.
import { Icon } from '@/design-system'
import { cohortSale, studentRun, placesLabel } from './cohort.js'
import './course.css'

export default function CohortBuyNote({ product, owned }) {
  if (!product.cohort?.runs) return null
  if (owned) {
    const run = studentRun(product)
    if (!run) return null
    return (
      <p className="cr-buy-note">
        <Icon name="users" size={16} />
        <span>Your cohort: <strong>{run.name}</strong> · {run.schedule}</span>
      </p>
    )
  }
  const { open, next, routing } = cohortSale(product)
  if (!next) return null
  if (routing === 'choose' && open.length > 1) {
    return (
      <p className="cr-buy-note">
        <Icon name="calendar" size={16} />
        <span>Choose your cohort at checkout. The next starts <strong>{next.dates.split(' – ')[0]}</strong> ({placesLabel(next).toLowerCase()}), enrolment closes {next.closesLabel}.</span>
      </p>
    )
  }
  return (
    <p className="cr-buy-note">
      <Icon name="calendar" size={16} />
      <span>You’ll join the <strong>{next.name}</strong> cohort, starting {next.dates.split(' – ')[0]} · {placesLabel(next).toLowerCase()} · enrolment closes {next.closesLabel}.</span>
    </p>
  )
}
