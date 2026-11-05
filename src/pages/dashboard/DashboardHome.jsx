// Student dashboard → Home (/student/dashboard). Everything comes from src/lib/student.js, so it
// matches My library, Bookings, Membership and Payments: what needs the student, what to continue,
// what's next, and the membership. Preview states: ?state=error, first-visit loading skeleton.
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Badge, Button, Card, EmptyState, Icon, Notice, ProgressBar, Skeleton, StatTile,
} from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { certificates, gamification } from '@/data/account.js'
import { getPlan } from '@/data/plans.js'
import { listProducts } from '@/lib/products.js'
import {
  libraryItems, bookingsFor, membershipsFor, notesFor, pendingOrders, subscriptionsFor, byLastOpened, fullDate, appointmentCreditsFor,
} from '@/lib/student.js'
import { localDate, localRange } from '@/components/product/time.js'
import { YOUR_TIME } from '@/components/event/eventState.js'
import { useEventTickets, useNow } from '@/components/event/useRegistration.js'
import { useMembershipChanges } from '@/lib/membership-changes.js'
import './dashboard.css'

const DAY = 86400000
let seen = false
function useFirstLoad() {
  const [loading, setLoading] = useState(!seen)
  useEffect(() => {
    if (!loading) return undefined
    const t = setTimeout(() => { seen = true; setLoading(false) }, 500)
    return () => clearTimeout(t)
  }, [loading])
  return loading
}

// The latest few lesson notes, with the way to all of them (/student/dashboard/notes).
function NotesCard({ viewer }) {
  const latest = notesFor(viewer).flatMap((g) => g.notes.map((n) => ({ ...n, programme: g.product.title }))).sort((a, b) => b.at - a.at)
  return (
    <Card as="section" padding="lg" className="db-panel" aria-labelledby="db-notes">
      <div className="db-panel-head">
        <h2 id="db-notes" className="db-panel-title">Your notes</h2>
        <span className="t-body-sm t-muted">{latest.length} {latest.length === 1 ? 'note' : 'notes'}</span>
      </div>
      {latest.length ? (
        <ul className="db-notes">
          {latest.slice(0, 3).map((n) => (
            <li key={n.id}>
              <p>{n.text}</p>
              <p className="t-caption t-muted"><a href={n.href}>{n.lesson?.title || n.programme}</a> · {fullDate(n.at)}</p>
            </li>
          ))}
        </ul>
      ) : <p className="t-muted">Notes you write in lessons show here.</p>}
      <div className="db-push"><Button variant="secondary" size="sm" href="/student/dashboard/notes">Check notes</Button></div>
    </Card>
  )
}

// No membership yet: start the plan's free trial from here (Sell → price → Free trial; the first
// charge waits until the trial ends). Opens checkout for the Supported monthly price.
function TrialCard() {
  const plan = getPlan('supported')
  const price = plan.prices.monthly.price
  return (
    <Card as="section" padding="lg" tone="sage" className="db-panel" aria-labelledby="db-plan">
      <div className="db-panel-head">
        <h2 id="db-plan" className="db-panel-title">Try {plan.name} free</h2>
        <Badge tone="accent" icon="sparkle">{plan.trial}</Badge>
      </div>
      <ul className="pg-ticks t-body-sm">
        {[...plan.allowances.monthly, ...plan.features.slice(0, 2)].map((f) => <li key={f}><Icon name="check" size={16} /><span>{f}</span></li>)}
      </ul>
      <p className="t-body-sm t-muted">Then {price.amount} a {price.interval}. Cancel any time before the trial ends and you won’t be charged.</p>
      <div className="db-push db-actions">
        <Button size="sm" href="/checkout/plan:supported?price=monthly">Start free trial</Button>
        <Button size="sm" variant="ghost" href="/memberships">Compare plans</Button>
      </div>
    </Card>
  )
}

const greeting = (h) => (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening')
const longToday = (now) => new Date(now).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

// What needs the student, most pressing first (at most four).
function attentionFor(viewer, items, member, now) {
  const out = []
  for (const o of pendingOrders(viewer)) {
    out.push({ icon: 'card', title: `Send your bank transfer for ${o.title}`, text: `${o.total} · reference ${o.reference}. It opens once the payment arrives.`, href: '/student/dashboard/profile/payments?tab=pending', action: 'Payment details' })
  }
  for (const i of items.filter((x) => x.request)) {
    out.push(i.request.status === 'Link sent'
      ? { icon: 'check-circle', title: `${i.title}: you’re approved`, text: 'Complete your place before the link expires.', href: i.href, action: 'Complete your place' }
      : { icon: 'clock', title: `Your request to join ${i.title} is with us`, text: `Sent ${i.request.sent}. We’ll email you when it’s approved.`, href: i.href, action: 'View details' })
  }
  for (const s of subscriptionsFor(viewer).filter((x) => x.status === 'Trialing' && new Date(x.nextAt) - now < 7 * DAY)) {
    out.push({ icon: 'bell', title: `Your free trial of ${s.name} ends ${s.next}`, text: `Then it’s ${s.price}. Nothing to do if you’d like to keep it.`, href: '/student/dashboard/profile/payments?tab=subscriptions', action: 'Manage' })
  }
  for (const c of appointmentCreditsFor(viewer)) {
    out.push({ icon: 'calendar', title: `Book your ${c.title}`, text: `You added it to order ${c.order}. Book it by ${fullDate(c.bookBy)}.`, href: `/appointment/${c.slug}`, action: 'Find a time' })
  }
  const step = member?.steps?.find((s) => !s.done && !s.note)
  if (step) out.push({ icon: 'leaf', title: 'Your next first step', text: step.label, href: '/student/dashboard/memberships', action: 'See your steps' })
  return out.slice(0, 4)
}

function HomeSkeleton() {
  return (
    <div className="db-page" aria-busy="true" aria-label="Loading your dashboard">
      <div className="db-head"><Skeleton width="280px" height={32} /><Skeleton width="160px" /></div>
      <div className="db-stats">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={112} radius="var(--radius-lg)" />)}</div>
      <div className="db-cols"><Skeleton height={300} radius="var(--radius-lg)" /><Skeleton height={300} radius="var(--radius-lg)" /></div>
    </div>
  )
}

export default function DashboardHome() {
  const { viewer } = useViewer()
  const [params] = useSearchParams()
  const loading = useFirstLoad()
  const now = useNow()
  const entries = useEventTickets(listProducts(), viewer)
  const changes = useMembershipChanges()

  if (loading) return <HomeSkeleton />

  if (params.get('state') === 'error') {
    return (
      <div className="db-page">
        <Notice tone="danger" title="We couldn’t load your dashboard" action={<Button size="sm" variant="secondary" href="/student/dashboard">Try again</Button>}>
          This is on our side. Your programmes and bookings are safe.
        </Notice>
      </div>
    )
  }

  const firstName = (viewer.name || '').split(' ')[0]
  const items = libraryItems(viewer)
  const memberships = membershipsFor(viewer, changes)
  const member = memberships.find((m) => m.steps) || memberships[0] || null
  const attention = attentionFor(viewer, items, member, now)
  const continuing = items.filter((i) => ['in-progress', 'not-started'].includes(i.status) && i.percent != null).sort(byLastOpened).slice(0, 3)
  const upcoming = bookingsFor(viewer, entries).filter((b) => b.end >= now && b.status !== 'Cancelled').slice(0, 3)
  const next = upcoming[0]
  const inProgress = items.filter((i) => i.status === 'in-progress').length

  return (
    <div className="db-page">
      <header className="db-head">
        <h1 className="t-heading-3">{greeting(new Date(now).getHours())}, {firstName}</h1>
        <p className="t-muted">{longToday(now)}</p>
      </header>

      {attention.length > 0 && (
        <Card as="section" padding="lg" tone="sage" className="db-panel" aria-labelledby="db-attention">
          <h2 id="db-attention" className="db-panel-title">Needs your attention</h2>
          <ul className="db-attention">
            {attention.map((a) => (
              <li key={a.title}>
                <span className="db-attention-icon" aria-hidden="true"><Icon name={a.icon} size={18} /></span>
                <div><p className="t-strong">{a.title}</p><p className="t-body-sm t-muted">{a.text}</p></div>
                <Button size="sm" variant="secondary" href={a.href}>{a.action}</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="db-stats">
        <StatTile icon="calendar" label="Next booking" value={next ? localDate(next.start) : 'None booked'} hint={next ? `${localRange(next.start, next.end)} · ${next.title}` : 'Book when you’re ready'} />
        <StatTile icon="book" label="In progress" value={String(inProgress)} hint={`${items.filter((i) => i.status === 'completed').length} completed`} />
        <StatTile icon="check-circle" label="Certificates" value={String(certificates.length)} hint={certificates[0] ? `Latest: ${certificates[0].course}` : 'Finish a programme to earn one'} />
        {gamification.enabled && <StatTile icon="star" label="Points" value={gamification.points.toLocaleString('en-GB')} hint={`${(gamification.nextLevel.at - gamification.points).toLocaleString('en-GB')} to ${gamification.nextLevel.name}`} />}
      </div>

      <div className="db-cols db-cols-even">
        <div className="db-side">
        <Card as="section" padding="lg" className="db-panel" aria-labelledby="db-continue">
          <div className="db-panel-head">
            <h2 id="db-continue" className="db-panel-title">Continue learning</h2>
            <Button size="sm" variant="link" href="/student/dashboard/profile/enrollments">My library</Button>
          </div>
          {continuing.length ? (
            <ul className="db-list">
              {continuing.map((i) => (
                <li key={i.key} className="db-row">
                  <div className="db-row-main">
                    <a className="db-row-title" href={i.href}>{i.title}</a>
                    <span className="db-row-meta">{i.line || (i.lastOpenedAt ? `Last opened ${fullDate(i.lastOpenedAt)}` : 'Not started yet')}</span>
                  </div>
                  <ProgressBar value={i.percent} label={`${i.percent}% complete`} showValue={false} />
                  <div className="db-row-end"><Button size="sm" variant="secondary" href={i.href}>{i.percent > 0 ? 'Continue' : 'Start'}</Button></div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon="book" title="Nothing in progress" action={<Button variant="secondary" href="/courses">Explore programmes</Button>}>
              Programmes you join show here, so you can pick up where you left off.
            </EmptyState>
          )}
        </Card>

        <NotesCard viewer={viewer} />
        </div>

        <div className="db-side">
          <Card as="section" padding="lg" className="db-panel" aria-labelledby="db-next">
            <div className="db-panel-head">
              <h2 id="db-next" className="db-panel-title">Coming up</h2>
              <Button size="sm" variant="link" href="/student/dashboard/bookings">Bookings</Button>
            </div>
            {upcoming.length ? (
              <ul className="db-agenda">
                {upcoming.map((b) => (
                  <li key={b.id}>
                    <span className="db-agenda-date"><strong>{localDate(b.start).split(' ')[1]}</strong>{localDate(b.start).split(' ')[2]}</span>
                    <div>
                      <p className="t-strong">{b.title}</p>
                      <p className="t-body-sm t-muted">{localDate(b.start)}, {localRange(b.start, b.end)} {YOUR_TIME}</p>
                    </div>
                    <Badge>{b.kind === 'event' ? 'Event' : 'Appointment'}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-muted">Nothing booked. Appointments and events you book show here.</p>
            )}
          </Card>

          {memberships.length ? (
            <Card as="section" padding="lg" tone="sage" className="db-panel" aria-labelledby="db-plan">
              <h2 id="db-plan" className="db-panel-title">{memberships.length > 1 ? 'Your memberships' : 'Your membership'}</h2>
              <ul className="db-memberships">
                {memberships.map((m) => (
                  <li key={m.id}>
                    <a href={`/student/dashboard/memberships?plan=${m.id}`} className="t-strong">{m.plan.name}</a>
                    <span className="t-body-sm t-muted">{m.cancel ? `Ends ${fullDate(m.nextAt)}` : m.sessions.length ? `${m.sessions.reduce((n, x) => n + x.left, 0)} of ${m.sessions.reduce((n, x) => n + x.total, 0)} included sessions left · resets ${m.allowance?.resets}` : `Next charge ${fullDate(m.nextAt)}`}</span>
                  </li>
                ))}
              </ul>
              {member?.steps && (
                <ProgressBar value={member.steps.filter((s) => s.done).length} max={member.steps.length} label={`${member.plan.name} first steps: ${member.steps.filter((s) => s.done).length} of ${member.steps.length} done`} showValue={false} />
              )}
              <Button block variant="secondary" href="/student/dashboard/memberships">{memberships.length > 1 ? 'Manage memberships' : 'Open your membership'}</Button>
            </Card>
          ) : (
            <TrialCard />
          )}
        </div>
      </div>
    </div>
  )
}
