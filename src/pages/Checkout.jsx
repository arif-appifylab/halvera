import { useMemo, useRef, useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Button, EmptyState, Notice, StateNotice } from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { useCart } from '@/app/cart.jsx'
import { quote, orderBump, couponError, money, resolveItem, allowsQuantity, quantityOf } from '@/lib/commerce.js'
import QuantityStepper from '@/components/QuantityStepper.jsx'
import { siteAccess } from '@/lib/access.js'
import { school } from '@/data/school.js'
import { declinedCard, couponNotApplicable, accountFor } from '@/data/checkout.js'
import { itemsFor, itemFacts, forContext } from '@/components/checkout/items.js'
import { priceChoices, switchId } from '@/components/checkout/prices.js'
import { ChangeToggle, PriceOptions, IncludesNote, PricePicker } from '@/components/checkout/PriceSwitch.jsx'
import AccountStep from '@/components/checkout/AccountStep.jsx'
import SiteAccessStep from '@/components/checkout/SiteAccessStep.jsx'
import GiftStep from '@/components/checkout/GiftStep.jsx'
import BillingStep from '@/components/checkout/BillingStep.jsx'
import OrderBump from '@/components/checkout/OrderBump.jsx'
import PaymentStep from '@/components/checkout/PaymentStep.jsx'
import { availableMethods } from '@/components/checkout/methods.js'
import SocialButtons from '@/components/SocialButtons.jsx'
import AgreementsStep from '@/components/checkout/AgreementsStep.jsx'
import CohortStep from '@/components/course/CohortStep.jsx'
import { cohortToChoose } from '@/components/course/cohort.js'
import SummaryPanel, { BackLink, CheckoutFooter } from '@/components/checkout/SummaryPanel.jsx'
import ThankYou, { ThankYouRecap } from '@/components/checkout/ThankYou.jsx'
import { getCheckoutSession, isResumable, newToken, stepReached, completeCheckoutSession, useCheckoutSessionSaver } from '@/lib/checkout-session.js'
import './checkout.css'
import { splitName, joinName } from '@/lib/names.js'

const DEFAULT_ACCESS_PRICE = (siteAccess.prices.find((p) => p.default) || siteAccess.prices[0]).id
const today = () => new Date().toISOString().slice(0, 10)
const digits = (v) => v.replace(/\D/g, '')
const strongPassword = (v) => v.length >= 8 && v.length <= 64 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v)
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

// "Then $49.00 / month." or "7-day free trial, then $49.00 / month." → "$49.00 / month".
// Reads quote()'s display strings; no price maths.
const charge = (then) => then.match(/then (.+?)\.?$/i)?.[1] || null

// The big amount in the order panel: what's due today, or "7 days free" for a cardless-today trial.
function headline(q, facts) {
  if (q.free) return 'Free'
  if (facts.trial && q.total === money(0) && facts.trialDays) return `${facts.trialDays} days free`
  return q.total
}

// When the only later payment is the site access line added to a one-time order, say so,
// so "Then $49.00 / year" isn't read as the programme renewing.
const accessOnly = (q, facts) => q.siteAccessAdded && facts.oneTime && q.then.length === 1
const forAccess = (q, facts) => (accessOnly(q, facts) ? ` for ${siteAccess.name.toLowerCase()}` : '')

// The line under the amount: what happens after today.
function laterNotes(q, facts) {
  if (q.then.length > 1) return ['Plus later payments, shown in your order summary']
  if (!q.then.length) return []
  const c = charge(q.then[0])
  if (!c) return [q.then[0]]
  return [facts.trial ? `Then ${c} after your trial` : `Then ${c}${forAccess(q, facts)}`]
}

// The checkout item behind each of quote()'s lines: [site access (when added)] + items + [order bump].
// The added site access line is { productId: 'site-access', priceId, gate: true }; the bump is null.
function lineItems(q, items, { bump, siteAccessPriceId }) {
  return [
    ...(q.siteAccessAdded ? [{ productId: 'site-access', priceId: siteAccessPriceId, gate: true }] : []),
    ...items,
    ...(bump ? [null] : []),
  ]
}

const initialForm = (name) => ({
  email: '', password: '', loginPassword: '', magicLink: false,
  giftName: '', giftEmail: '', giftDate: today(), giftTime: '09:00', giftMessage: '',
  ...splitName(name), country: '', address: '', company: '', taxId: '', showCompany: false,
  cardNumber: '', cardExpiry: '', cardCvc: '', cardName: '', saveDetails: false,
  terms: false, agreement: false, marketing: false,
})

// Stripe-style two panels: the order on a sage ground, the payment form on raised.
function Shell({ order, foot, children }) {
  return (
    <div className="co-shell">
      <div className="co-panel co-panel-order"><div className="co-col">{order}</div></div>
      <div className="co-panel co-panel-pay">
        <div className="co-col">
          {children}
          <CheckoutFooter className="co-foot-pay">{foot}</CheckoutFooter>
        </div>
      </div>
    </div>
  )
}

// Unavailable and empty states: centred, with the way back.
function Centered({ children }) {
  return (
    <div className="co-shell co-shell-center">
      <div className="co-center">
        <BackLink />
        <h1 className="sg-sr">Checkout</h1>
        {children}
        <CheckoutFooter />
      </div>
    </div>
  )
}


function Unavailable({ detail, title }) {
  return (
    <Centered>
      <StateNotice
        reason="This checkout isn’t available"
        title={title}
        detail={detail}
        actions={<>
          <Button href="/courses">Browse programmes</Button>
          <Button href="/contact-us" variant="ghost">Contact us</Button>
        </>}
      />
    </Centered>
  )
}

export default function Checkout() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const cart = useCart()
  const { viewer, signedIn, signOut, update } = useViewer()

  const route = useMemo(() => itemsFor(id, params, cart.items), [id, params, cart.items])
  // ?session=<token>: pick up a checkout session (a recovery link, or a reload) for this checkout.
  const [resumed] = useState(() => {
    const s = getCheckoutSession(params.get('session'))
    return isResumable(s) && s.route === id ? s : null
  })
  const [checkoutToken] = useState(() => resumed?.token || newToken('co_'))
  // Cart lines keep the order they arrived in, even after a price change re-adds one.
  const [cartOrder] = useState(() => cart.items.map((i) => i.productId))
  const [accessPrice, setAccessPrice] = useState(resumed?.siteAccessPriceId || null)
  const [openLine, setOpenLine] = useState(null) // the line whose "Change" is open
  const [detailsOpen, setDetailsOpen] = useState(params.get('view') === 'cart') // "Show order summary" on small screens
  // The codes on the order (up to MAX_CODES, when they combine). Older sessions saved a single code.
  const [codes, setCodes] = useState(() => [].concat(resumed?.coupon || []))
  const [couponMsg, setCouponMsg] = useState(null)
  const [bump, setBump] = useState(Boolean(resumed?.bump))
  const [gift, setGift] = useState(params.get('gift') === '1' || Boolean(resumed?.gift))
  // A resumed checkout fills in the name and email typed before. Consent boxes are never restored.
  const [form, setForm] = useState(() => ({
    ...initialForm(signedIn ? viewer.name : resumed?.name || ''),
    ...(!signedIn && resumed?.email ? { email: resumed.email } : {}),
  }))
  const [errors, setErrors] = useState({})
  // Contact, email first: once a valid email has been typed (a short pause after the last key), the server says
  // whether it has an account: 'existing' (log in) or 'new' (create the account). Until then, 'email'.
  const [checkedEmail, setCheckedEmail] = useState(() => (resumed?.email && validEmail(resumed.email) ? resumed.email.trim() : ''))
  const [logInBusy, setLogInBusy] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const [ssoBusy, setSsoBusy] = useState('')
  const [method, setMethod] = useState('card')
  const [failed, setFailed] = useState(params.get('state') === 'failed')
  const [processing, setProcessing] = useState(false)
  const [order, setOrder] = useState(null)
  const [cohortId, setCohortId] = useState(() => params.get('cohort') || resumed?.cohortId || null) // "Let users choose at checkout"
  const failRef = useRef(null)

  const rank = (i) => { const n = cartOrder.indexOf(i.productId); return n < 0 ? cartOrder.length : n }
  const items = route.kind === 'cart' ? [...route.items].sort((a, b) => rank(a) - rank(b)) : route.items
  // A membership bought from the plan picker for one product or library item (`for=`).
  const forItem = forContext(params.get('for'))
  const facts = itemFacts(items)
  // Cohort picker: the chosen cohort, or the next open one until the buyer picks.
  const cohortChoice = cohortToChoose(items)
  const cohortPicked = cohortChoice ? cohortChoice.open.find((r) => r.id === cohortId) || cohortChoice.next : null
  // No order bump on a gift: the admin turns bumps and upsells off for gift purchases.
  const showBump = items.some((i) => orderBump.showWith.includes(i.productId))
    && !items.some((i) => i.productId === orderBump.productId)
    && !(gift && facts.oneTime)
  const options = { coupon: codes, bump: showBump && bump, siteAccessPriceId: accessPrice || DEFAULT_ACCESS_PRICE }
  const q = items.length ? quote(items, viewer, options) : null

  // The checkout session: what's in this checkout and what the buyer has typed so far, saved as
  // they go, so an abandoned-checkout email can bring them back here. No passwords, card or address.
  const sessionable = Boolean(q) && !order && !route.error && params.get('state') !== 'expired'
    && !(route.kind === 'site-access' && viewer.siteAccess === 'active')
  const buyerEmail = signedIn ? viewer.email : form.email.trim()
  const snapshot = sessionable ? {
    route: id, kind: route.kind, cartToken: route.kind === 'cart' ? cart.token : null,
    items, lines: q.lines, total: q.total, coupon: codes.filter((c) => q.discounts.some((d) => d.code === c)),
    bump: options.bump, siteAccessPriceId: q.siteAccessAdded ? options.siteAccessPriceId : null,
    gift: gift && facts.oneTime, cohortId: cohortPicked?.id || null,
    email: buyerEmail, name: signedIn ? viewer.name : joinName(form.firstName, form.lastName), marketingConsent: form.marketing,
    step: stepReached({ signedIn, emailValid: validEmail(buyerEmail), country: form.country, cardStarted: digits(form.cardNumber).length > 0, terms: form.terms }),
  } : null
  useCheckoutSessionSaver(checkoutToken, snapshot, (s) => {
    if (s.kind === 'cart') cart.startCheckout(s.token, validEmail(s.email || '') ? s.email : null)
  })
  // Keep the token in the address, so a reload (or signing in) picks the same checkout back up.
  useEffect(() => {
    if (!sessionable || params.get('session') === checkoutToken) return
    const next = new URLSearchParams(params)
    next.set('session', checkoutToken)
    setParams(next, { replace: true })
  }, [sessionable, params, checkoutToken, setParams])

  // "Includes …" under the membership line, when it was bought for something.
  const includesFor = (item) => (forItem && item?.productId.startsWith('plan:') ? <IncludesNote title={forItem.title} /> : null)

  // Contact: the email decides whether the buyer logs in or creates an account.
  const typedEmail = form.email.trim()
  useEffect(() => {
    if (!validEmail(typedEmail)) return undefined // the stage reads 'email' until the typed address is checked
    const t = setTimeout(() => { setCheckedEmail(typedEmail); setLinkSent(false) }, 450)
    return () => clearTimeout(t)
  }, [typedEmail])
  const known = accountFor(checkedEmail)
  const stage = !checkedEmail || checkedEmail !== typedEmail ? 'email' : known ? 'existing' : 'new'

  if (order) {
    const recapExtras = order.lineItems.map((item) => ({ note: order.forItem && item?.productId.startsWith('plan:') ? <IncludesNote title={order.forItem.title} /> : null }))
    return (
      <Shell order={<ThankYouRecap order={order} amount={headline(order.q, order.facts)} notes={laterNotes(order.q, order.facts)} extras={recapExtras} />}>
        <ThankYou order={order} />
      </Shell>
    )
  }

  if (params.get('state') === 'expired') {
    return <Unavailable detail="This checkout link has expired. Links from approval emails only work for a while, so ask us for a new one if you’d still like a place." />
  }
  if (route.error) return <Unavailable detail={route.error} title={route.product?.title} />
  if (route.kind === 'site-access' && viewer.siteAccess === 'active') {
    return <Unavailable detail={`You already have ${siteAccess.name.toLowerCase()}, so there’s nothing to buy here. Everything in the catalogue is open to you.`} />
  }

  if (!q) {
    return (
      <Centered>
        <EmptyState icon="cart" title="Your cart is empty" action={<Button href="/courses">Explore programmes</Button>}>
          Programmes, workshop tickets and downloads you add will show here.
        </EmptyState>
      </Centered>
    )
  }

  const renew = viewer.siteAccess === 'ended'
  const giftOn = gift && facts.oneTime
  const methods = availableMethods({ oneTimeOrder: facts.oneTime && q.then.length === 0, trial: facts.trial })
  const payMethod = methods.includes(method) ? method : 'card'
  const needsPayment = !q.free
  const zero = q.total === money(0)

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }
  const field = (key) => ({ value: form[key], onChange: (e) => set(key, e.target.value), error: errors[key] })

  const logIn = () => {
    if (!form.loginPassword) { setErrors((x) => ({ ...x, loginPassword: 'Enter your password.' })); document.getElementById('co-login-password')?.focus(); return }
    setLogInBusy(true)
    setTimeout(() => {
      setLogInBusy(false)
      if (form.loginPassword === 'wrong') {
        setErrors((x) => ({ ...x, loginPassword: 'That email and password don’t match.' }))
        set('loginPassword', '')
        document.getElementById('co-login-password')?.focus()
        return
      }
      update({ role: 'student', name: known?.name || viewer.name, email: form.email.trim(), verified: true })
    }, 700)
  }
  // Google, Apple or Facebook: the provider confirms who they are, so they're signed in straight away.
  const ssoSignIn = (provider) => {
    setSsoBusy(provider)
    setTimeout(() => { setSsoBusy(''); update({ role: 'student', name: 'Adnan Rahman', email: 'adnan@example.com', verified: true }) }, 800)
  }

  const applyCoupon = (raw) => {
    const code = raw.trim().toUpperCase()
    const invalid = couponError(code, q, codes) || (!code && couponNotApplicable)
    if (invalid) { setCouponMsg(invalid); return invalid }
    if (!quote(items, viewer, { ...options, coupon: [...codes, code] }).discounts.some((d) => d.code === code)) { setCouponMsg(couponNotApplicable); return couponNotApplicable }
    setCodes([...codes, code]) // saved in the checkout session with the next snapshot
    setCouponMsg(null)
    return null
  }

  // via: the accordion's method, or an express wallet ('apple-pay', 'google-pay', 'paypal').
  const validate = (via) => {
    const e = {}
    if (!signedIn) {
      if (stage === 'email') {
        e.email = 'Enter an email address like name@example.com.'
      } else if (stage === 'existing') {
        if (!linkSent) e.loginPassword = 'Log in to buy with your account, or change the email.'
      } else {
        if (!form.firstName.trim()) e.firstName = 'Enter your first name.'
        if (!form.lastName.trim()) e.lastName = 'Enter your last name.'
        if (!form.magicLink && !strongPassword(form.password)) e.password = 'Your password needs to meet all four rules below.'
      }
    }
    if (giftOn) {
      if (!form.giftName.trim()) e.giftName = 'Enter their name.'
      if (!validEmail(form.giftEmail)) e.giftEmail = 'Enter their email address.'
      if (!form.giftDate) e.giftDate = 'Choose the day we send it.'
      if (!form.giftTime) e.giftTime = 'Choose the time we send it.'
    }
    if (cohortChoice && !cohortPicked) e.cohort = 'Every cohort is full right now. Join the waitlist on the programme page and we’ll email you.'
    if (!form.country) e.country = 'Choose your country.'
    if (needsPayment && via === 'card') {
      const n = digits(form.cardNumber)
      if (n.length < 13 || n.length > 19) e.cardNumber = 'Enter the long number on the front of your card.'
      if (!/^\s*(0[1-9]|1[0-2])\s*\/?\s*\d{2}\s*$/.test(form.cardExpiry)) e.cardExpiry = 'Enter the expiry date as MM / YY.'
      if (!/^\d{3,4}$/.test(form.cardCvc.trim())) e.cardCvc = 'Enter the 3 or 4 digit code.'
    }
    if (!form.terms) e.terms = 'Agree to the terms of use and refund policy to continue.'
    if (facts.agreement && !form.agreement) e.agreement = 'Tick this to confirm before you continue.'
    return e
  }

  const placeOrder = (via) => {
    if (processing) return
    const e = validate(via)
    setErrors(e)
    if (Object.keys(e).length) {
      requestAnimationFrame(() => document.querySelector('.co-form [aria-invalid="true"]')?.focus())
      return
    }
    setFailed(false)
    setProcessing(true)
    setTimeout(() => {
      setProcessing(false)
      if (needsPayment && via === 'card' && digits(form.cardNumber) === declinedCard) {
        setFailed(true)
        requestAnimationFrame(() => failRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
        return
      }
      const pending = needsPayment && via === 'bank'
      const accessBought = q.siteAccessAdded || route.kind === 'site-access'
      setOrder({
        q, facts, method: needsPayment ? via : 'free', lineItems: lines, forItem,
        opens: forItem?.href ? forItem : null,
        email: signedIn ? viewer.email : form.email.trim(),
        newAccount: !signedIn, magicLink: form.magicLink, accessBought,
        gift: giftOn ? { name: form.giftName.trim(), email: form.giftEmail.trim(), date: form.giftDate, time: form.giftTime } : null,
      })
      completeCheckoutSession(checkoutToken)
      if (route.kind === 'cart') cart.complete()
      const patch = {}
      if (!signedIn) Object.assign(patch, { role: 'student', name: joinName(form.firstName, form.lastName), email: form.email.trim(), verified: false })
      if (!pending && accessBought) patch.siteAccess = 'active'
      if (!pending && facts.planId) Object.assign(patch, { role: 'member', plan: facts.planId })
      if (Object.keys(patch).length) update(patch)
      window.scrollTo({ top: 0 })
    }, 1100)
  }

  const submit = (event) => {
    event.preventDefault()
    placeOrder(payMethod)
  }

  const retry = () => {
    setFailed(false)
    const target = document.getElementById('co-payment')
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const input = target?.querySelector('.co-cardgroup-input') || target?.querySelector('input')
    input?.focus({ preventScroll: true })
  }

  let buttonLabel = `Pay ${q.total}`
  if (q.free) buttonLabel = 'Get access for free'
  else if (facts.trial) buttonLabel = zero ? 'Start free trial' : `Start free trial and pay ${q.total}`
  else if (facts.preOrder) buttonLabel = `Pre-order for ${q.total}`
  else if (zero) buttonLabel = 'Complete order'
  else if (payMethod === 'bank') buttonLabel = `Place order for ${q.total}`
  else if (payMethod === 'paypal') buttonLabel = `Pay ${q.total} with PayPal`
  else if (payMethod === 'apple-pay') buttonLabel = `Pay ${q.total} with Apple Pay`
  else if (payMethod === 'google-pay') buttonLabel = `Pay ${q.total} with Google Pay`
  else if (payMethod === 'klarna') buttonLabel = 'Continue with Klarna'

  const notes = []
  if (facts.preOrder) notes.push(`Charged today. ${facts.preOrder.title} opens ${facts.preOrder.releases}.`)
  if (payMethod === 'bank' && needsPayment) notes.push('Your access opens once we confirm your transfer.')
  if (cohortPicked) notes.push(`You’re joining the ${cohortPicked.name} cohort, starting ${cohortPicked.dates.split(' – ')[0]}.`)

  // "By subscribing, you allow Halvera to charge you $49.00 / month until you cancel."
  const phrases = q.then.map(charge).filter(Boolean)
    .map((c) => (/ for \d+ more /.test(c) ? c : `${c}${forAccess(q, facts)} until you cancel`))
  const authorisation = needsPayment && payMethod !== 'bank' && phrases.length
    ? `${facts.trial ? 'By starting your trial' : q.hasSolo ? 'By subscribing' : 'By paying today'}, you allow ${school.name} to charge you ${phrases.join(' and ')}${facts.trial ? ', starting when your trial ends' : ''}.`
    : null

  // "Change" on each line that has other prices: plans (monthly, yearly, lifetime), site access
  // (yearly, lifetime), courses (one payment, instalments), newsletters, library items.
  const lines = lineItems(q, items, options)
  const cartCheckout = route.kind === 'cart'
  const choosePrice = (item, priceId) => {
    if (priceId === item.priceId) return
    if (item.gate) { setAccessPrice(priceId); return }
    if (cartCheckout) {
      // Same item shape (keeps a pay-what-you-want amount); the drawer stays closed.
      cart.add({ ...item, priceId })
      cart.closeCart()
      return
    }
    const next = new URLSearchParams(params)
    next.set('price', priceId)
    setParams(next, { replace: true })
  }
  // Buying one product: its prices sit at the top of the order panel ("How you pay").
  const mainIndex = cartCheckout ? -1 : lines.findIndex((item) => item && !item.gate && priceChoices(item))
  const mainItem = mainIndex >= 0 ? lines[mainIndex] : null
  const topPicker = mainItem && (
    <PricePicker
      name={q.lines[mainIndex].name} choice={priceChoices(mainItem)} value={mainItem.priceId}
      onChoose={(priceId) => choosePrice(mainItem, priceId)}
    />
  )
  const extras = lines.map((item, i) => {
    if (!item) return null
    const choice = i === mainIndex ? null : priceChoices(item, { cart: cartCheckout && !item.gate })
    // Cart checkouts: how many copies of a library item (one-time prices only).
    const qty = cartCheckout && !item.gate && allowsQuantity(item) ? (
      <QuantityStepper
        className="co-line-qty" name={resolveItem(item).title} value={quantityOf(item)}
        onChange={(n) => cart.setQuantity(item.productId, n)}
      />
    ) : null
    const includes = includesFor(item)
    const note = includes || qty ? <>{includes}{qty}</> : null
    if (!choice) return note ? { note } : null
    const key = item.gate ? 'site-access' : item.productId
    const name = q.lines[i].name
    const isOpen = openLine === key
    return {
      note,
      sub: <ChangeToggle id={key} name={name} open={isOpen} onToggle={() => setOpenLine(isOpen ? null : key)} />,
      below: (
        <PriceOptions
          id={key} name={name} choice={choice} value={item.priceId} open={isOpen}
          onChoose={(priceId) => choosePrice(item, priceId)}
          onAlone={() => cart.remove(item.productId)}
        />
      ),
    }
  })
  // The site access step's "Change" opens the same control in the order panel.
  const openAccessChoice = () => {
    setDetailsOpen(true)
    setOpenLine('site-access')
    requestAnimationFrame(() => {
      const panel = document.getElementById(switchId('site-access'))
      panel?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      panel?.querySelector('input:checked')?.focus({ preventScroll: true })
    })
  }


  // What the order panel calls this purchase: one item by name ("Try …" for trials), or a count.
  const chosen = q.lines.slice(q.siteAccessAdded ? 1 : 0, options.bump ? -1 : undefined)
  let label = chosen.length === 1 ? `${facts.trial ? 'Try ' : ''}${chosen[0].name}` : `Your order · ${chosen.length} items`
  if (route.kind === 'site-access') label = renew ? `Renew your ${siteAccess.name.toLowerCase()}` : siteAccess.name

  return (
    <Shell
      order={(
        <SummaryPanel
          q={q} label={label} amount={headline(q, facts)} notes={laterNotes(q, facts)}
          extras={extras} detailsOpen={detailsOpen} onDetailsOpen={setDetailsOpen} top={topPicker}
          promo={q.free ? null : { error: couponMsg, onApply: applyCoupon, onRemove: (code) => { setCodes((list) => list.filter((c) => c !== code)); setCouponMsg(null) }, onCancel: () => setCouponMsg(null) }}
        />
      )}
    >
      <form className="co-form" noValidate onSubmit={submit} aria-label="Checkout">
        {failed && (
          <div ref={failRef}>
            <Notice
              tone="danger" title="Your payment didn’t go through"
              action={<Button variant="secondary" size="sm" onClick={retry}>Try again</Button>}
            >
              Your bank declined it, so you haven’t been charged. Check your card details, or choose another way to pay.
            </Notice>
          </div>
        )}

        {!signedIn && (
          <div className="co-express">
            <p className="t-body-sm t-muted" id="co-sso-title">Log in or create your account in one step</p>
            <div role="group" aria-labelledby="co-sso-title">
              <SocialButtons row onPick={ssoSignIn} busy={ssoBusy} />
            </div>
            <p className="co-or t-body-sm t-muted"><span>or</span></p>
          </div>
        )}

        <AccountStep
          viewer={viewer} signedIn={signedIn} onSignOut={signOut}
          field={field} form={form} set={set}
          stage={stage} account={known}
          onLogIn={logIn} logInBusy={logInBusy} linkSent={linkSent} onSendLink={() => setLinkSent(true)}
        />

        {route.kind === 'site-access' && (
          <SiteAccessStep mode="standalone" renew={renew} priceId={items[0].priceId} onChangePrice={openAccessChoice} />
        )}
        {q.siteAccessAdded && (
          <SiteAccessStep mode="gate" renew={renew} priceId={options.siteAccessPriceId} onChangePrice={openAccessChoice} />
        )}

        {facts.oneTime && <GiftStep on={gift} onToggle={setGift} field={field} />}

        {cohortChoice && (
          <CohortStep choice={cohortChoice} value={cohortPicked?.id} onChange={(id) => { setCohortId(id); setErrors((x) => ({ ...x, cohort: undefined })) }} error={errors.cohort} />
        )}

        <BillingStep field={field} form={form} set={set} />

        {needsPayment && (
          <PaymentStep methods={methods} method={payMethod} onMethod={setMethod} field={field} trial={facts.trial} />
        )}

        {showBump && <OrderBump checked={bump} onChange={setBump} />}

        <AgreementsStep
          agreement={facts.agreement} form={form} set={set} errors={errors}
          buttonLabel={buttonLabel} processing={processing} note={notes.join(' ')}
          blocked={signedIn ? null : stage === 'email' ? 'Enter your email above to continue.' : stage === 'existing' && !linkSent ? 'Log in above to continue.' : null}
          authorisation={authorisation} canSave={needsPayment}
        />
      </form>
    </Shell>
  )
}
