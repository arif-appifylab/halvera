// Pieces shared by the newsletter home and post pages.
import { useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Button, Checkbox, Icon, Notice, PriceTag, RadioCard, Select, StatusBadge, TextField } from '@/design-system'
import { school } from '@/data/school.js'
import { checkoutHref, paidPrices, TIER_PREVIEW, upgradeLabel } from './reader.js'

const EMAIL = /^\S+@\S+\.\S+$/

// Free-tier sign-up. Known readers don't retype their email. Consent is never pre-ticked.
export function SubscribeForm({ newsletter, reader, variant = 'primary', label = 'Subscribe free', onDone, compact }) {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(null)

  const submit = (e) => {
    e.preventDefault()
    const to = reader.known ? reader.email : email.trim()
    const next = {}
    if (!reader.known && !EMAIL.test(to)) next.email = 'Enter an email address like name@example.com.'
    if (!consent) next.consent = 'Tick the box so we can email you.'
    setErrors(next)
    if (Object.keys(next).length) return
    setSent(to)
    onDone?.(to)
  }

  if (sent) {
    return (
      <Notice tone="success" title="Check your inbox to confirm">
        We sent a link to {sent}. Open it to confirm, and {newsletter.name} will arrive {newsletter.cadence.replace(/^Every/, 'every')}.
      </Notice>
    )
  }

  return (
    <form className={'nlp-form' + (compact ? ' is-compact' : '')} onSubmit={submit} noValidate>
      {reader.known ? (
        <p className="t-body-sm t-muted">We’ll send it to <strong className="nlp-ink">{reader.email}</strong>.</p>
      ) : (
        <TextField
          label="Email address" type="email" autoComplete="email" placeholder="you@example.com" iconStart="mail"
          value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email}
        />
      )}
      <Checkbox
        label={`Send me ${newsletter.name} and occasional news from ${school.name}`}
        description="Unsubscribe at any time. We never share your email."
        checked={consent} onChange={(e) => setConsent(e.target.checked)} error={errors.consent}
      />
      <div>
        <Button type="submit" variant={variant} iconStart="mail">{label}</Button>
      </div>
    </form>
  )
}

// Pick a paid price (RadioCards) and go to checkout. `tier` limits it to one tier.
export function TierPicker({ product, newsletter, reader, tier, forRef, primary = true, legend = 'Choose a tier' }) {
  const name = useId()
  const prices = paidPrices(product, tier)
  const [pick, setPick] = useState(prices[0]?.id)
  const selected = prices.find((p) => p.id === pick) || prices[0]
  if (!selected) return null
  const tierName = (p) => newsletter.tiers.find((t) => t.id === p.tier)?.name
  const replacing = reader.paid && selected.tier !== 'paid'

  return (
    <div className="nlp-picker">
      <fieldset className="nlp-picker-options">
        <legend className="nlp-legend">{legend}</legend>
        {prices.map((p) => (
          <RadioCard
            key={p.id}
            name={name}
            value={p.id}
            checked={p.id === selected.id}
            onChange={() => setPick(p.id)}
            title={p.label}
            badge={p.id === 'yearly' ? <Badge tone="accent">Best value</Badge> : null}
            description={[!tier && tierName(p), p.trialDays && !reader.trialUsed ? p.price.note : p.id !== 'monthly' ? p.price.note : null].filter(Boolean).join(' · ')}
            meta={<PriceTag amount={p.price.amount} interval={p.price.interval} size="sm" />}
          />
        ))}
      </fieldset>
      <Button variant={primary ? 'primary' : 'secondary'} block href={checkoutHref(product, selected.id, forRef)} iconEnd="arrow-right">
        {upgradeLabel(selected, reader, 'Upgrade to read')}
      </Button>
      <p className="t-body-sm t-muted nlp-center">
        {replacing ? 'Your current subscription is replaced and the difference is prorated.'
          : selected.trialDays && !reader.trialUsed ? `Cancel before the ${selected.trialDays} days are up and you pay nothing.`
          : 'Cancel any time from your account.'}
      </p>
    </div>
  )
}

// "You're subscribed · Free", "Paid · trial ends …", "Your paid subscription ended on …".
export function SubscriptionStatus({ newsletter, product, reader, onResume, primary }) {
  const d = newsletter.dates
  const monthly = product.prices.find((p) => p.id === 'monthly')
  const manageEmail = <a className="nlp-link" href="/student/dashboard/settings">Manage emails</a>
  const manageBilling = <a className="nlp-link" href="/student/dashboard/profile/payments">Manage subscription</a>
  const planLine = reader.plan && (
    <p className="t-body-sm">Your {reader.plan.name} membership includes the paid edition, so every post is open to you here.</p>
  )

  let badge, title, body, actions
  switch (reader.status) {
    case 'free':
      badge = <Badge tone="success" icon="check">Subscribed</Badge>
      title = 'You’re subscribed · Free'
      body = `The free letter arrives ${newsletter.cadence.replace(/^Every/, 'every')}.`
      actions = manageEmail
      break
    case 'trial':
      badge = <StatusBadge status="Trialing" />
      title = `Paid · trial ends ${d.trialEnds}`
      body = `Then ${monthly.price.amount} / ${monthly.price.interval}. Cancel before ${d.trialEnds} and you pay nothing.`
      actions = manageBilling
      break
    case 'paid':
      badge = <StatusBadge status="Active" />
      title = `Paid · renews ${d.renews}`
      body = 'Every post and the whole archive are open to you.'
      actions = manageBilling
      break
    case 'supporter':
      badge = <StatusBadge status="Active" />
      title = `Founding supporter · renews ${d.supporterRenews}`
      body = 'Thank you. Every post, the archive and the supporters’ letters are open to you.'
      actions = manageBilling
      break
    case 'paused':
      badge = <StatusBadge status="Paused" />
      title = `Paid · paused until ${d.pausedUntil}`
      body = 'You still get the free letter. Paid posts open again when your subscription resumes.'
      actions = <><Button size="sm" variant={primary ? 'primary' : 'secondary'} onClick={onResume}>Resume now</Button>{manageBilling}</>
      break
    case 'ended':
      badge = <StatusBadge status="Cancelled" />
      title = `Your paid subscription ended on ${d.ended}`
      body = 'You’re still on the free letter. Restart any time and the whole archive opens again.'
      actions = manageBilling
      break
    case 'unsubscribed':
      badge = <Badge tone="neutral" icon="minus">Unsubscribed</Badge>
      title = `You unsubscribed on ${d.unsubscribed}`
      body = 'You won’t get the letter by email. Free posts are still here to read.'
      break
    default:
      if (!reader.plan) return null
      badge = <Badge tone="primary" icon="users">Membership</Badge>
      title = 'Included in your membership'
  }

  return (
    <div className="nlp-status" role="status">
      <div className="nlp-status-head">{badge}<p className="t-heading-4">{title}</p></div>
      {body && <p className="t-body-sm t-muted">{body}</p>}
      {planLine}
      {actions && <div className="pg-row">{actions}</div>}
    </div>
  )
}

// Theme preview only: switch the reader's subscription (?tier=). Not part of a school's site.
export function PreviewSwitch({ signedIn }) {
  const [params, setParams] = useSearchParams()
  const change = (e) => {
    const next = new URLSearchParams(params)
    if (e.target.value) next.set('tier', e.target.value)
    else next.delete('tier')
    setParams(next, { replace: true })
  }
  return (
    <aside className="nlp-preview" aria-label="Theme preview">
      <Icon name="eye" size={18} />
      <Select
        label="Preview the newsletter as"
        value={params.get('tier') || ''}
        onChange={change}
        options={[{ value: '', label: signedIn ? 'From the account' : 'Visitor' }, ...TIER_PREVIEW]}
        hint="Theme preview only. Combine with Preview as in the corner for members."
      />
    </aside>
  )
}
