import { Icon, Badge } from '@/design-system'
import { siteAccess } from '@/lib/access.js'
import StepCard from './StepCard.jsx'

const priceLabel = (p) => (p.price.interval ? `${p.price.amount} / ${p.price.interval}` : p.price.amount)
const priceNote = (p) => (p.kind === 'subscription' ? `Renews every ${p.interval}. Cancel any time.` : 'One payment, never expires.')

// Sell → Memberships → Access gate. mode:
//   gate        the order needs site access, so it's added as its own "Required" line
//   standalone  the buyer is buying site access on its own (/checkout/site-access)
// renew: the viewer's access has ended (purchases are locked until they renew).
// The price itself is chosen in the order panel (its line's "Change"), so there's one control for it;
// onChangePrice opens that control.
export default function SiteAccessStep({ mode, renew, priceId, onChangePrice }) {
  const name = siteAccess.name
  const gate = mode === 'gate'
  const title = renew ? `Renew your ${name.toLowerCase()}` : name
  const chosen = siteAccess.prices.find((p) => p.id === priceId) || siteAccess.prices[0]

  return (
    <StepCard
      id="co-access" title={title}
      badge={gate ? <Badge tone="primary">Required</Badge> : null}
    >
      {gate ? (
        <div className="co-gate">
          <p className="t-body-sm">
            {renew
              ? `Your ${name.toLowerCase()} has ended, so new purchases, and the programmes you already own, are locked until you renew.`
              : `You need ${name.toLowerCase()} to buy from Halvera.`}
            {' '}We’ve added it to your order as its own line, so it’s one payment for both.
          </p>
          <ul className="pg-ticks t-body-sm">
            {siteAccess.benefits.map((b) => (
              <li key={b}><Icon name="check" size={18} />{b}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="t-body-sm t-muted">
          {renew
            ? 'Renewing unlocks everything you’ve already bought, and lets you buy again.'
            : `${name} lets you buy any programme from Halvera. Free programmes stay free.`}
        </p>
      )}

      {chosen && (
        <div className="co-access-choice">
          <span className="co-access-choice-text">
            <span className="t-strong">{chosen.label} · {priceLabel(chosen)}</span>
            <span className="t-body-sm t-muted">{priceNote(chosen)}</span>
          </span>
          {siteAccess.prices.length > 1 && (
            <button type="button" className="sg-linkbtn" onClick={onChangePrice}>
              Change<span className="sg-sr"> how long, in your order summary</span>
            </button>
          )}
        </div>
      )}
    </StepCard>
  )
}
