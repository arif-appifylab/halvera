import { useMemo } from 'react'
import { Badge, Button, Card, EmptyState, Icon, Notice } from '@/design-system'
import { useCart } from '@/app/cart.jsx'
import { useViewer } from '@/app/viewer.jsx'
import { quote, quantityOf, resolveItem } from '@/lib/commerce.js'
import { productHref } from '@/lib/products.js'
import { libraryHref } from '@/lib/library.js'
import { siteAccess } from '@/lib/access.js'
import { cartCheckoutHref } from '@/lib/checkout-session.js'
import { itemsFor } from '@/components/checkout/items.js'
import QuantityStepper from '@/components/QuantityStepper.jsx'
import './cart.css'

// /cart: the cart on its own page, before checkout. The items, how many of each (library items
// only), a subtotal and the way to checkout. Tax, site access, coupons and the order bump are
// worked out at checkout; the amounts come from quote() (R-PRICE-10).

const KIND_TONE = { Bonus: 'success', 'Pre-order': 'accent' }
const plural = (n) => `${n} ${n === 1 ? 'item' : 'items'}`
const NO_PARAMS = new URLSearchParams()

// Where an item's name links: its product page or its place in the library.
const hrefOf = (r) => (r.libraryItem ? r.libraryItem.href : r.product ? productHref(r.product) : null)

function Head({ intro }) {
  return (
    <header className="pg-head">
      <div className="sg-container">
        <div className="pg-head-inner">
          <h1 className="t-display-lg">Your cart</h1>
          {intro && <p className="t-body-lg t-muted">{intro}</p>}
        </div>
      </div>
    </header>
  )
}

export default function Cart() {
  const cart = useCart()
  const { viewer } = useViewer()
  // Anything the school has since removed is left out, as at checkout.
  const items = useMemo(() => itemsFor('cart', NO_PARAMS, cart.items).items, [cart.items])
  const dropped = cart.items.length - items.length

  if (!items.length) {
    return (
      <div className="cp">
        <Head />
        <section className="cp-body">
          <div className="sg-container">
            <EmptyState
              icon="cart" title="Your cart is empty"
              action={(
                <div className="pg-row cp-empty-actions">
                  <Button href="/courses">Explore programmes</Button>
                  <Button variant="secondary" href={libraryHref()}>Browse the library</Button>
                </div>
              )}
            >
              Programmes, workshop tickets and downloads you add will show here.
            </EmptyState>
          </div>
        </section>
      </div>
    )
  }

  const q = quote(items, viewer)
  const offset = q.siteAccessAdded ? 1 : 0

  return (
    <div className="cp">
      <Head intro={`${plural(items.reduce((n, i) => n + quantityOf(i), 0))}. Nothing is charged until you pay at checkout.`} />

      <section className="cp-body">
        <div className="sg-container pg-split">
          <div className="pg-stack">
            {dropped > 0 && (
              <Notice tone="warning" title="Something in your cart is no longer available">
                It has been taken off sale since you added it, so it isn’t included below.
              </Notice>
            )}

            <h2 className="sg-sr">Items</h2>
            <ul className="cp-list">
              {items.map((item, i) => {
                const r = resolveItem(item)
                const image = r.product?.image || r.image
                const href = hrefOf(r)
                const line = q.lines[i + offset]
                return (
                  <li key={item.productId} className="cp-item">
                    {image
                      ? <img className="cp-thumb" src={image} alt="" loading="lazy" />
                      : <span className="cp-thumb cp-thumb-icon" aria-hidden="true"><Icon name="leaf" size={24} /></span>}

                    <div className="cp-main">
                      <p className="cp-name t-body t-strong">
                        {href ? <a href={href}>{r.title}</a> : r.title}
                        {r.kind && <Badge tone={KIND_TONE[r.kind] || 'neutral'}>{r.kind}</Badge>}
                      </p>
                      {r.info && <p className="t-body-sm t-muted">{r.info}</p>}
                      {!r.libraryItem && r.detail && <p className="t-body-sm t-muted">{r.detail}</p>}
                      <div className="cp-actions">
                        {r.maxQuantity > 1 && (
                          <QuantityStepper
                            name={r.title} value={r.quantity} max={r.maxQuantity}
                            onChange={(n) => cart.setQuantity(item.productId, n)}
                          />
                        )}
                        <button type="button" className="sg-linkbtn cp-remove" onClick={() => cart.remove(item.productId)}>
                          Remove<span className="sg-sr"> {r.title}</span>
                        </button>
                      </div>
                    </div>

                    <div className="cp-price">
                      <span className="cp-amount">{line?.amount}</span>
                      {r.quantity > 1 && <span className="t-caption t-muted">{line?.detail}</span>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <aside className="pg-split-aside" aria-labelledby="cp-summary-title">
            <Card className="cp-summary">
              <h2 id="cp-summary-title" className="t-heading-4">Summary</h2>
              <dl className="cp-totals">
                <dt>Subtotal</dt>
                <dd>{q.itemsSubtotal}</dd>
              </dl>
              <p className="t-body-sm t-muted">{siteAccess.enabled ? 'Taxes and site access are worked out at checkout.' : 'Taxes are worked out at checkout.'}</p>
              {q.siteAccessAdded && (
                <p className="cp-note t-body-sm">
                  <Icon name="info" size={16} />
                  {siteAccess.name} is added at checkout, in one payment with your order.
                </p>
              )}
              <div className="cp-buttons">
                <Button href={cartCheckoutHref(cart.checkoutToken)} block>Checkout</Button>
                <Button variant="secondary" href="/all-products" block>Keep browsing</Button>
              </div>
              <p className="cp-note t-caption t-muted">
                <Icon name="info" size={16} />
                Subscriptions and memberships are bought on their own, so they go straight to checkout instead of joining your cart.
              </p>
            </Card>
          </aside>
        </div>
      </section>
    </div>
  )
}
