import { useState } from 'react'
import { Badge, Button, Modal, Notice, PriceTag } from '@/design-system'
import { useCart } from '@/app/cart.jsx'
import { useViewer } from '@/app/viewer.jsx'
import PlanPicker from '@/components/PlanPicker.jsx'
import { getLibraryItem, needsSiteAccessFor, unlockOptions, libraryAccess } from '@/lib/library.js'
import { siteAccess } from '@/lib/access.js'
import './library-components.css'

const shortPrice = ({ amount, interval, installments, total }) => ({ amount, interval, installments, total })

// The ways to open a locked library item, smallest first: this file → its folder → its category →
// a membership. One-time prices can go in the cart or straight to checkout; category subscriptions
// and installment plans are bought on their own; memberships open the plan picker.
export default function UnlockOptions({ itemRef, onDone, headingLevel = 3 }) {
  const { viewer } = useViewer()
  const cart = useCart()
  const [plansOpen, setPlansOpen] = useState(false)
  const item = getLibraryItem(itemRef)
  const access = libraryAccess(itemRef, viewer)
  const H = `h${headingLevel}`

  if (!item) return null
  if (access.state === 'site-access-ended') {
    return (
      <Notice tone="warning" title="Your site access has ended" action={<Button size="sm" href="/site-access">Renew site access</Button>}>
        You bought this, and it opens again as soon as you renew. Nothing you bought is lost.
      </Notice>
    )
  }

  const options = unlockOptions(itemRef, viewer)
  if (!options.length) return null
  const gate = options.some((o) => o.kind !== 'membership' && needsSiteAccessFor(o.ref, viewer))

  const addToCart = (p) => {
    if (cart.add(p.cartItem)) onDone?.()
  }

  return (
    <div className="lib-unlock">
      <ul className="lib-unlock-list">
        {options.map((o, oi) => (
          <li key={o.key} className="lib-unlock-option">
            <div className="lib-unlock-head">
              <H className="lib-unlock-title">{o.heading}</H>
              <p className="t-body-sm t-muted">{o.scope}</p>
            </div>
            {o.kind === 'membership' ? (
              plansOpen ? (
                <PlanPicker product={{ title: o.title, plans: o.plans }} forRef={`library:${o.ref}`} compact onChoose={onDone} />
              ) : (
                <div className="lib-unlock-row">
                  <span className="lib-unlock-incl">Included in a membership</span>
                  <Button size="sm" variant="secondary" onClick={() => setPlansOpen(true)}>See memberships</Button>
                </div>
              )
            ) : (
              <ul className="lib-unlock-prices">
                {o.prices.map((p, pi) => {
                  const primary = oi === 0 && pi === 0
                  return (
                    <li key={p.id} className="lib-unlock-row">
                      <span className="lib-unlock-price">
                        <PriceTag {...shortPrice(p.price)} size="sm" />
                        {p.kind !== 'one-time' && <span className="t-body-sm t-muted">{p.label}</span>}
                        {p.solo && <Badge>Bought on its own</Badge>}
                      </span>
                      <span className="lib-unlock-actions">
                        {!p.solo && <Button size="sm" variant="ghost" iconStart="cart" onClick={() => addToCart(p)}>Add to cart</Button>}
                        <Button size="sm" variant={primary ? 'primary' : 'secondary'} href={p.href} onClick={onDone}>Buy now</Button>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {gate && (
        <p className="lib-gate t-body-sm t-muted">
          Needs Site access · added at checkout ({siteAccess.prices[0].price.amount} / {siteAccess.prices[0].interval}). <a href="/site-access">What is site access?</a>
        </p>
      )}
    </div>
  )
}

export function UnlockModal({ itemRef, onClose }) {
  const item = itemRef ? getLibraryItem(itemRef) : null
  return (
    <Modal open={Boolean(item)} onClose={onClose} title={item ? `Unlock ${item.title}` : 'Unlock'}>
      {item && <UnlockOptions itemRef={itemRef} onDone={onClose} />}
    </Modal>
  )
}
