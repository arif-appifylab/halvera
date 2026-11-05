import { useState } from 'react'
import { Notice, Card, StatusBadge, Button, Icon } from '@/design-system'
import { orderNumber, upsell, bankTransfer } from '@/data/checkout.js'
import { siteAccess } from '@/lib/access.js'
import SummaryPanel from './SummaryPanel.jsx'

const orderStatus = (order) => (order.method === 'bank' ? 'Pending' : order.facts.trial ? 'Trialing' : order.q.free ? null : 'Paid')

// The order recap on the left of the thank-you shell: the same order panel, read-only.
export function ThankYouRecap({ order, amount, notes, extras }) {
  const status = orderStatus(order)
  return (
    <SummaryPanel
      q={order.q} amount={amount} notes={notes} labelAs="p" extras={extras}
      label={<>Order <span className="sg-code">{orderNumber}</span></>}
      status={status ? <StatusBadge status={status} /> : null}
      totalLabel={status === 'Pending' ? 'Total due' : status === 'Paid' ? 'Total paid' : 'Total due today'}
    />
  )
}

// The thank-you after checkout (right of the shell): confirmation, what happens next,
// a one-click upsell (Sell → Offers) and the way into the dashboard.
// order = { q, method, facts, email, newAccount, magicLink, gift, accessBought, opens }
//   opens: { title, href } the membership was bought for (the plan picker's `for=`), or null.
export default function ThankYou({ order }) {
  const { q, method, facts, email, newAccount, magicLink, gift, accessBought, opens } = order
  const [offer, setOffer] = useState('open') // open | added | declined
  const pending = method === 'bank'
  // A new account with a password confirms its email with a 6-digit code before anything opens. The
  // order is already paid and saved to the account; a wrong email is changed on the code screen.
  const confirmFirst = newAccount && !magicLink
  // The upsell flow is skipped for free prices, gifts, and PayPal, bank transfer and Klarna (no saved card
  // to charge in one click), as in the admin's Upsell flow rules.
  const showUpsell = !q.free && !facts.trial && !gift && !['paypal', 'bank', 'klarna'].includes(method)

  const next = [
    pending
      ? { icon: 'mail', text: `Your order and the bank details are on their way to ${email}. Your receipt and invoice PDF follow once your transfer arrives.` }
      : { icon: 'mail', text: `Your receipt is on its way to ${email}, with your invoice as a PDF.` },
  ]
  if (newAccount) {
    next.push({
      icon: 'user',
      text: magicLink
        ? `Use the sign-in link we sent to ${email}. It also confirms your email address.`
        : `Confirm your email: we’ve sent a 6-digit code to ${email}. Wrong address? You can change it on the next screen, and your order moves with it.`,
    })
  }
  if (pending) {
    next.push({ icon: 'clock', text: `Send your bank transfer with the reference ${orderNumber}. We’ll confirm it, ${bankTransfer.confirmTime}, then your access opens and we’ll email you.` })
  } else if (gift) {
    const when = gift.date ? new Date(`${gift.date}T${gift.time || '00:00'}`).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null
    next.push({ icon: 'calendar', text: `We’ll email ${gift.name} at ${gift.email}${when ? ` on ${when}` : ' on the date you chose'}, with a link to claim it.` })
  } else if (facts.preOrder) {
    next.push({ icon: 'calendar', text: `${facts.preOrder.title} opens ${facts.preOrder.releases}. We’ll email you the day it does.` })
  } else {
    next.push({ icon: 'check-circle', text: confirmFirst
      ? 'Everything you bought is saved to your account and opens as soon as your email is confirmed.'
      : 'Your access is ready now. Everything you bought is in your dashboard.' })
  }
  if (facts.trial && !pending) next.push({ icon: 'bell', text: 'Your free trial starts today. We’ll remind you 2 days before it ends.' })
  if (accessBought && !pending) next.push({ icon: 'leaf', text: `Your ${siteAccess.name.toLowerCase()} is active, so you can buy from Halvera any time.` })

  return (
    <div className="co-thanks">
      <header className="co-thanks-head">
        <span className={`co-thanks-mark${pending ? ' is-pending' : ''}`} aria-hidden="true">
          <Icon name={pending ? 'clock' : 'check'} size={24} />
        </span>
        <h1 className="t-heading-2">{pending ? 'Almost there' : 'Thank you'}</h1>
        <p className="t-body-lg t-muted">
          {pending ? 'Your order is placed. We’re waiting for your bank transfer.' : 'Your order is confirmed and we’ve emailed your receipt.'}
        </p>
      </header>

      <section className="co-section" aria-labelledby="co-next-title">
        <h2 className="t-heading-4" id="co-next-title">What happens next</h2>
        <ul className="pg-ticks co-next">
          {next.map((s) => (
            <li key={s.text}><Icon name={s.icon} size={20} /><span>{s.text}</span></li>
          ))}
        </ul>
      </section>

      {showUpsell && offer === 'open' && (
        <Card tone="clay" padding="lg" className="co-upsell">
          <p className="sg-eyebrow">One more thing</p>
          <h2 className="t-heading-3">{upsell.title}</h2>
          <p className="t-body-sm t-muted">{upsell.text}</p>
          <div className="pg-row">
            <Button variant="secondary" onClick={() => setOffer('added')}>Add to my order</Button>
            <Button variant="ghost" onClick={() => setOffer('declined')}>No thanks</Button>
          </div>
        </Card>
      )}
      {offer === 'added' && <Notice tone="success" title="Added to your order">{upsell.added}</Notice>}

      <div className="co-thanks-actions">
        {confirmFirst ? (
          <>
            <Button href="/verify-email" size="lg" block iconEnd="arrow-right">Confirm my email</Button>
            <Button href="/student/dashboard" variant="secondary" block>Go to my dashboard</Button>
          </>
        ) : opens?.href && !pending ? (
          <>
            <Button href={opens.href} size="lg" block iconEnd="arrow-right">Open {opens.title}</Button>
            <Button href="/student/dashboard" variant="secondary" block>Go to my dashboard</Button>
          </>
        ) : (
          <>
            <Button href="/student/dashboard" size="lg" block iconEnd="arrow-right">Go to my dashboard</Button>
            <Button href="/courses" variant="ghost" block>Keep browsing</Button>
          </>
        )}
      </div>
    </div>
  )
}
