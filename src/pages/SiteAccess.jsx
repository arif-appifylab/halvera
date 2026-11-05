import { useState } from 'react'
import { Section, Card, RadioCard, PriceTag, Button, Notice, Icon, Accordion } from '@/design-system'
import { products } from '@/data/products.js'
import { subscriptions } from '@/data/account.js'
import { TYPE_LABEL, isFree } from '@/lib/products.js'
import { siteAccess } from '@/lib/access.js'
import { useViewer } from '@/app/viewer.jsx'
import './site-access.css'

// When the signed-in student's access ended (matches the account banner in the site layout).
const ENDED_ON = 'Sun 12 Oct'
const PAYMENTS_HREF = '/student/dashboard/profile/payments'

const PRICE_DESCRIPTION = {
  subscription: 'Renews each year. Cancel any time.',
  'one-time': 'One payment. It never ends.',
}

const listNames = (items) => items.slice(0, 2).map((p) => p.title).join(' and ')
const onSale = (p) => p.visibility === 'public' && p.availability === 'available' && !p.password

// What never needs site access, worked out from the admin settings.
function exemptions() {
  const list = []
  if (siteAccess.freeProductsExempt) {
    const examples = products.filter((p) => isFree(p) && onSale(p))
    list.push({ title: 'Free programmes', detail: examples.length ? `Like ${listNames(examples)}.` : null })
  }
  siteAccess.rules.forEach((rule) => {
    const examples = products.filter((p) => p.type === rule.type && onSale(p))
    list.push({ title: `${TYPE_LABEL[rule.type] || rule.label}s`, detail: examples.length ? `Like ${listNames(examples)}.` : null })
  })
  products
    .filter((p) => p.siteAccessExcluded && !siteAccess.rules.some((r) => r.type === p.type) && onSale(p))
    .forEach((p) => list.push({ title: p.title, detail: null }))
  if (!siteAccess.membershipsRequire) {
    list.push({ title: 'Memberships', detail: 'They include their own programmes.', href: '/memberships' })
  }
  return list
}

const endsCopy = siteAccess.whenEnds === 'lock'
  ? 'Your programmes lock until you renew. Your progress is kept.'
  : 'You keep everything you bought. You only need site access again to buy something new.'

const faqs = [
  {
    question: 'Do I need it for free programmes?',
    answer: 'No. Free programmes never need site access, and neither do events. You only need it to buy paid programmes, bundles and downloads.',
  },
  {
    question: 'Is it a membership?',
    answer: (
      <p>
        No. Site access lets you buy from Halvera, but it doesn&rsquo;t include any programmes on its own.
        Memberships are separate and don&rsquo;t need site access. <a href="/memberships">See the memberships</a>
      </p>
    ),
  },
  {
    question: 'Can I get a refund?',
    answer: (
      <p>
        Yes, within 14 days if you haven&rsquo;t used it to buy anything. <a href="/contact-us">Write to us</a> and
        we&rsquo;ll refund it in full.
      </p>
    ),
  },
  {
    question: 'What if I already bought something?',
    answer: siteAccess.whenEnds === 'lock'
      ? 'It stays in your dashboard with your progress. While your access is active it stays open. If your access ends, it locks until you renew, then opens again where you left off.'
      : 'It stays yours, with your progress, whether or not your access is active.',
  },
]

// "Require site access to buy" is off: nothing to sell here, so say so plainly (an old link still lands well).
function GateOff() {
  return (
    <header className="pg-head is-center">
      <div className="sg-container">
        <div className="pg-head-inner">
          <p className="sg-eyebrow">{siteAccess.name}</p>
          <h1 className="t-display-lg">You don’t need site access to buy</h1>
          <p className="t-body-lg t-muted">Every programme, workshop and download can be bought on its own. Pick what suits you and pay at checkout.</p>
          <div className="pg-row">
            <Button href="/courses">Browse programmes</Button>
            <Button variant="ghost" href="/memberships">See memberships</Button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default function SiteAccess() {
  if (!siteAccess.enabled) return <GateOff />
  return <SiteAccessPage />
}

function SiteAccessPage() {
  const { viewer } = useViewer()
  const [priceId, setPriceId] = useState(() => (siteAccess.prices.find((p) => p.default) || siteAccess.prices[0]).id)
  const active = viewer.siteAccess === 'active'
  const ended = viewer.siteAccess === 'ended'
  const activeUntil = subscriptions.find((s) => s.name === siteAccess.name)?.next

  return (
    <>
      <header className="pg-head is-center">
        <div className="sg-container">
          <div className="pg-head-inner">
            <p className="sg-eyebrow">{siteAccess.name}</p>
            <h1 className="t-display-lg">One pass to buy from Halvera</h1>
            <p className="t-body-lg t-muted">
              We keep our community small and committed, so we ask for site access before you buy. Pay once a year
              (or once for good), then buy any programme you like at its usual price.
            </p>
          </div>
        </div>
      </header>

      <Section className="sa-main">
        <div className="sa-layout">
          <div className="sa-buy">
            {active ? (
              <Notice
                tone="success"
                title={activeUntil ? `You have site access until ${activeUntil}` : 'You have site access'}
                action={<Button size="sm" variant="secondary" href={PAYMENTS_HREF}>Manage</Button>}
              >
                Buy any programme and nothing extra is added at checkout.
              </Notice>
            ) : (
              <Card padding="lg" className="sa-card">
                {ended && (
                  <Notice tone="warning" title={`Your site access ended on ${ENDED_ON}`}>
                    {endsCopy}
                  </Notice>
                )}
                <fieldset className="sa-options">
                  <legend className="t-heading-4">Choose your pass</legend>
                  {siteAccess.prices.map((p) => (
                    <RadioCard
                      key={p.id}
                      name="site-access-price"
                      value={p.id}
                      checked={priceId === p.id}
                      onChange={() => setPriceId(p.id)}
                      title={p.label}
                      description={PRICE_DESCRIPTION[p.kind]}
                      meta={<PriceTag {...p.price} size="sm" />}
                    />
                  ))}
                </fieldset>
                <Button block size="lg" href={`/checkout/site-access?price=${priceId}`}>
                  {ended ? 'Renew site access' : 'Get site access'}
                </Button>
                <p className="t-body-sm t-muted sa-small">
                  Refunds within 14 days if you haven&rsquo;t bought anything with it.
                </p>
              </Card>
            )}
          </div>

          <div className="sa-info">
            <section className="pg-stack-sm" aria-labelledby="sa-covers">
              <h2 id="sa-covers" className="t-heading-3">What it covers</h2>
              <ul className="pg-ticks">
                {siteAccess.benefits.map((b) => (
                  <li key={b}><Icon name="check" size={18} /><span>{b}</span></li>
                ))}
              </ul>
            </section>

            <section className="pg-stack-sm" aria-labelledby="sa-never">
              <h2 id="sa-never" className="t-heading-3">What never needs it</h2>
              <ul className="pg-ticks">
                {exemptions().map((e) => (
                  <li key={e.title}>
                    <Icon name="check" size={18} />
                    <span>
                      {e.href ? <a href={e.href} className="sa-link t-strong">{e.title}</a> : <span className="t-strong">{e.title}</span>}
                      {e.detail && <span className="t-muted"> {e.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <Card tone="sage" padding="lg" as="section" aria-labelledby="sa-ends" className="pg-stack-sm">
              <h2 id="sa-ends" className="t-heading-4">What happens if it ends</h2>
              <p>{endsCopy}</p>
              {siteAccess.prices.some((p) => p.kind === 'one-time') && (
                <p className="t-body-sm t-muted">Lifetime access never ends.</p>
              )}
            </Card>
          </div>
        </div>
      </Section>

      <Section tone="sunken" eyebrow="Questions" title="Questions about site access" width="prose">
        <Accordion items={faqs} />
      </Section>
    </>
  )
}
