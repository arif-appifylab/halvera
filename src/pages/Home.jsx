import { useState } from 'react'
import {
  Hero, Section, Card, Icon, FeatureCard, FeatureSteps, ProductCard, PractitionerCard, Testimonial,
  PlanCard, LeadMagnet, TextField, Checkbox, Button, Notice, Accordion, CtaBand,
} from '@/design-system'
import { school } from '@/data/school.js'
import { conditions } from '@/data/conditions.js'
import { getPractitioner, testimonials } from '@/data/people.js'
import { getPlan } from '@/data/plans.js'
import { getProduct, cardProps } from '@/lib/products.js'
import { useViewer } from '@/app/viewer.jsx'
import {
  hero, painPoints, helpWith, practitionerIntro, steps, programmes, stories, membership, guide, faqs, cta,
} from '@/data/home.js'
import './home.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function GuideForm() {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!EMAIL.test(email.trim())) {
      setError('Enter an email address like name@example.com')
      return
    }
    setError('')
    setSentTo(email.trim())
  }

  if (sentTo) {
    return (
      <div role="status" className="home-optin-done">
        <Notice tone="success" title={guide.doneTitle}>{guide.done(sentTo)}</Notice>
      </div>
    )
  }

  return (
    <form className="home-optin" onSubmit={submit} noValidate>
      <TextField
        label="Email address"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error || undefined}
      />
      <Checkbox
        label={guide.consent}
        description={guide.consentNote}
        checked={consent}
        onChange={(e) => setConsent(e.target.checked)}
      />
      <Button type="submit" variant="accent" iconEnd="download">{guide.submit}</Button>
    </form>
  )
}

export default function Home() {
  const { viewer } = useViewer()
  const founder = getPractitioner('amara')
  const products = programmes.slugs.map(getProduct).filter(Boolean)
  const quotes = stories.names.map((n) => testimonials.find((t) => t.name === n)).filter(Boolean)
  const plans = membership.plans.map(getPlan).filter((p) => p && p.prices.monthly)

  return (
    <>
      <Hero {...hero} primary={school.consultation} />

      <Section tone="sunken">
        <div className="home-pain">
          <header className="home-pain-head">
            <p className="sg-eyebrow">{painPoints.eyebrow}</p>
            <h2 className="t-heading-2">{painPoints.title}</h2>
            <p className="t-body-lg t-muted">{painPoints.intro}</p>
          </header>
          <Card padding="lg" className="home-pain-card">
            <ul className="pg-ticks">
              {painPoints.items.map((item) => (
                <li key={item}><Icon name="check-circle" size={20} />{item}</li>
              ))}
            </ul>
            <hr className="pg-divider" />
            <p className="t-strong">{painPoints.close}</p>
            <a className="sg-arrowlink" href={school.consultation.href}>
              {painPoints.link}<Icon name="arrow-right" size={16} />
            </a>
          </Card>
        </div>
      </Section>

      <Section eyebrow={helpWith.eyebrow} title={helpWith.title} intro={helpWith.intro}>
        <div className="pg-grid">
          {conditions.slice(0, 6).map((c) => (
            <FeatureCard
              key={c.slug}
              icon={c.icon}
              title={c.title}
              text={c.text}
              href={`/conditions/${c.slug}`}
              linkLabel={`About ${c.title.toLowerCase()}`}
            />
          ))}
        </div>
        <p className="home-more">
          <a className="sg-arrowlink" href="/conditions">
            {helpWith.linkLabel}<Icon name="arrow-right" size={16} />
          </a>
        </p>
      </Section>

      <Section tone="sunken">
        <div className="home-founder">
          <div className="pg-stack-sm">
            <p className="sg-eyebrow">{practitionerIntro.eyebrow}</p>
            <h2 className="t-heading-2">{practitionerIntro.title}</h2>
            <div className="home-founder-story">
              {practitionerIntro.story.map((para) => <p key={para}>{para}</p>)}
            </div>
            <a className="sg-arrowlink" href={practitionerIntro.link.href}>
              {practitionerIntro.link.label}<Icon name="arrow-right" size={16} />
            </a>
          </div>
          <Card padding="lg">
            <PractitionerCard {...founder} href={undefined} />
          </Card>
        </div>
      </Section>

      <Section tone="sage" eyebrow={steps.eyebrow} title={steps.title} intro={steps.intro} align="center">
        <FeatureSteps steps={steps.items} />
      </Section>

      <Section eyebrow={programmes.eyebrow} title={programmes.title} intro={programmes.intro}>
        <div className="pg-grid">
          {products.map((p) => <ProductCard key={p.slug} {...cardProps(p, viewer)} />)}
        </div>
        <div className="home-more">
          <Button variant="secondary" href="/courses" iconEnd="arrow-right">Explore programmes</Button>
        </div>
      </Section>

      <Section tone="clay" eyebrow={stories.eyebrow} title={stories.title}>
        <div className="pg-grid">
          {quotes.map((t) => <Testimonial key={t.name} {...t} />)}
        </div>
      </Section>

      <Section>
        <div className="home-members">
          <div className="pg-stack-sm home-members-copy">
            <p className="sg-eyebrow">{membership.eyebrow}</p>
            <h2 className="t-heading-2">{membership.title}</h2>
            <p className="t-muted">{membership.intro}</p>
            <a className="sg-arrowlink" href={membership.link.href}>
              {membership.link.label}<Icon name="arrow-right" size={16} />
            </a>
          </div>
          <div className="home-members-plans">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                name={plan.name}
                description={plan.description}
                price={plan.prices.monthly.price}
                trial={plan.trial}
                featured={plan.featured}
                features={plan.features.slice(0, 3)}
                allowances={Array.isArray(plan.allowances) ? plan.allowances : plan.allowances.monthly || []}
                cta={`Choose ${plan.name}`}
                ctaHref={`/checkout/plan:${plan.id}?price=monthly`}
                current={viewer.plan === plan.id}
              />
            ))}
          </div>
        </div>
      </Section>

      <Section tone="sunken">
        <LeadMagnet title={guide.title} text={guide.text}>
          <GuideForm />
        </LeadMagnet>
      </Section>

      <Section eyebrow="Questions" title="Common questions" width="narrow">
        <Accordion items={faqs} />
      </Section>

      <CtaBand title={cta.title} text={cta.text} primary={school.consultation} />

    </>
  )
}
