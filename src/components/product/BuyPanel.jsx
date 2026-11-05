// The product page's buy panel (sticky aside) and the matching mobile bottom bar.
// One state per view (see buyState.js) and one primary action per state.
import { useEffect, useRef, useState } from 'react'
import {
  cx, Card, Badge, Button, Icon, PriceTag, RadioCard, TextField, Notice, StateNotice, StatusBadge,
} from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { useCart } from '@/app/cart.jsx'
import { school } from '@/data/school.js'
import { openHref, productHref } from '@/lib/products.js'
import { needsSiteAccess, siteAccess } from '@/lib/access.js'
import PlanPicker from '@/components/PlanPicker.jsx'
import { buyState, unavailableDetail, UNAVAILABLE } from './buyState.js'
import EventBuyPanel from '@/components/event/EventBuyPanel.jsx'
import CohortBuyNote from '@/components/course/CohortBuyNote.jsx'
import { cohortSale } from '@/components/course/cohort.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const money = (n) => `$${n}`
const defaultPrice = (product) => product.prices.find((p) => p.default) || product.prices[0]

const OWNED_LINE = {
  event: 'You have a ticket',
  newsletter: 'You’re subscribed',
  community: 'You’re a member',
  'media-library': 'Your library is open',
}

// Price shown on a RadioCard's end: the amount only. Notes go in the description.
const shortPrice = ({ amount, interval, installments, strike }) => ({ amount, interval, installments, strike })

function priceDescription(p) {
  const bits = []
  if (p.price.installments && p.price.total) bits.push(`${p.price.total} in total`)
  if (p.price.note) bits.push(p.price.note)
  if (p.note) bits.push(p.note)
  return bits.join(' · ') || undefined
}

const accessLabel = (access) => (access && /^\d/.test(access) ? `Access for ${access}` : access)

function PrimaryButton({ action, size = 'lg', block = true }) {
  if (!action) return null
  if (action.disabled || !action.href) {
    return (
      <Button size={size} block={block} onClick={action.onClick} disabled={action.disabled} iconEnd={action.iconEnd}>
        {action.label}
      </Button>
    )
  }
  return <Button size={size} block={block} href={action.href} iconEnd={action.iconEnd}>{action.label}</Button>
}

function Assurances({ items }) {
  const list = items.filter((i) => i && i.label)
  if (!list.length) return null
  return (
    <ul className="pd-assure">
      {list.map((i) => <li key={i.label}><Icon name={i.icon} size={16} />{i.label}</li>)}
    </ul>
  )
}

function SiteAccessLine({ viewer }) {
  const price = siteAccess.prices.find((p) => p.default) || siteAccess.prices[0]
  const lead = viewer.siteAccess === 'ended' ? `Renew ${siteAccess.name}` : `Needs ${siteAccess.name}`
  return (
    <p className="pd-gate">
      <Icon name="lock" size={16} />
      <span>
        {lead} · {price.price.amount} / {price.price.interval}, added at checkout.{' '}
        <a href="/site-access">What is site access?</a>
      </span>
    </p>
  )
}

// Sticky bar on small screens: price and the primary action, shown once the panel's own button scrolls away.
function MobileBar({ product, summary, action, watchRef }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const el = watchRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [watchRef])
  if (!action) return null
  return (
    <div className={cx('pd-bar', show && 'is-shown')} aria-hidden={!show || undefined} inert={!show || undefined}>
      <div className="pd-bar-info">
        <span className="pd-bar-title">{product.title}</span>
        {summary}
      </div>
      <PrimaryButton action={action} size="md" block={false} />
    </div>
  )
}

function RequestForm({ onSubmit }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})
  // Opening the form moves focus to its first field, which also scrolls it into view (inside the
  // sticky panel on desktop, the page on mobile).
  useEffect(() => { document.getElementById('request-name')?.focus() }, [])
  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!name.trim()) next.name = 'Enter your name'
    if (!EMAIL.test(email.trim())) next.email = 'Enter an email address like name@example.com'
    setErrors(next)
    if (Object.keys(next).length) { document.getElementById(next.name ? 'request-name' : 'request-email')?.focus(); return }
    onSubmit({ status: 'Pending', email: email.trim() })
  }
  return (
    <form className="pd-request" onSubmit={submit} noValidate aria-label="Request access">
      <TextField id="request-name" label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <TextField id="request-email" label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      <TextField label="What would you like help with?" optional multiline rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
      <Button type="submit" size="lg" block>Send request</Button>
    </form>
  )
}

function Waitlist({ product, signedIn }) {
  const [step, setStep] = useState('idle') // idle | form | joined
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const join = (e) => {
    e?.preventDefault()
    if (!signedIn && !EMAIL.test(email.trim())) { setError('Enter an email address like name@example.com'); return }
    setStep('joined')
  }
  const actions = step === 'joined' ? (
    <Button href="/courses">See other programmes</Button>
  ) : (
    <>
      {step === 'idle' && <Button variant="secondary" onClick={() => (signedIn ? join() : setStep('form'))}>Join the waitlist</Button>}
      <Button href="/courses">See other programmes</Button>
    </>
  )
  return (
    <StateNotice reason={UNAVAILABLE[product.availability]} title={product.title} detail={unavailableDetail(product)} actions={actions}>
      {step === 'form' && (
        <form className="pd-waitlist" onSubmit={join} noValidate>
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} error={error} hint="We’ll only email you about this programme." />
          <Button type="submit" variant="secondary">Join the waitlist</Button>
        </form>
      )}
      {step === 'joined' && (
        <Notice tone="success" title="You’re on the waitlist">
          We’ll email you{email ? ` at ${email.trim()}` : ''} as soon as a place opens.
        </Notice>
      )}
    </StateNotice>
  )
}

export default function BuyPanel({ product, request, onRequest }) {
  const { viewer, signedIn } = useViewer()
  const cart = useCart()
  const state = buyState(product, viewer, { request })
  const first = defaultPrice(product)
  const [priceId, setPriceId] = useState(first?.id)
  const [amount, setAmount] = useState(() => (first?.kind === 'pwyw' ? String(first.suggested ?? first.min) : ''))
  const [requesting, setRequesting] = useState(false)
  const panelRef = useRef(null)
  const watchRef = useRef(null)

  // Events have their own states (live, ended, cancelled, waitlist, guest registration, event places).
  if (product.type === 'event') return <EventBuyPanel product={product} />

  // Cohorts: every open cohort full (with a waitlist) or past its enrolment deadline → waitlist.
  const cohortClosed = product.cohort?.runs && state.kind === 'buy' ? cohortSale(product).closedReason : null
  if (state.kind === 'unavailable' || cohortClosed) {
    return <Waitlist product={cohortClosed ? { ...product, availability: cohortClosed } : product} signedIn={signedIn} />
  }

  const price = product.prices.find((p) => p.id === priceId) || first
  const pwyw = price?.kind === 'pwyw'
  const subscription = price?.kind === 'subscription'
  const typed = Number(amount)
  const amountError = !pwyw ? ''
    : amount.trim() === '' || Number.isNaN(typed) ? `Enter an amount of ${money(price.min)} or more`
      : typed < price.min ? `The minimum is ${money(price.min)}` : ''
  const checkoutHref = price ? `/checkout/${product.slug}?price=${price.id}${pwyw && !amountError ? `&amount=${typed}` : ''}` : '/courses'
  const showGate = needsSiteAccess(product) && viewer.siteAccess !== 'active'
  const reveal = () => panelRef.current?.scrollIntoView({ block: 'start' })

  // The one primary action for this state.
  let primary = null
  const status = state.request?.status
  switch (state.kind) {
    case 'owned': primary = { label: 'Open', href: openHref(product), iconEnd: 'arrow-right' }; break
    case 'owned-preorder': primary = { label: `Opens ${product.releases}`, disabled: true }; break
    case 'access-ended': primary = { label: 'Renew site access', href: '/site-access' }; break
    case 'password': primary = { label: 'Enter the password', href: openHref(product) }; break
    // The plan picker in the panel holds the membership button; the mobile bar scrolls back to it.
    case 'membership': primary = { label: state.upgrade ? 'Choose a plan' : 'Choose a membership', onClick: reveal }; break
    case 'private':
      if (!status && !requesting) {
        primary = { label: 'Request access', onClick: () => { reveal(); if (signedIn) onRequest({ status: 'Pending' }); else setRequesting(true) } }
      } else if (status === 'Link sent') primary = { label: 'Complete your purchase', href: checkoutHref }
      break
    case 'pre-order': primary = { label: 'Pre-order now', href: checkoutHref }; break
    case 'free': primary = { label: product.type === 'media-library' ? (product.mediaLibrary?.format === 'video' ? 'Watch for free' : 'Listen for free') : 'Enrol for free', href: signedIn ? openHref(product) : `/signup?next=${encodeURIComponent(openHref(product))}` }; break
    default: {
      const label = product.type === 'event' ? 'Buy ticket' : subscription ? 'Subscribe' : 'Enrol now'
      primary = amountError ? { label, disabled: true } : { label, href: checkoutHref }
    }
  }

  const priceView = (p, size) => (pwyw && size === 'sm' && !amountError ? { amount: money(typed) } : size === 'sm' ? shortPrice(p.price) : p.price)
  const summary = {
    owned: <Badge tone="success" icon="check">{state.viaPlan ? 'In your membership' : 'Owned'}</Badge>,
    'owned-preorder': <Badge tone="info" icon="clock">Pre-ordered</Badge>,
    'access-ended': <Badge tone="warning" icon="lock">Locked</Badge>,
    password: <Badge icon="lock">Password protected</Badge>,
    membership: <span className="pd-bar-label">Included in a membership</span>,
    private: <span className="pd-bar-label">By application</span>,
  }[state.kind] || (price && <PriceTag {...priceView(price, 'sm')} size="sm" />)

  return (
    <>
      <Card as="section" className="pd-buy" padding="lg" ref={panelRef} id="buy" aria-label="Price and enrolment">
        {renderBody()}
      </Card>
      <MobileBar product={product} summary={summary} action={primary} watchRef={watchRef} />
    </>
  )

  function renderAction() {
    return <div ref={watchRef} className="pd-buy-action"><PrimaryButton action={primary} /></div>
  }

  function renderBody() {
    if (state.kind === 'owned' || state.kind === 'owned-preorder' || state.kind === 'access-ended') {
      const preorder = state.kind === 'owned-preorder'
      return (
        <div className="pd-buy-stack">
          <div className="pg-row">
            <Badge tone="success" icon="check">{state.viaPlan ? 'In your membership' : 'Owned'}</Badge>
            {preorder && <Badge tone="info" icon="clock">Pre-order</Badge>}
          </div>
          <h2 className="t-heading-3">{preorder ? 'You’ve pre-ordered this' : OWNED_LINE[product.type] || 'You’re enrolled'}</h2>
          <CohortBuyNote product={product} owned />
          {preorder && <p className="t-muted">Opens {product.releases}. We’ll email you the moment it’s ready.</p>}
          {state.kind === 'owned' && <p className="t-muted">{state.viaPlan ? 'Included in your plan, so there’s nothing to pay.' : 'Everything is waiting for you in your dashboard.'}</p>}
          {state.kind === 'access-ended' && (
            <Notice tone="warning" title="Locked until you renew">
              Your site access has ended, so your programmes are locked. Renew to open this again. Nothing you have done is lost.
            </Notice>
          )}
          {renderAction()}
          {preorder && <a className="pd-link" href="/student/dashboard/profile/payments">View your order</a>}
        </div>
      )
    }

    if (state.kind === 'password') {
      return (
        <div className="pd-buy-stack">
          <Badge icon="lock">Password protected</Badge>
          <PriceTag {...first.price} size="lg" />
          <p className="t-muted">{product.description[0]} Ask us if you can’t find yours.</p>
          {renderAction()}
          <a className="pd-link" href="/contact-us">Ask for the password</a>
        </div>
      )
    }

    if (state.kind === 'membership') {
      return (
        <div className="pd-buy-stack">
          <Badge tone="primary" icon="leaf">Membership</Badge>
          <h2 className="t-heading-3">Included in a membership</h2>
          <p className="t-muted">
            {state.upgrade
              ? 'Your current plan doesn’t include this. Upgrade to open it, along with everything else in the plan.'
              : 'This can’t be bought on its own. Join a membership to open it, along with everything else in your plan.'}
          </p>
          <div ref={watchRef}>
            <PlanPicker product={product} forRef={product.slug} compact />
          </div>
          {!signedIn && <p className="pd-small">Already a member? <a href={`/login?next=${encodeURIComponent(productHref(product))}`}>Log in</a></p>}
          <Assurances items={[{ icon: 'check-circle', label: 'Cancel any time' }]} />
        </div>
      )
    }

    if (state.kind === 'private') {
      const sentOn = state.request?.sent
      return (
        <div className="pd-buy-stack">
          <div className="pg-row">
            <Badge icon="lock">By application</Badge>
            {status && <StatusBadge status={status} />}
          </div>
          <h2 className="t-heading-3">Apply for a place</h2>
          <p className="t-muted">Places are limited. Send a request and we’ll reply with a time for a free call. No payment until you’re approved.</p>
          {product.prices.length > 0 && (
            <dl className="pd-fees">
              {product.prices.map((p) => (
                <div key={p.id}>
                  <dt>{p.label}</dt>
                  <dd><PriceTag {...p.price} size="sm" /></dd>
                </div>
              ))}
            </dl>
          )}
          {showGate && <SiteAccessLine viewer={viewer} />}
          {status === 'Pending' && (
            <Notice tone="info" title={sentOn ? 'Your request is pending' : 'Request sent'}>
              {sentOn ? `You asked on ${sentOn}. ` : ''}We’ll reply within 2 working days{state.request.email ? ` at ${state.request.email}` : ''}.
            </Notice>
          )}
          {status === 'Rejected' && (
            <Notice tone="neutral" title="We can’t offer a place right now">We’ve emailed you with other ways we can help.</Notice>
          )}
          {status === 'Link sent' && (
            <Notice tone="success" title="You’ve been approved">We’ve emailed you a checkout link. You can also finish here.</Notice>
          )}
          {requesting && !status && <RequestForm onSubmit={onRequest} />}
          {primary && renderAction()}
          <Assurances items={[{ icon: 'check-circle', label: 'No payment until you’re approved' }, { icon: 'clock', label: accessLabel(product.access) }]} />
        </div>
      )
    }

    // pre-order, free, buy
    const preorder = state.kind === 'pre-order'
    const free = state.kind === 'free'
    const event = product.type === 'event'
    const quick = pwyw ? [...new Set([price.min, price.suggested, price.suggested + 10])].filter(Number.isFinite) : []
    const canCart = !free && price && !subscription && school.features.cart
    const inCart = cart.items.some((i) => i.productId === product.slug)
    return (
      <div className="pd-buy-stack">
        {preorder && <div><Badge tone="info" icon="clock">Pre-order</Badge></div>}
        {pwyw && <p className="sg-eyebrow">Pay what you want</p>}
        <PriceTag {...(pwyw ? { amount: amountError ? price.price.amount : money(typed) } : preorder ? { ...price.price, note: undefined } : price.price)} size="lg" />
        {preorder && <p className="pd-note">Charged today. Opens {product.releases}.</p>}
        {!preorder && price.note && <p className="pd-sale">{price.note}</p>}
        {!free && showGate && <SiteAccessLine viewer={viewer} />}
        <CohortBuyNote product={product} />

        {product.prices.length > 1 && (
          <fieldset className="pd-prices">
            <legend className="pd-legend">Choose how to pay</legend>
            {product.prices.map((p) => (
              <RadioCard
                key={p.id} name={`price-${product.slug}`} value={p.id} checked={p.id === price.id}
                onChange={() => setPriceId(p.id)} title={p.label} description={priceDescription(p)}
                meta={<PriceTag {...shortPrice(p.price)} size="sm" />}
              />
            ))}
          </fieldset>
        )}

        {pwyw && (
          <div className="pd-pwyw">
            <TextField
              label="Name your price" type="number" inputMode="decimal" min={price.min} step="1"
              value={amount} onChange={(e) => setAmount(e.target.value)} error={amountError}
              hint={amountError ? undefined : `Minimum ${money(price.min)}. Suggested ${money(price.suggested)}.`}
            />
            <div className="pd-chips" role="group" aria-label="Quick amounts">
              {quick.map((q) => (
                <button key={q} type="button" className="pd-chip" aria-pressed={typed === q} onClick={() => setAmount(String(q))}>
                  {money(q)}
                </button>
              ))}
            </div>
          </div>
        )}

        {renderAction()}
        {canCart && (inCart ? (
          <Button variant="secondary" size="lg" block iconStart="cart" onClick={cart.openCart}>View cart</Button>
        ) : (
          <Button
            variant="secondary" size="lg" block iconStart="cart" disabled={Boolean(amountError)}
            onClick={() => cart.add({ productId: product.slug, priceId: price.id, ...(pwyw ? { amount: typed } : {}) })}
          >
            Add to cart
          </Button>
        ))}
        {state.kind === 'buy' && price.kind === 'one-time' && (
          <a className="pd-link pd-gift" href={`${checkoutHref}&gift=1`}><Icon name="heart" size={16} />Buy as a gift</a>
        )}

        <Assurances
          items={free ? [
            { icon: 'check-circle', label: 'No card needed' },
            { icon: 'clock', label: accessLabel(product.access) },
          ] : [
            { icon: 'check-circle', label: event ? 'Full refund up to 14 days before' : subscription ? 'Cancel any time' : '14-day refund' },
            { icon: 'lock', label: 'Secure checkout' },
            { icon: event ? 'mail' : 'clock', label: event ? 'Ticket and joining details by email' : accessLabel(product.access) },
          ]}
        />
      </div>
    )
  }
}
