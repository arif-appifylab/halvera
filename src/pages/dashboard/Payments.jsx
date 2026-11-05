// Student dashboard → Payments (/student/dashboard/profile/payments). Built from the account
// (src/lib/student.js), so every order matches what the student owns:
//   Orders        every order, with its details: lines, coupon, VAT, how it was paid, refunds,
//                 and the invoice, receipt and credit note
//   Subscriptions memberships, site access, payment plans and paid newsletters. Cancel (with the
//                 school's offers, including a pause: the only place a pause is offered)
//   Payment methods  the saved card (update opens the gateway's card form)
//   Pending       bank transfers waiting on the student: details, and a reference or proof to add
// URL: ?tab=orders | subscriptions | methods | pending, ?cancel=<subscription id>, ?update=card,
// ?state=loading | error | empty.
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, DataTable, EmptyState, Icon, Modal, Notice, Skeleton, StatusBadge, Tabs, TextField } from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { siteAccess } from '@/lib/access.js'
import { ordersFor, subscriptionsFor, membershipsFor, fullDate } from '@/lib/student.js'
import { bankDetails, cancelEffects, cancelOffers, paymentMethod } from '@/data/dashboard-extra.js'
import { membershipChanges, useMembershipChanges } from '@/lib/membership-changes.js'
import CancelFlow from './CancelFlow.jsx'
import './account-pages.css'

const KIND = { membership: 'Membership', 'site-access': 'Site access', plan: 'Payment plan', newsletter: 'Newsletter', course: 'Course subscription' }
const NEXT = { membership: 'Next charge', 'site-access': 'Renews', plan: 'Next payment', newsletter: 'Next charge', course: 'Next charge' }

// The subscriptions this viewer has, in the order they matter. Memberships carry any change the
// member made (a switch waiting, cancelling, an offer taken), the same as on the Membership tab.
function buildSubscriptions(viewer, changes) {
  const members = Object.fromEntries(membershipsFor(viewer, changes).map((m) => [m.id, m]))
  return subscriptionsFor(viewer)
    .filter((s) => s.kind !== 'site-access' || (siteAccess.enabled && viewer.siteAccess !== 'none'))
    .map((s) => {
      // A subscription in its free trial: the next charge is the first one, and it can be activated now.
      const base = { ...s, kind: KIND[s.kind], nextLabel: s.status === 'Trialing' ? 'First charge' : NEXT[s.kind], canCancel: s.kind !== 'plan', canActivate: s.status === 'Trialing' && !s.memberOnly }
      const m = members[s.id]
      if (m) {
        return {
          ...base, name: `${m.plan.name} membership`, price: m.priceLabel, status: m.status, membership: m,
          nextLabel: m.cancel ? 'Ends' : 'Next charge',
          detail: m.pendingSwitch ? `Switching to ${m.pendingSwitch.planName} (${m.pendingSwitch.priceLabel}) on ${fullDate(m.nextAt)}` : m.offer ? m.offer.result.detail : null,
        }
      }
      if (s.kind === 'site-access' && viewer.siteAccess === 'ended') return { ...base, status: 'Expired', nextLabel: 'Ended', next: 'Sun 12 Oct', ended: true, canCancel: false }
      return base
    })
}

// What the cancel flow says for a subscription: its end date, offers, and what stops or stays.
function cancelSubFor(s) {
  const m = s.membership
  return {
    id: s.id, kind: s.kind, name: s.name, next: m ? fullDate(m.nextAt) : s.nextAt ? fullDate(s.nextAt) : s.next,
    offers: cancelOffers[s.id] || [],
    pendingSwitch: m?.pendingSwitch?.planName,
    loses: m ? [...m.included.map((i) => i.title), ...(m.allowance ? ['Your monthly consultation'] : [])] : cancelEffects[s.id] || [],
    keeps: m ? ['Everything you bought on its own', 'Your progress, notes and certificates', 'Bookings you’ve already made'] : [],
  }
}

const hasInvoice = (o) => ['Paid', 'Partially refunded', 'Refunded'].includes(o.status)

// ---------------------------------------------------------------- Card modal

function CardModal({ title, onClose, onSave, name }) {
  const [form, setForm] = useState({ name, number: '', expiry: '', cvc: '' })
  const [error, setError] = useState('')
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const save = (e) => {
    e.preventDefault()
    if (!form.number.trim()) return setError('Enter your card number')
    onSave()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="ap-card-form">Save card</Button>
        </>
      )}
    >
      <form id="ap-card-form" className="pg-stack-sm" onSubmit={save} noValidate>
        <TextField label="Name on card" autoComplete="cc-name" value={form.name} onChange={set('name')} />
        <TextField label="Card number" inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" value={form.number} onChange={set('number')} error={error} iconStart="card" />
        <div className="ap-two">
          <TextField label="Expiry date" placeholder="MM / YY" autoComplete="cc-exp" value={form.expiry} onChange={set('expiry')} />
          <TextField label="Security code" inputMode="numeric" autoComplete="cc-csc" placeholder="CVC" value={form.cvc} onChange={set('cvc')} />
        </div>
        <p className="ap-rule t-caption t-muted"><Icon name="lock" size={16} />Card details go straight to our payment provider, Stripe. We never see or store your full card number.</p>
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------- Tabs

function OrdersTab({ orders, onOpen }) {
  const columns = [
    { key: 'id', label: 'Order', render: (o) => <span className="ap-nowrap">{o.id}</span> },
    { key: 'date', label: 'Date', render: (o) => <span className="ap-nowrap">{o.date}</span> },
    { key: 'item', label: 'Item', render: (o) => (<><span>{o.title}</span><span className="ap-cell-note">{o.lines.length > 1 ? [`${o.cart ? 'Cart' : 'Order'} · ${o.lines.length} items`, ...[...new Set(o.lines.map((l) => l.role).filter(Boolean))].map((r) => `with ${r === 'Upsell' ? 'an upsell' : 'an order bump'}`)].join(' · ') : o.note || o.lines[0].detail}</span></>) },
    { key: 'total', label: 'Total', align: 'end' },
    { key: 'status', label: 'Status', render: (o) => <StatusBadge status={o.status} /> },
    { key: 'view', label: <span className="sg-sr">Details</span>, render: (o) => <Button size="sm" variant="ghost" onClick={() => onOpen(o)}>View<span className="sg-sr"> order {o.id}</span></Button> },
  ]
  return (
    <DataTable
      caption="Your orders"
      columns={columns}
      rows={orders}
      empty={(
        <EmptyState icon="file" title="No orders yet" action={<Button variant="secondary" href="/courses">Explore programmes</Button>}>
          When you buy a programme, a ticket or a download, the receipt and invoice appear here.
        </EmptyState>
      )}
    />
  )
}

// One order: what was bought, the money, how it was paid, and its documents.
function OrderModal({ order, onClose }) {
  if (!order) return null
  return (
    <Modal open onClose={onClose} title={`Order ${order.id}`} footer={<Button onClick={onClose}>Done</Button>}>
      <div className="pg-stack">
        <div className="pg-row-between">
          <p className="t-body-sm t-muted">{order.date} · {order.method}</p>
          <StatusBadge status={order.status} />
        </div>
        {order.cart && <p className="t-body-sm">Bought together from your cart · {order.lines.length} items</p>}
        {order.note && <p className="t-body-sm">{order.note}</p>}
        <table className="ap-order">
          <tbody>
            {order.lines.map((l) => (
              <tr key={l.title}><td><span className="t-strong">{l.title}</span>{l.role && <> <Badge tone={l.role === 'Upsell' ? 'accent' : 'primary'}>{l.role}</Badge></>}{l.detail && <span className="ap-cell-note">{l.detail}</span>}</td><td className="ap-order-amt">{l.amountLabel}</td></tr>
            ))}
            {order.discount && <tr><td>Code {order.discount.code}</td><td className="ap-order-amt">{order.discount.amount}</td></tr>}
            <tr className="ap-order-total"><td>Total</td><td className="ap-order-amt">{order.total}</td></tr>
            <tr><td className="t-body-sm t-muted">Includes VAT (20%)</td><td className="ap-order-amt t-body-sm t-muted">{order.tax}</td></tr>
          </tbody>
        </table>
        {order.refund && (
          <Notice tone="info" title={`${order.refund.amount} refunded on ${order.refund.date}`}>
            {order.refund.for ? `For ${order.refund.for}.` : null}
          </Notice>
        )}
        {order.status === 'Pending' && (
          <Notice tone="warning" title="Waiting for your bank transfer">Use the reference {order.reference}. It opens once the payment arrives.</Notice>
        )}
        {hasInvoice(order) && (
          <div className="ap-actions">
            <Button size="sm" variant="secondary" iconStart="download" href="/files/sample-invoice.pdf" download>Invoice</Button>
            <Button size="sm" variant="ghost" iconStart="download" href="/files/sample-invoice.pdf" download>Receipt</Button>
            {order.refund && <Button size="sm" variant="ghost" iconStart="download" href="/files/sample-invoice.pdf" download>Credit note</Button>}
          </div>
        )}
      </div>
    </Modal>
  )
}

// Bank transfers waiting on the student (Sell → Manual payments: buyers add a reference or proof
// from their account).
function PendingTab({ orders }) {
  const [sent, setSent] = useState({})
  if (!orders.length) {
    return <EmptyState icon="check-circle" title="Nothing waiting">Bank transfers you choose at checkout show here until the payment arrives.</EmptyState>
  }
  return (
    <div className="pg-stack">
      {orders.map((o) => (
        <Card key={o.id} as="article" className="pg-stack" aria-labelledby={`pend-${o.id}`}>
          <div className="pg-row-between">
            <div>
              <h2 id={`pend-${o.id}`} className="t-heading-4">{o.title}</h2>
              <p className="t-body-sm t-muted">Order {o.id} · placed {o.date}</p>
            </div>
            <p className="t-heading-3">{o.total}</p>
          </div>
          <dl className="pg-facts">
            <dt>Pay to</dt><dd>{bankDetails.name}</dd>
            <dt>Sort code</dt><dd dir="ltr">{bankDetails.sortCode}</dd>
            <dt>Account</dt><dd dir="ltr">{bankDetails.account}</dd>
            <dt>IBAN</dt><dd dir="ltr">{bankDetails.iban}</dd>
            <dt>Reference</dt><dd><code className="sg-code" dir="ltr">{o.reference}</code></dd>
          </dl>
          {sent[o.id] ? (
            <Notice tone="success" title="Thanks, we’ve got it">We’ll check it against our bank and email you when it opens, usually within 2 working days.</Notice>
          ) : (
            <form className="pg-stack-sm" onSubmit={(e) => { e.preventDefault(); setSent({ ...sent, [o.id]: true }) }}>
              <p className="t-strong">Already paid?</p>
              <TextField label="Your bank’s payment reference" optional hint="It helps us find your payment faster." />
              <label className="ap-file">
                <span className="t-body-sm t-strong">Proof of payment <span className="t-muted">(optional)</span></span>
                <input type="file" accept="image/*,application/pdf" />
                <span className="t-caption t-muted">A screenshot or PDF of the transfer.</span>
              </label>
              <div><Button type="submit" variant="secondary">Send to the school</Button></div>
            </form>
          )}
        </Card>
      ))}
    </div>
  )
}

function SubscriptionCard({ sub, override, onCancel, onKeep, onActivate }) {
  const s = { ...sub, ...override }
  return (
    <Card as="article" className="ap-sub" aria-labelledby={'sub-' + s.id}>
      <div className="ap-sub-head">
        <div>
          <p className="t-caption t-muted">{s.kind}</p>
          <h2 id={'sub-' + s.id} className="t-heading-4">{s.name}</h2>
        </div>
        <StatusBadge status={s.status}>{s.label}</StatusBadge>
      </div>
      <dl className="pg-facts">
        <dt>Price</dt><dd>{s.price}</dd>
        {!override?.status || override.status === 'Active' || override.status === 'Trialing'
          ? <><dt>{s.nextLabel}</dt><dd>{s.nextAt && !s.ended ? fullDate(s.nextAt) : s.next}</dd></>
          : null}
        {s.detail && <><dt>Details</dt><dd>{s.detail}</dd></>}
      </dl>

      {s.ended && (
        <div className="ap-sub-ended">
          <p className="t-body-sm">
            {siteAccess.whenEnds === 'lock'
              ? 'Your programmes are locked until you renew. Nothing you have done is lost.'
              : 'You keep what you bought. Renew to buy new programmes.'}
          </p>
          <Button href="/site-access">Renew site access</Button>
        </div>
      )}

      {s.membership && (
        <div className="ap-actions">
          <Button variant="secondary" size="sm" href={`/student/dashboard/memberships?plan=${s.id}`}>Manage membership</Button>
          {s.membership.switchTo.length > 0 && !s.membership.cancel && <Button variant="secondary" size="sm" href={`/student/dashboard/memberships?plan=${s.id}&change=1`}>Change plan</Button>}
          {s.membership.cancel
            ? <Button variant="secondary" size="sm" onClick={() => membershipChanges.undoCancel(s.id)}>Keep my membership</Button>
            : <Button variant="ghost" size="sm" onClick={() => onCancel(s)}>Cancel</Button>}
        </div>
      )}
      {!s.ended && !s.membership && s.canCancel && (
        <div className="ap-actions">
          {override?.status === 'Cancelling' || override?.status === 'Paused'
            ? <Button variant="secondary" size="sm" onClick={() => onKeep(s.id)}>{override.status === 'Paused' ? 'Resume now' : 'Keep subscription'}</Button>
            : (
              <>
                {s.canActivate && s.status === 'Trialing' && <Button size="sm" onClick={() => onActivate(s)}>Activate now</Button>}
                {s.canCancel && <Button variant="ghost" size="sm" onClick={() => onCancel(s)}>Cancel</Button>}
              </>
            )}
        </div>
      )}
      {s.canActivate && s.status === 'Trialing' && !override?.status && (
        <p className="t-body-sm t-muted">Activate now to end the free trial early and start your subscription today.</p>
      )}
      {s.kind === 'Payment plan' && <p className="t-body-sm t-muted">Payment plans finish on their own after the last payment.</p>}
    </Card>
  )
}

function MethodsTab({ card, onUpdate, onAdd }) {
  return (
    <div className="pg-stack">
      {card ? (
        <Card className="ap-method">
          <span className="ap-method-icon"><Icon name="card" size={22} /></span>
          <div className="ap-method-text">
            <p className="pg-row"><span className="t-strong">{card.brand} ending {card.last4}</span><Badge tone="primary">Default</Badge></p>
            <p className="t-body-sm t-muted">Expires {card.expires} · {card.usedFor}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={onUpdate}>Update card</Button>
        </Card>
      ) : (
        <EmptyState icon="card" title="No saved payment methods">
          Cards you save at checkout appear here, so renewals go through without a hitch.
        </EmptyState>
      )}
      <div>
        <Button variant="secondary" iconStart="plus" onClick={onAdd}>Add a payment method</Button>
      </div>
    </div>
  )
}

function LoadingTable() {
  return (
    <Card className="pg-stack-sm" aria-busy="true" aria-label="Loading payments">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="ap-skel-row">
          <Skeleton width="16%" /><Skeleton width="40%" /><Skeleton width="12%" /><Skeleton width={72} height={22} />
        </div>
      ))}
    </Card>
  )
}

// ---------------------------------------------------------------- Page

export default function Payments() {
  const { viewer } = useViewer()
  const [params, setParams] = useSearchParams()
  const state = params.get('state')
  const empty = state === 'empty'

  const [activated, setActivated] = useState([]) // orders from subscriptions activated in this visit
  const changes = useMembershipChanges()
  const orders = empty ? [] : [...activated, ...ordersFor(viewer, changes)].filter((o) => siteAccess.enabled || !o.lines.some((l) => l.title.startsWith(siteAccess.name)))
  const pending = orders.filter((o) => o.status === 'Pending')
  const subs = empty ? [] : buildSubscriptions(viewer, changes)
  const card = empty ? null : paymentMethod
  const tabs = [
    { value: 'orders', label: 'Orders' },
    { value: 'subscriptions', label: 'Subscriptions and plans' },
    { value: 'methods', label: 'Payment methods' },
    pending.length && { value: 'pending', label: `Waiting for payment (${pending.length})` },
  ].filter(Boolean)

  const [tab, setTabState] = useState(() => (tabs.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'orders'))
  const [cardModal, setCardModal] = useState(() => (params.get('update') === 'card' ? 'update' : null))
  const [cardSaved, setCardSaved] = useState(false)
  const [cancelling, setCancelling] = useState(() => subs.find((x) => x.id === params.get('cancel')) || null)
  const [overrides, setOverrides] = useState({})
  const [activating, setActivating] = useState(null)
  const [done, setDone] = useState(null)
  const [order, setOrder] = useState(null)

  const setTab = (v) => {
    setTabState(v)
    const next = new URLSearchParams(params)
    next.set('tab', v); next.delete('cancel'); next.delete('update')
    setParams(next, { replace: true })
  }
  const saveCard = () => { setCardSaved(true); setCardModal(null) }
  // Ending a free trial early: the first payment is taken today and the subscription is active from now.
  const activate = (sub) => {
    const now = new Date()
    const next = new Date(now); next.setMonth(next.getMonth() + 1)
    setOverrides((o) => ({ ...o, [sub.id]: { status: 'Active', nextLabel: 'Next charge', nextAt: next.toISOString(), detail: `Activated ${fullDate(now.toISOString())}, before the trial ended` } }))
    setActivated((list) => [{
      id: `HH-${10620 + list.length}`, at: now.toISOString(), date: fullDate(now.toISOString()), kind: 'subscription', cart: false,
      title: sub.name, lines: [{ title: sub.name, detail: `${sub.price} · first payment`, amountLabel: `$${sub.amount.toFixed(2)}` }],
      subtotal: `$${sub.amount.toFixed(2)}`, discount: null, tax: `$${(sub.amount / 6).toFixed(2)}`, total: `$${sub.amount.toFixed(2)}`,
      status: 'Paid', method: `${paymentMethod.brand} ending ${paymentMethod.last4}`, note: null, reference: null, refund: null,
    }, ...list])
    setActivating(null)
    setDone({ title: `${sub.name} is active`, text: `We charged ${sub.price.split(' / ')[0]} to your ${paymentMethod.brand} ending ${paymentMethod.last4} and emailed your receipt. Next charge ${fullDate(next.toISOString())}.` })
  }
  const keep = (id) => setOverrides((o) => { const next = { ...o }; delete next[id]; return next })

  let body
  if (state === 'loading') body = <LoadingTable />
  else if (state === 'error') {
    body = (
      <Notice tone="danger" title="We couldn’t load your payments" action={<Button variant="secondary" size="sm" href="/student/dashboard/profile/payments">Try again</Button>}>
        This is on our side. Nothing has been charged or changed.
      </Notice>
    )
  } else if (tab === 'orders') body = <OrdersTab orders={orders} onOpen={setOrder} />
  else if (tab === 'subscriptions') {
    body = subs.length ? (
      <div className="pg-stack">
        {subs.map((s) => <SubscriptionCard key={s.id} sub={s} override={overrides[s.id]} onCancel={setCancelling} onKeep={keep} onActivate={setActivating} />)}
      </div>
    ) : (
      <EmptyState icon="leaf" title="No subscriptions" action={<Button variant="secondary" href="/memberships">See memberships</Button>}>
        Memberships, payment plans and paid newsletters you join show here.
      </EmptyState>
    )
  } else if (tab === 'pending') body = <PendingTab orders={pending} />
  else body = <MethodsTab card={card} onUpdate={() => setCardModal('update')} onAdd={() => setCardModal('add')} />

  return (
    <div className="ap-page">
      <h1 className="t-heading-3">Payments</h1>

      {done && <Notice tone="success" title={done.title} onDismiss={() => setDone(null)}>{done.text}</Notice>}
      {cardSaved && (
        <Notice tone="success" title="Your card is updated" onDismiss={() => setCardSaved(false)}>
          Your subscriptions and payment plan use it from the next payment.
        </Notice>
      )}

      <Tabs tabs={tabs} value={tab} onChange={setTab} label="Payments" />
      <div role="tabpanel" aria-label={tabs.find((t) => t.value === tab)?.label}>{body}</div>

      <OrderModal order={order} onClose={() => setOrder(null)} />
      <Modal
        open={!!activating} onClose={() => setActivating(null)} size="sm" title={activating ? `Activate ${activating.name} now?` : ''}
        footer={<><Button variant="secondary" onClick={() => setActivating(null)}>Keep my trial</Button><Button onClick={() => activate(activating)}>Activate and pay {activating?.price.split(' / ')[0]}</Button></>}
      >
        {activating && (
          <div className="pg-stack-sm">
            <p>Your free trial ends today instead of {fullDate(activating.nextAt)}, and your subscription starts now.</p>
            <dl className="pg-facts">
              <dt>Today</dt><dd>{activating.price.split(' / ')[0]} on your {paymentMethod.brand} ending {paymentMethod.last4}</dd>
              <dt>Then</dt><dd>{activating.price}, until you cancel</dd>
            </dl>
            <p className="t-body-sm t-muted">You can cancel any time from Payments.</p>
          </div>
        )}
      </Modal>
      {cardModal && (
        <CardModal
          title={cardModal === 'add' ? 'Add a payment method' : 'Update card'}
          name={viewer.name}
          onClose={() => setCardModal(null)}
          onSave={saveCard}
        />
      )}
      {cancelling && (
        <CancelFlow
          sub={cancelSubFor({ ...cancelling, ...overrides[cancelling.id] })}
          onClose={() => setCancelling(null)}
          onCancel={(r) => (cancelling.membership
            ? membershipChanges.cancel(cancelling.id, { ...r, requestedAt: new Date().toISOString() })
            : setOverrides((o) => ({ ...o, [cancelling.id]: { status: 'Cancelling', label: 'Cancels at period end', detail: `Cancels at period end · ${cancelling.next}` } })))}
          onOffer={(offer) => (cancelling.membership
            ? membershipChanges.takeOffer(cancelling.id, { id: offer.id, result: offer.result })
            : setOverrides((o) => ({ ...o, [cancelling.id]: offer.result })))}
        />
      )}
    </div>
  )
}
