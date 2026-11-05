import { useId } from 'react'
import { Icon, RadioCard } from '@/design-system'
import { switchId } from './prices.js'

// "Change" on an order line: a disclosure that reveals the other prices of the same item
// (PriceOptions, rendered full width under the line). id: the line's key.
export function ChangeToggle({ id, name, open, onToggle }) {
  return (
    <button
      type="button" className="sg-linkbtn co-change" aria-expanded={open} aria-controls={switchId(id)}
      onClick={onToggle}
    >
      Change<span className="sg-sr"> how you pay for {name}</span>
      <Icon name="chevron-down" size={16} className="co-change-chev" />
    </button>
  )
}

// choice: priceChoices() → { options, alone }. onAlone: before following "Buy it on its own".
export function PriceOptions({ id, name, choice, value, open, onChoose, onAlone }) {
  const panel = switchId(id)
  return (
    <div className="co-switch" id={panel} hidden={!open}>
      <fieldset className="co-switch-options">
        <legend className="sg-sr">How you pay for {name}</legend>
        {choice.options.map((o) => (
          <RadioCard
            key={o.id} className="co-switch-card" name={panel} value={o.id}
            checked={value === o.id} onChange={() => onChoose(o.id)}
            title={o.title} description={o.description} meta={o.meta}
          />
        ))}
      </fieldset>
      {choice.alone && (
        <p className="co-switch-alone t-body-sm t-muted">
          {choice.alone.label} <a href={choice.alone.href} onClick={onAlone}>Buy it on its own</a>
        </p>
      )}
    </div>
  )
}

// "Includes Gut Health Reset" under a membership line (the plan picker's `for=`).
export function IncludesNote({ title }) {
  return (
    <span className="co-line-includes t-body-sm">
      <Icon name="check" size={16} />
      {title ? `Includes ${title}` : 'Includes the content you chose'}
    </span>
  )
}

// "How you pay": the product's prices as small boxes at the top of the order panel, side by side
// (three per row at most, more rows when there are more). Used when buying one product.
export function PricePicker({ name, choice, value, onChoose }) {
  const group = useId()
  const cols = Math.min(3, choice.options.length)
  return (
    <fieldset className="co-pick" style={{ '--co-pick-cols': cols }}>
      <legend className="co-pick-legend">How you pay<span className="sg-sr"> for {name}</span></legend>
      <div className="co-pick-grid">
        {choice.options.map((o) => (
          <label key={o.id} className={'co-pick-box' + (value === o.id ? ' is-on' : '')}>
            <input type="radio" className="co-pick-input" name={group} value={o.id} checked={value === o.id} onChange={() => onChoose(o.id)} />
            <span className="co-pick-title">{o.title}</span>
            <span className="co-pick-price">{o.meta}</span>
            {o.description && <span className="co-pick-note">{o.description}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
