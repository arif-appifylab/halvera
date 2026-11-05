import { useId, useState } from 'react'
import { Icon, Button, PriceTag, TextField, Badge } from '@/design-system'
import { siteAccess } from '@/lib/access.js'
import { productHref } from '@/lib/products.js'
import { getPlan, plans } from '@/data/plans.js'
import PlanPicker from '@/components/PlanPicker.jsx'
import './access-gate.css'

// One screen for every reason a visitor can't open something yet. `state` comes from
// contentAccess() or lessonLock() in src/lib/access.js. Built only from design-system parts.
//
//   signin · verify · site-access-ended · purchase · membership · upgrade · private · pending
//   password · pre-order · drip · prereq
//
// 'membership' and 'upgrade' show the plan picker inside the gate, so the student picks a plan and goes
// straight to checkout. `forRef` is passed to checkout as `for=` (defaults to the product's slug).

const ICON = {
  signin: 'lock', verify: 'mail', 'site-access-ended': 'lock', purchase: 'lock', membership: 'users',
  upgrade: 'sparkle', private: 'lock', pending: 'clock', password: 'lock', 'pre-order': 'calendar',
  drip: 'calendar', prereq: 'check-circle',
}

export default function AccessGate({ state, product, lesson, unlockDate, previousLesson, viewer, onUnlock, compact, forRef, inPage }) {
  const titleId = useId()
  const [requested, setRequested] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const next = typeof window !== 'undefined' ? window.location.pathname : '/'
  const s = state === 'private' && requested ? 'pending' : state

  const plansIncluding = product?.plans ? plans.filter((p) => product.plans.includes(p.id)) : []
  const currentPlan = viewer?.plan ? getPlan(viewer.plan) : null
  const accessPrice = siteAccess.prices.find((p) => p.default) || siteAccess.prices[0]

  const picker = plansIncluding.length > 0 && (
    <div className="gate-picker">
      <PlanPicker product={product} forRef={forRef ?? product.slug} viewer={viewer} compact />
    </div>
  )

  let title, body, actions, extra
  switch (s) {
    case 'signin':
      title = `Log in to open ${product ? product.title : 'this page'}`
      body = 'Your programmes, bookings and progress are saved in your account.'
      actions = <><Button href={'/login?next=' + encodeURIComponent(next)}>Log in</Button><Button variant="secondary" href={'/signup?next=' + encodeURIComponent(next)}>Create an account</Button></>
      break
    case 'verify':
      title = 'Confirm your email to continue'
      body = `We sent a 6-digit code to ${viewer?.email || 'your email'}. Enter it to open your programmes.`
      actions = <><Button href="/verify-email">Enter the code</Button><Button variant="ghost">Send a new code</Button></>
      break
    case 'site-access-ended':
      title = `Renew your ${siteAccess.name.toLowerCase()} to open this`
      body = 'Your site access ended on Sun 12 Oct, so your programmes are locked for now. Your progress is saved and comes back when you renew.'
      extra = <PriceTag {...accessPrice.price} />
      actions = <><Button href="/site-access">Renew {siteAccess.name.toLowerCase()}</Button><Button variant="ghost" href="/student/dashboard/profile/payments">View payments</Button></>
      break
    case 'purchase':
      title = lesson ? `This lesson is part of ${product.title}` : `Enrol to open ${product.title}`
      body = 'Enrol to unlock every lesson. Lessons marked Free preview are open to everyone.'
      extra = product.prices[0] && <PriceTag {...product.prices[0].price} />
      actions = <><Button href={productHref(product)}>See prices and enrol</Button></>
      break
    case 'membership':
      title = 'Included in a membership'
      body = `${product.title} can’t be bought on its own. Join to open it, along with everything else in your plan.`
      extra = picker
      actions = !picker && <Button href="/memberships">Compare memberships</Button>
      break
    case 'upgrade':
      title = `Upgrade to open ${product.title}`
      body = `Your ${currentPlan ? currentPlan.name : 'current'} plan doesn’t include this. Upgrade to a plan that does and it opens straight after checkout.`
      extra = picker
      actions = !picker && <Button href="/memberships">Upgrade your plan</Button>
      break
    case 'private':
      title = `${product.title} is by application`
      body = 'Tell us a little about you and we’ll reply within 2 working days. You won’t be charged unless you’re accepted.'
      actions = <><Button onClick={() => setRequested(true)}>Request access</Button><Button variant="ghost" href="/appointment/consultation">Book a free call first</Button></>
      break
    case 'pending':
      title = 'Your request is with us'
      body = `We’ll email you at ${viewer?.email || 'your email address'} when ${product ? product.title : 'it'} is ready for you. Requests are usually answered within 2 working days.`
      extra = <Badge tone="info" icon="clock">Pending</Badge>
      actions = <Button variant="secondary" href="/courses">Explore other programmes</Button>
      break
    case 'password':
      title = 'This library is password protected'
      body = 'Enter the password from your retreat email to listen.'
      extra = (
        <form className="gate-form" onSubmit={(e) => { e.preventDefault(); if (password.trim().toLowerCase() === 'restore') { setError(null); if (onUnlock) onUnlock() } else setError('That password isn’t right. Check your retreat email and try again.') }}>
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} error={error} hint="Try “restore” in this preview." autoComplete="off" />
          <Button type="submit">Unlock</Button>
        </form>
      )
      break
    case 'pre-order':
      title = `${product.title} opens on ${product.releases}`
      body = 'Your pre-order is confirmed. We’ll email you the moment it opens, and it will appear in My programmes.'
      actions = <Button variant="secondary" href="/student/dashboard/profile/enrollments">Go to My programmes</Button>
      break
    case 'drip':
      title = `Unlocks on ${unlockDate}`
      body = 'Lessons in this programme open week by week, so you have time to try each change before the next.'
      actions = previousLesson && <Button variant="secondary" href={previousLesson.href}>Back to {previousLesson.title}</Button>
      break
    case 'prereq':
      title = 'Complete the previous lesson first'
      body = 'This programme goes in order. Finish the lesson before this one to open it.'
      actions = previousLesson && <Button href={previousLesson.href}>Go to {previousLesson.title}</Button>
      break
    default:
      return null
  }

  // A gate is the page's main heading, except when several are shown together.
  // inPage: the gate sits inside a page that already has its own title (a members-only blog post).
  const Heading = compact || inPage ? 'h2' : 'h1'

  return (
    <section className={'gate' + (compact ? ' is-compact' : '')} aria-labelledby={titleId}>
      <span className="gate-icon"><Icon name={ICON[s] || 'lock'} size={26} /></span>
      {product && !compact && <p className="gate-product">{lesson ? lesson.title : product.title}</p>}
      <Heading id={titleId} className="gate-title">{title}</Heading>
      <p className="gate-body">{body}</p>
      {extra && <div className="gate-extra">{extra}</div>}
      {actions && <div className="gate-actions">{actions}</div>}
    </section>
  )
}
