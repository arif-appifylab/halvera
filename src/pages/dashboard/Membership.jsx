// Student dashboard → Membership (/student/dashboard/memberships), members only. Where members land
// after buying a plan. A student can hold several memberships (one plan per group, plus standalone
// plans), so the page starts with all of them; ?plan=<id> picks one. For the chosen membership:
//   the plan (status, price, next charge, a change waiting, cancelling), Success path ("Your first
//   steps"), the plan's allowances, everything it includes, its history, and the two processes:
//   Change plan (ChangePlanFlow: within its group, upgrades now and prorated, downgrades at the end
//   of the paid period, billing changes at the next renewal) and Cancel (CancelFlow: reason, the
//   school's offer, confirm, "Keep my membership" until the end date). Ended memberships are listed
//   at the bottom.
// Preview states: ?state=past-due | trial, ?tier=essentials (shows Supported as Essentials, to try
// an upgrade), ?change=1 opens Change plan, ?cancel=1 opens Cancel.
import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, Icon, Notice, ProgressBar, StatusBadge } from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { appointmentHref, cancelOffers } from '@/data/dashboard-extra.js'
import { productHref } from '@/lib/products.js'
import { membershipsFor, endedMembershipsFor, LIBRARY_TYPES, fullDate } from '@/lib/student.js'
import { membershipChanges, tickStep, useMembershipChanges } from '@/lib/membership-changes.js'
import { localDate, localTime } from '@/components/product/time.js'
import CancelFlow from './CancelFlow.jsx'
import ChangePlanFlow from './ChangePlanFlow.jsx'
import './dashboard.css'
import './account-pages.css'
import './membership.css'

const PAYMENTS = '/student/dashboard/profile/payments?tab=subscriptions'
const GRACE_DAYS = 7 // Settings → Payments → "Buyers keep access for N days while the gateway retries"

// Steps tick themselves off; custom steps (no trigger in the admin) are ticked by the member with
// the round checkbox on the left, and can be unticked.
function FirstSteps({ steps, finish }) {
  const done = steps.filter((s) => s.done).length
  return (
    <Card as="section" padding="lg" className="db-panel" aria-labelledby="ms-steps">
      <h2 id="ms-steps" className="db-panel-title">Your first steps</h2>
      <ProgressBar value={done} max={steps.length} label={`${done} of ${steps.length} steps done`} showValue={false} />
      <ol className="ms-steps">
        {steps.map((s) => (
          <li key={s.id} className={s.done ? 'is-done' : ''}>
            {s.kind === 'custom' ? (
              <button
                type="button" role="checkbox" aria-checked={s.done} aria-labelledby={`step-${s.id}`}
                className="ms-step-mark is-toggle" onClick={() => tickStep(s.id, !s.done)}
              >
                {s.done ? <Icon name="check" size={16} /> : null}
              </button>
            ) : (
              <span className="ms-step-mark" aria-hidden="true">{s.done ? <Icon name="check" size={16} /> : null}</span>
            )}
            <div className="ms-step-main">
              <p id={`step-${s.id}`} className="t-strong">{s.label}<span className="sg-sr">{s.done ? ' (done)' : ''}</span></p>
              {s.kind === 'custom' && <p className="t-body-sm t-muted">{s.done ? 'Done. Tap the circle to undo.' : s.hint}</p>}
              {s.note && !s.done && <p className="t-body-sm t-muted">Booked for {fullDate(s.note.startsAt)}. This ticks itself off after the session.</p>}
              {s.then && s.done && <p className="t-body-sm t-muted">Next, we suggest <a href={productHref(s.then)}>{s.then.title}</a>.</p>}
            </div>
            {s.kind !== 'custom' && s.href && !s.done && !s.note && <Button size="sm" variant="secondary" href={s.href}>{s.kind === 'appointment' ? 'Book' : 'Go'}</Button>}
          </li>
        ))}
      </ol>
      {done === steps.length && finish && (
        <Notice tone="success" title={finish.message} action={finish.product ? <Button size="sm" href={productHref(finish.product)}>View {finish.product.title}</Button> : null}>
          You’ve done every first step.
        </Notice>
      )}
    </Card>
  )
}

// One card per membership, to pick which one the page shows.
function Overview({ list, selected, onSelect }) {
  return (
    <ul className="ms-overview" aria-label="Your memberships">
      {list.map((m) => (
        <li key={m.id}>
          <button type="button" className={'ms-pick' + (m.id === selected ? ' is-selected' : '')} aria-pressed={m.id === selected} onClick={() => onSelect(m.id)}>
            <span className="ms-pick-head"><span className="t-heading-4">{m.plan.name}</span><StatusBadge status={m.status} /></span>
            <span className="t-body-sm">{m.priceLabel}</span>
            <span className="t-caption t-muted">
              {m.cancel ? `Ends ${fullDate(m.nextAt)}` : m.pendingSwitch ? `Switching to ${m.pendingSwitch.planName} on ${fullDate(m.nextAt)}` : `Next charge ${fullDate(m.nextAt)}`}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function PlanCard({ m, state, onChange, onCancel }) {
  const status = state === 'past-due' ? 'Past due' : state === 'trial' ? 'Trialing' : m.status
  return (
    <Card tone="sage" padding="lg" className="ms-plan-card">
      <div className="db-panel-head">
        <div>
          <p className="sg-eyebrow">{m.grouped ? 'Your plan' : 'Standalone membership'}</p>
          <h2 className="t-heading-2">{m.plan.name}</h2>
        </div>
        <StatusBadge status={status} />
      </div>
      <dl className="ms-facts">
        <div><dt>Price</dt><dd>{m.priceLabel}</dd></div>
        <div><dt>{m.cancel ? 'Ends' : state === 'trial' ? 'Trial ends' : 'Next charge'}</dt><dd>{fullDate(m.nextAt)}</dd></div>
        <div><dt>Member since</dt><dd>{fullDate(m.joined)}</dd></div>
        <div><dt>Paid with</dt><dd>Visa ending 4242</dd></div>
      </dl>
      <div className="db-actions">
        {m.switchTo.length > 0 && !m.cancel && <Button size="sm" onClick={onChange}>Change plan</Button>}
        <Button variant="secondary" size="sm" href={PAYMENTS}>Billing and receipts</Button>
        {m.cancel
          ? <Button variant="secondary" size="sm" onClick={() => membershipChanges.undoCancel(m.id)}>Keep my membership</Button>
          : <Button variant="ghost" size="sm" onClick={onCancel}>Cancel membership</Button>}
      </div>
    </Card>
  )
}

// Each included appointment: its own sessions this billing period and the next open times from its
// calendar. A time opens that appointment's booking page with the time picked.
function Sessions({ m }) {
  if (!m.sessions.length) return null
  return (
    <Card as="section" padding="lg" className="db-panel" aria-labelledby="ms-sessions">
      <div className="db-panel-head">
        <h2 id="ms-sessions" className="db-panel-title">Sessions included</h2>
        <span className="t-body-sm t-muted">Resets {m.sessions[0].resets} · unused sessions don’t carry over</span>
      </div>
      <ul className="ms-sessions">
        {m.sessions.map((s) => (
          <li key={s.type.slug}>
            <div className="ms-session-head">
              <div>
                <p className="t-strong"><a href={appointmentHref(s.type.slug)}>{s.type.title}</a></p>
                <p className="t-body-sm t-muted">{s.type.duration} · {s.type.location.title}</p>
              </div>
              <p className="ms-session-left"><strong>{s.left} of {s.total}</strong> left this month</p>
            </div>
            <ProgressBar value={s.used} max={s.total} label={`${s.used} of ${s.total} used`} showValue={false} />
            {s.left > 0 ? (
              s.next.length ? (
                <div className="ms-slots" role="group" aria-label={`Next open times for ${s.type.title}`}>
                  {s.next.map((slot) => (
                    <a key={slot.id} className="ms-slot" href={`${appointmentHref(s.type.slug)}?slot=${slot.id}`}>
                      <span>{localDate(slot.utc)}</span><strong>{localTime(slot.utc)}</strong>
                    </a>
                  ))}
                  <a className="ms-slot is-more" href={appointmentHref(s.type.slug)}>More times</a>
                </div>
              ) : <p className="t-body-sm t-muted">No open times in the next few weeks.</p>
            ) : (
              <p className="t-body-sm t-muted">You’ve used this month’s. Your next one opens on {s.resets}, or <a href={appointmentHref(s.type.slug)}>book at the usual price</a>.</p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function EventPlaces({ m }) {
  if (!m.eventPlaces) return null
  const { eventPlaces } = m
  return (
    <Card as="section" padding="lg" className="db-panel" aria-labelledby="ms-events">
      <div className="db-panel-head">
        <h2 id="ms-events" className="db-panel-title">Event places</h2>
        <span className="t-body-sm t-muted">Resets {eventPlaces.resets}</span>
      </div>
      <p className="ms-session-left"><strong>{eventPlaces.perMonth - eventPlaces.used} of {eventPlaces.perMonth}</strong> left this month</p>
      <ProgressBar value={eventPlaces.used} max={eventPlaces.perMonth} label={`${eventPlaces.used} of ${eventPlaces.perMonth} used`} showValue={false} />
      <p className="t-body-sm t-muted">Register for a paid event without paying.</p>
      <div><Button size="sm" variant="secondary" href="/all-products?type=event">See events</Button></div>
    </Card>
  )
}

function Included({ m }) {
  const groups = LIBRARY_TYPES.map((t) => ({ ...t, items: m.included.filter((i) => i.group === t.value) })).filter((g) => g.items.length)
  return (
    <Card as="section" padding="lg" className="db-panel" aria-labelledby="ms-included">
      <div className="db-panel-head">
        <h2 id="ms-included" className="db-panel-title">Included in {m.plan.name}</h2>
        <Button size="sm" variant="link" href="/student/dashboard/profile/enrollments?source=plan">See in My library</Button>
      </div>
      <div className="ms-groups">
        {groups.map((g) => (
          <div key={g.value}>
            <p className="ms-group-label"><Icon name={g.icon} size={16} />{g.label}</p>
            <ul className="ms-items">
              {g.items.map((i) => <li key={i.key}><a href={i.href}>{i.title}</a>{i.status === 'in-progress' && <Badge tone="primary">In progress</Badge>}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <p className="t-caption t-muted">New things the school adds to your plan appear here automatically.</p>
    </Card>
  )
}

function History({ m }) {
  return (
    <Card as="section" padding="lg" className="db-panel" aria-labelledby="ms-history">
      <h2 id="ms-history" className="db-panel-title">History</h2>
      <ol className="ms-history">
        {[...m.history].reverse().map((h) => <li key={h.at + h.text}><span className="t-caption t-muted">{fullDate(h.at)}</span><span>{h.text}</span></li>)}
      </ol>
    </Card>
  )
}

export default function Membership() {
  const { viewer } = useViewer()
  const [params, setParams] = useSearchParams()
  const changes = useMembershipChanges()
  const [flow, setFlow] = useState(() => (params.get('change') ? 'change' : params.get('cancel') ? 'cancel' : null))
  const state = params.get('state')
  const list = membershipsFor(viewer, changes, { previewTier: params.get('tier') })
  const ended = endedMembershipsFor(viewer)
  if (!list.length) return <Navigate to="/memberships" replace />

  const m = list.find((x) => x.id === params.get('plan')) || list[0]
  const select = (id) => { const next = new URLSearchParams(params); next.set('plan', id); setParams(next, { replace: true }) }
  const close = () => {
    setFlow(null)
    const next = new URLSearchParams(params); next.delete('change'); next.delete('cancel'); setParams(next, { replace: true })
  }

  const cancelSub = {
    id: m.id, kind: 'Membership', name: `${m.plan.name} membership`, next: fullDate(m.nextAt),
    offers: cancelOffers[m.id] || [],
    pendingSwitch: m.pendingSwitch?.planName,
    loses: [...m.included.map((i) => i.title), ...m.sessions.map((x) => `Your monthly ${x.type.title.toLowerCase()} session`), ...(m.eventPlaces ? ['Your monthly event places'] : [])],
    keeps: ['Everything you bought on its own', 'Your progress, notes and certificates', 'Bookings you’ve already made'],
  }

  return (
    <div className="db-page">
      <header className="db-head">
        <h1 className="t-heading-3">{list.length > 1 ? 'Your memberships' : 'Your membership'}</h1>
        <p className="t-muted">{list.length > 1 ? `You have ${list.length} memberships. Choose one to see what it includes and manage it.` : `Everything your ${m.plan.name} plan includes, and what to do first.`}</p>
      </header>

      {list.length > 1 && <Overview list={list} selected={m.id} onSelect={select} />}

      {state === 'past-due' && (
        <Notice tone="warning" title="Your last payment didn’t go through" action={<Button size="sm" href={`${PAYMENTS}&update=card`}>Update your card</Button>}>
          We’ll try again over the next few days. You keep everything for {GRACE_DAYS} days while we do.
        </Notice>
      )}
      {m.cancel && (
        <Notice tone="warning" title={`${m.plan.name} ends on ${fullDate(m.nextAt)}`} action={<Button size="sm" variant="secondary" onClick={() => membershipChanges.undoCancel(m.id)}>Keep my membership</Button>}>
          You cancelled it. Everything stays open until then, and you won’t be charged again.
        </Notice>
      )}
      {m.pendingSwitch && !m.cancel && (
        <Notice tone="info" title={`Switching to ${m.pendingSwitch.planName} on ${fullDate(m.nextAt)}`} action={<Button size="sm" variant="secondary" onClick={() => membershipChanges.undoSwitch(m.id)}>Keep {m.plan.name}</Button>}>
          Until then nothing changes. From that date it’s {m.pendingSwitch.priceLabel}.
        </Notice>
      )}
      {m.offer && !m.cancel && (
        <Notice tone="success" title={m.offer.result.message} onDismiss={() => membershipChanges.undoOffer(m.id)}>{m.offer.result.detail}.</Notice>
      )}

      <PlanCard m={m} state={state} onChange={() => setFlow('change')} onCancel={() => setFlow('cancel')} />
      {m.steps && <FirstSteps steps={m.steps} finish={m.finish} />}
      <Sessions m={m} />
      <EventPlaces m={m} />
      <Included m={m} />
      <History m={m} />

      {ended.length > 0 && (
        <Card as="section" padding="lg" className="db-panel" aria-labelledby="ms-ended">
          <h2 id="ms-ended" className="db-panel-title">Past memberships</h2>
          <ul className="ms-items">
            {ended.map((e) => <li key={e.id}><span className="t-strong">{e.plan.name}</span><span className="t-body-sm t-muted">{fullDate(e.joined)} to {fullDate(e.ended)} · {e.how}</span></li>)}
          </ul>
        </Card>
      )}

      {flow === 'change' && m.switchTo.length > 0 && (
        <ChangePlanFlow
          m={m} onClose={close}
          onConfirm={(q) => membershipChanges.switchPlan(m.id, { fromName: m.plan.name, planId: q.plan.id, planName: q.plan.name, priceId: q.priceId, priceLabel: q.priceLabel, when: q.when, at: q.startsAt, paidToday: q.paidToday })}
        />
      )}
      {flow === 'cancel' && (
        <CancelFlow
          sub={cancelSub} onClose={close}
          onCancel={({ reason, note }) => membershipChanges.cancel(m.id, { reason, note, requestedAt: new Date().toISOString() })}
          onOffer={(offer) => membershipChanges.takeOffer(m.id, { id: offer.id, result: offer.result })}
        />
      )}
    </div>
  )
}
