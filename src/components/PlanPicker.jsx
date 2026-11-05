// Pick a membership for a membership-only product and go straight to checkout.
// Used by the product buy panel, the access gate and the asset library.
//
//   <PlanPicker product={{ title, plans: [planId] }} forRef="rest-and-restore-audio" compact />
//   <PlanPickerModal open onClose product forRef />
//
// The button goes to /checkout/plan:<id>?price=<period>&for=<forRef>; checkout shows
// "Includes <product>" and sends the buyer back to it after paying.
// Viewer-aware: members whose plan doesn't include the product see the upgrade variant.
import { useId, useState } from 'react'
import { cx, Badge, Button, Modal, PriceTag, RadioCard, SegmentedToggle } from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { billingPeriods, getPlan, membershipGroup } from '@/data/plans.js'
import './plan-picker.css'

const list = (names) => names.join(', ').replace(/, ([^,]*)$/, ' and $1')

// Price on the card's end: amount and interval only; notes go in the description.
const shortPrice = ({ amount, interval }) => ({ amount, interval })

const allowancesFor = (plan, period) =>
  Array.isArray(plan.allowances) ? plan.allowances : plan.allowances?.[period] || []

const keyFeatures = (plan, period) => [...allowancesFor(plan, period), ...plan.features].slice(0, 2)

const trialFor = (plan, period) => (period !== 'lifetime' && plan.trial) || null

const inGroup = (plan) => membershipGroup.tiers.includes(plan.id)

// Featured plan first, else the cheapest for this period.
function defaultPlan(options, period) {
  if (!options.length) return null
  return options.find((p) => p.featured)
    || options.reduce((a, b) => (b.prices[period].amount < a.prices[period].amount ? b : a))
}

function checkoutHref(planId, period, forRef) {
  return `/checkout/plan:${planId}?price=${period}${forRef ? `&for=${encodeURIComponent(forRef)}` : ''}`
}

export default function PlanPicker({ product, forRef, compact, viewer: viewerOverride, onChoose }) {
  const ctx = useViewer()
  const viewer = viewerOverride || ctx?.viewer || {}
  const groupName = useId()
  // Strictly the plans this product lists (Sell → Memberships: "Included in"), never the rest of the
  // group: a product included only in Essentials shows Essentials alone.
  const included = [...new Set(product?.plans || [])].map(getPlan).filter(Boolean)
  const current = viewer.plan ? getPlan(viewer.plan) : null
  const upgrading = Boolean(current)

  const periods = billingPeriods.filter((b) => included.some((p) => p.prices[b.value]))
  const [periodPick, setPeriod] = useState(null)
  const [planPick, setPlan] = useState(null)

  if (!included.length) return null

  const period = periods.some((b) => b.value === periodPick) ? periodPick
    : periods.some((b) => b.value === 'monthly') ? 'monthly' : periods[0].value
  const forPeriod = included.filter((p) => p.prices[period])
  const options = forPeriod.filter((p) => p.id !== current?.id)
  const currentHere = current && forPeriod.some((p) => p.id === current.id)
  const selected = options.find((p) => p.id === planPick) || defaultPlan(options, period)
  const trial = selected && !upgrading ? trialFor(selected, period) : null

  let cta = null
  if (selected) {
    if (!upgrading) cta = trial ? 'Start free trial' : 'Join and get access'
    else if (inGroup(selected) && inGroup(current) && selected.tier < current.tier) cta = `Switch to ${selected.name}`
    else cta = `Upgrade to ${selected.name}`
  }
  const upgradeNote = upgrading && selected && inGroup(selected) && inGroup(current) && selected.tier > current.tier
    ? 'We charge the difference for the rest of this billing period.'
    : null

  const description = (plan) => {
    const note = upgrading ? null : trialFor(plan, period)
    const saving = plan.prices[period].price.note
    const extra = [note, saving].filter(Boolean).join(' · ')
    return (
      <>
        <span className="pp-features">{keyFeatures(plan, period).join(' · ')}</span>
        {extra && <span className="pp-note">{extra}</span>}
      </>
    )
  }

  return (
    <div className={cx('pp', compact && 'is-compact')}>
      <p className="pp-lead">
        Included in {list(included.map((p) => p.name))}
        {upgrading && !currentHere && <>. You’re on <strong>{current.name}</strong>, which doesn’t include it</>}
        .
      </p>

      {periods.length > 1 && (
        <div className="pp-toggle">
          <SegmentedToggle options={periods} value={period} onChange={setPeriod} label="Billing period" />
        </div>
      )}

      <fieldset className="pp-options">
        <legend className="pp-legend">{upgrading ? 'Choose a plan to upgrade to' : 'Choose a membership'}</legend>
        {currentHere && (
          <div className="pp-current">
            <span className="pp-current-name">{current.name}<Badge tone="success" icon="check">Your plan</Badge></span>
            <PriceTag {...shortPrice(current.prices[period].price)} size="sm" />
          </div>
        )}
        {options.map((plan) => (
          <RadioCard
            key={plan.id}
            name={groupName}
            value={plan.id}
            checked={plan.id === selected?.id}
            onChange={() => setPlan(plan.id)}
            title={plan.name}
            badge={plan.featured ? <Badge tone="primary">Most chosen</Badge> : null}
            description={description(plan)}
            meta={<PriceTag {...shortPrice(plan.prices[period].price)} size="sm" />}
          />
        ))}
      </fieldset>

      {selected ? (
        <div className="pp-action">
          <Button
            size={compact ? 'md' : 'lg'}
            block
            href={checkoutHref(selected.id, period, forRef)}
            iconEnd="arrow-right"
            onClick={onChoose}
          >
            {cta}
          </Button>
          {upgradeNote && <p className="pp-small">{upgradeNote}</p>}
          {trial && <p className="pp-small">{trial}. Cancel before it ends and you pay nothing.</p>}
        </div>
      ) : (
        <p className="pp-small">Your plan already includes {product.title}.</p>
      )}

      <a className="pp-compare" href="/memberships" onClick={onChoose}>
        {included.length === 1 ? `See everything in ${included[0].name}` : 'Compare all memberships'}
      </a>
    </div>
  )
}

export function PlanPickerModal({ open, onClose, product, forRef }) {
  return (
    <Modal open={open} onClose={onClose} title="Choose a membership">
      <PlanPicker product={product} forRef={forRef} onChoose={onClose} />
    </Modal>
  )
}
