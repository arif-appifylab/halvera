import { Badge, Checkbox } from '@/design-system'
import { orderBump } from '@/lib/commerce.js'

// Sell → Offers → Order bump: one tick adds it to this order.
export default function OrderBump({ checked, onChange }) {
  return (
    <div className={`co-bump${checked ? ' is-on' : ''}`}>
      <div className="co-bump-head">
        <p className="t-heading-4">{orderBump.title}</p>
        <Badge tone="accent">Save 40%</Badge>
      </div>
      <p className="t-body-sm t-muted">{orderBump.text}</p>
      <Checkbox label="Yes, add this to my order" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  )
}
