import { Icon } from '@/design-system'
import { MAX_QUANTITY } from '@/lib/commerce.js'
import './quantity-stepper.css'

// − 1 + for how many copies of a library item to buy (cart page, mini cart, cart checkout).
// The buttons are aria-disabled at the limits rather than disabled, so focus stays on them.
//   name: the item's name, for "Quantity for Soups and stews". onChange(next).
export default function QuantityStepper({ name, value, min = 1, max = MAX_QUANTITY, onChange, className = '' }) {
  const atMin = value <= min
  const atMax = value >= max
  const step = (by, blocked) => { if (!blocked) onChange(value + by) }
  return (
    <div className={`qty ${className}`} role="group" aria-label={`Quantity for ${name}`}>
      <button
        type="button" className="qty-btn" aria-label={`One fewer ${name}`} aria-disabled={atMin || undefined}
        onClick={() => step(-1, atMin)}
      >
        <Icon name="minus" size={16} />
      </button>
      <span className="qty-value" aria-live="polite" aria-atomic="true">
        <span className="sg-sr">Quantity </span>{value}
      </span>
      <button
        type="button" className="qty-btn" aria-label={`One more ${name}`} aria-disabled={atMax || undefined}
        onClick={() => step(1, atMax)}
      >
        <Icon name="plus" size={16} />
      </button>
    </div>
  )
}
