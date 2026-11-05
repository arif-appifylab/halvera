import { useState } from 'react'
import {
  Hero, Section, SegmentedToggle, PlanCard, Card, Badge, Icon, FeatureSteps, Testimonial,
  Accordion, CtaBand,
} from '@/design-system'
import { plansFor, plansByPrice, getPlan, billingPeriods, membershipGroup, membershipFaqs } from '@/data/plans.js'
import { products } from '@/data/products.js'
import { testimonials } from '@/data/people.js'
import { school } from '@/data/school.js'
import { productHref, TYPE_LABEL } from '@/lib/products.js'
import { getLibraryItem } from '@/lib/library.js'
import { heldPlanIds } from '@/lib/student.js'
import { siteAccess } from '@/lib/access.js'
import { useViewer } from '@/app/viewer.jsx'
import './memberships.css'

// Page copy that isn't shared with other pages.
const FOUNDING_PLACES_LEFT = 23
// Plans that open every self-paced programme (Supported, and Founding member which is Supported for life).

const steps = [
  { title: 'Join', text: 'Choose a plan and start with 7 days free. Cancel from your dashboard before the trial ends and you pay nothing.' },
  { title: 'Start with the welcome path', text: 'A short path through the audio library and the community, so you know where everything is in your first week.' },
  { title: 'Book your monthly consultation', text: 'On Supported, pick a time with a practitioner each month to check in on how things are going.' },
]

const stories = ['Rafael K.', 'Jonah M.', 'Tom B.']
  .map((name) => testimonials.find((t) => t.name === name))
  .filter(Boolean)

const CTA_LABEL = { essentials: 'Start free trial', supported: 'Start free trial', 'gut-health-club': 'Join Gut Health Club', founding: 'Become a founding member' }

const allowancesFor = (plan, period) =>
  Array.isArray(plan.allowances) ? plan.allowances : plan.allowances?.[period] || []

const inGroup = (plan) => membershipGroup.tiers.includes(plan.id)

// What a plan card shows for this viewer: current plan, upgrade within the group, or a normal choice.
// A student can hold several memberships (one per group, plus standalone plans).
function cardState(plan, viewer) {
  const held = heldPlanIds(viewer)
  if (held.includes(plan.id)) return { current: true }
  const mine = held.map(getPlan).find((p) => p && inGroup(p))
  if (!mine) return {}
  if (inGroup(plan) && inGroup(mine)) {
    // Switching inside the group happens from the dashboard (Membership → Change plan), not a new checkout.
    const href = '/student/dashboard/memberships?change=1'
    if (plan.tier > mine.tier) return { upgrade: true, href, note: 'We charge the difference for the rest of this billing period.' }
    return { cta: `Switch to ${plan.name}`, href, note: 'Changes at the end of your paid period.' }
  }
  return {}
}

export default function Memberships() {
  const { viewer } = useViewer()
  const [period, setPeriod] = useState('monthly')
  const visiblePlans = plansFor(period)

  return (
    <>
      <Hero
        layout="center"
        eyebrow="Membership"
        title="Ongoing care that fits around your week"
        highlight="fits around your week"
        subtitle="Guided audio, a kind community and, on Supported, a monthly consultation with a practitioner. Start with 7 days free and cancel any time from your dashboard."
      />

      <Section className="mem-pricing" id="plans">
        <div className="mem-toggle">
          <SegmentedToggle options={billingPeriods} value={period} onChange={setPeriod} label="Billing period" />
        </div>

        <div className="mem-plans" style={{ '--mem-cols': Math.min(3, visiblePlans.length), '--mem-cols-md': Math.min(2, visiblePlans.length) }}>
          {visiblePlans.map((plan) => {
            const state = cardState(plan, viewer)
            const note = state.note || (plan.id === 'founding' && !state.current ? `Limited to 100 places · ${FOUNDING_PLACES_LEFT} left` : null)
            return (
              <div key={plan.id} className="mem-plan">
                <PlanCard
                  name={plan.name}
                  description={plan.description}
                  price={plan.prices[period].price}
                  trial={plan.trial}
                  featured={plan.featured}
                  features={plan.features}
                  allowances={allowancesFor(plan, period)}
                  cta={state.cta || CTA_LABEL[plan.id] || 'Choose plan'}
                  ctaHref={state.href || `/checkout/plan:${plan.id}?price=${period}`}
                  current={state.current}
                  upgrade={state.upgrade}
                />
                {note && <p className="mem-plan-note t-body-sm t-muted">{note}</p>}
              </div>
            )
          })}
        </div>

        <div className="mem-notes t-body-sm t-muted">
          <p>Monthly and yearly plans renew until you cancel. The lifetime plan is one payment.</p>
          {siteAccess.enabled && !siteAccess.membershipsRequire && (
            <p>
              You don&rsquo;t need {siteAccess.name.toLowerCase()} to join a membership. It&rsquo;s only for buying single
              programmes. <a href="/site-access">About {siteAccess.name.toLowerCase()}</a>
            </p>
          )}
        </div>
      </Section>

      <Section
        tone="sunken"
        eyebrow="Inside each plan"
        title="Everything that’s included"
        intro="Each plan opens these programmes for as long as you’re a member. Nothing to buy separately."
      >
        <div className="mem-included">
          {plansByPrice().map((plan) => {
            const opens = products.filter((p) => p.visibility === 'membership' && p.plans?.includes(plan.id))
            const allows = allowancesFor(plan, plan.prices.monthly ? 'monthly' : 'lifetime')
            return (
              <Card key={plan.id} as="article" padding="lg" className="mem-included-card">
                <h3 className="t-heading-3">{plan.name}</h3>
                <ul className="mem-included-list">
                  {opens.map((p) => (
                    <li key={p.slug}>
                      <Badge>{TYPE_LABEL[p.type]}</Badge>
                      <a href={productHref(p)} className="mem-included-link">{p.title}</a>
                    </li>
                  ))}
                  {(plan.contents || []).map((ref) => {
                    const it = getLibraryItem(ref)
                    return it && (
                      <li key={ref}>
                        <Badge>Library</Badge>
                        <a href={it.href} className="mem-included-link">{it.title}</a>
                      </li>
                    )
                  })}
                </ul>
                {allows.length > 0 && (
                  <ul className="mem-included-allow t-body-sm t-muted">
                    {allows.map((a) => <li key={a}><Icon name="calendar" size={16} />{a}</li>)}
                  </ul>
                )}
              </Card>
            )
          })}
        </div>
      </Section>

      <Section tone="sage" eyebrow="How it works" title="Your first month, step by step" align="center">
        <FeatureSteps steps={steps} />
      </Section>

      <Section tone="clay" eyebrow="Member stories" title="In their own words">
        <div className="mem-stories">
          {stories.map((t) => <Testimonial key={t.name} {...t} />)}
        </div>
      </Section>

      <Section eyebrow="Questions" title="Questions about membership" width="prose">
        <Accordion items={membershipFaqs} />
      </Section>

      <CtaBand
        title="Not sure which plan suits you?"
        text="Book a free 20-minute consultation and we’ll help you choose. No pressure, just a conversation."
        primary={school.consultation}
      />

    </>
  )
}
