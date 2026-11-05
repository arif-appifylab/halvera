import { useParams } from 'react-router-dom'
import {
  Breadcrumbs, Section, Icon, FeatureSteps, FitList, ProductCard, Accordion, Button, CtaBand,
} from '@/design-system'
import { getCondition } from '@/data/conditions.js'
import { altFor } from '@/data/media-credits.js'
import { school } from '@/data/school.js'
import { getProduct, cardProps, listCatalog } from '@/lib/products.js'
import { useViewer } from '@/app/viewer.jsx'
import NotFound from '@/pages/NotFound.jsx'
import './conditions.css'


// /conditions/:slug: one area we help with, with signs, approach, fit and related programmes.
export default function Condition() {
  const { slug } = useParams()
  const { viewer } = useViewer()
  const condition = getCondition(slug)
  if (!condition) return <NotFound />

  const { title, intro, icon, image, symptoms = [], approach = [], fits = [], notFits = [], related = [], faqs = [] } = condition
  const programmes = related.map(getProduct).filter((p) => p && p.visibility !== 'hidden')
  // The appointments for this topic, each opening its own booking page.
  const sessions = listCatalog().filter((p) => p.type === 'appointment' && p.category === slug)

  return (
    <>
      <header className="sg-container pg-head">
        <div className="pg-head-inner">
          <Breadcrumbs items={[{ label: 'Health topics', href: '/conditions' }, { label: title }]} />
          <p className="sg-eyebrow">Health topics</p>
          <h1 className="t-display-lg">{title}</h1>
          <p className="t-body-lg t-muted">{intro}</p>
        </div>
      </header>

      <Section className="cond-first">
        <div className="cond-signs">
          <div className="pg-stack">
            <h2 className="t-heading-2">Common signs</h2>
            <p className="t-muted">You might recognise some of these. Most people we work with have more than one.</p>
            <ul className="pg-ticks">
              {symptoms.map((s) => (
                <li key={s}><Icon name="check" size={18} />{s}</li>
              ))}
            </ul>
            <p className="t-body-sm t-muted cond-signs-note">
              These signs are common and can have many causes. If something is new, severe or getting worse,
              see your doctor before starting a programme.
            </p>
          </div>
          {image ? (
            <img className="pg-media cond-media cond-media-img" src={image} alt={altFor(image)} width="1200" height="675" loading="lazy" decoding="async" />
          ) : (
            <div className="pg-media cond-media" aria-hidden="true">
              <Icon name={icon} size={48} />
            </div>
          )}
        </div>
      </Section>

      {approach.length > 0 && (
        <Section tone="sage" eyebrow="Our approach" title="How we work with you" intro="Small changes, in a sensible order, at a pace that suits your life.">
          <FeatureSteps steps={approach} />
        </Section>
      )}

      <Section eyebrow="Is it right for you" title="Who it's for, and who it's not for">
        <FitList fits={fits} notFits={notFits} />
      </Section>

      {programmes.length > 0 && (
        <Section tone="sunken" eyebrow="Programmes" title="Programmes that can help" intro="Start on your own, join a small group or work with a practitioner one to one.">
          <div className="pg-grid">
            {programmes.map((p) => <ProductCard key={p.slug} {...cardProps(p, viewer)} />)}
          </div>
          <div className="cond-more">
            <Button variant="secondary" href="/courses" iconEnd="arrow-right">See all programmes</Button>
          </div>
        </Section>
      )}

      {sessions.length > 0 && (
        <Section eyebrow="Appointments" title="Work with a practitioner" intro={`One-to-one and small-group sessions for ${title.toLowerCase()}, online or in person.`}>
          <div className="pg-grid">
            {sessions.map((p) => <ProductCard key={p.slug} {...cardProps(p, viewer)} />)}
          </div>
          <div className="cond-more">
            <Button variant="secondary" href="/all-products?type=appointment" iconEnd="arrow-right">See all appointments</Button>
          </div>
        </Section>
      )}

      {faqs.length > 0 && (
        <Section eyebrow="Questions" title="Common questions" width="narrow">
          <Accordion items={faqs} />
        </Section>
      )}

      <CtaBand
        title="Not sure where to start?"
        text="Book a free 20-minute consultation. We will listen to what is going on, tell you honestly whether we can help and suggest a sensible first step."
        primary={school.consultation}
      />

    </>
  )
}
