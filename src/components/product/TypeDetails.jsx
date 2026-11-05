// The type-specific block on the product page: cohort dates, bundle contents, coaching steps,
// community spaces, media episodes, event details, newsletter sample.
import { bundleLibraryCards } from '@/lib/library.js'
import { Card, Icon, ProductCard, Stepper } from '@/design-system'
import { getProduct, cardProps } from '@/lib/products.js'
import Curriculum from './Curriculum.jsx'
import CohortSchedule from '@/components/course/CohortSchedule.jsx'
import { extrasFor, coachingSteps } from './extras.js'
import EventDetails from '@/components/event/EventDetails.jsx'
import SalesEpisodes from '@/components/media-library/SalesEpisodes.jsx'

function Block({ id, title, intro, children }) {
  return (
    <section className="pd-section" aria-labelledby={id}>
      <h2 id={id} className="t-heading-2">{title}</h2>
      {intro && <p className="t-muted">{intro}</p>}
      {children}
    </section>
  )
}

function Facts({ rows }) {
  return (
    <Card tone="sunken" padding="md">
      <dl className="pg-facts pd-facts">
        {rows.filter((r) => r && r.value).map((r) => (
          <div key={r.label} className="pd-fact">
            <dt>{r.label}</dt>
            <dd>{r.value}{r.note && <span className="pd-fact-note">{r.note}</span>}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

// Cohort dates, upcoming cohorts with places left, next cohort or waitlist (src/components/course/CohortSchedule.jsx).
function CohortDetails({ product, owned }) {
  return <CohortSchedule product={product} owned={owned} />
}

function BundleItems({ product, viewer }) {
  const items = (product.bundle || []).map(getProduct).filter(Boolean)
  const library = bundleLibraryCards(product, viewer)
  return (
    <Block id="pd-bundle" title="In this bundle" intro={`${items.length + library.length} products, one purchase. You keep everything for life.`}>
      <div className="pg-grid-2">
        {items.map((p) => <ProductCard key={p.slug} {...cardProps(p, viewer)} />)}
        {library.map(({ key, ...card }) => <ProductCard key={key} {...card} />)}
      </div>
    </Block>
  )
}

function CoachingDetails({ product, request }) {
  const c = product.coaching
  const current = request?.status === 'Pending' ? 1 : request?.status === 'Link sent' ? 2 : 0
  return (
    <>
      <Block id="pd-coaching" title="How coaching works">
        <Facts rows={[
          { label: 'Sessions', value: `${c.sessions} one-to-one sessions` },
          { label: 'Length', value: c.length },
          { label: 'Format', value: c.format },
          { label: 'How often', value: c.cadence },
        ]} />
      </Block>
      <Block id="pd-steps" title="How to start" intro="We start with a conversation, so you never pay for something that isn’t right for you.">
        <Stepper orientation="vertical" steps={coachingSteps} current={current} />
      </Block>
    </>
  )
}

function CommunityDetails({ product }) {
  const c = product.community
  return (
    <Block id="pd-spaces" title="Inside the community" intro={`${c.members.toLocaleString('en-GB')} members and ${c.spaces.length} spaces. Moderated by our practitioners.`}>
      <ul className="pd-spaces">
        {c.spaces.map((s) => (
          <li key={s}><Icon name="users" size={18} />{s}</li>
        ))}
      </ul>
    </Block>
  )
}

function NewsletterDetails({ product }) {
  const n = product.newsletter
  const { sample } = extrasFor(product.slug)
  return (
    <Block id="pd-letter" title="What you’ll get">
      <Facts rows={[
        { label: 'Arrives', value: n.cadence },
        { label: 'Issues so far', value: String(n.issues) },
        { label: 'Read it', value: 'By email, or in the online archive' },
      ]} />
      <p><a className="pd-link" href={`/newsletter/${product.slug}`}>Read the archive and choose a tier</a></p>
      {sample && (
        <Card tone="sunken" padding="lg" className="pd-sample">
          <p className="sg-eyebrow">A recent issue</p>
          <h3 className="t-heading-3">{sample.title}</h3>
          <p className="t-body-sm t-muted">{sample.issue}</p>
          {sample.body.map((p) => <p key={p}>{p}</p>)}
        </Card>
      )}
    </Block>
  )
}

export default function TypeDetails({ product, viewer, owned, request }) {
  switch (product.type) {
    case 'course': return <Curriculum product={product} owned={owned} />
    case 'cohort': return <><CohortDetails product={product} owned={owned} /><Curriculum product={product} owned={owned} /></>
    case 'bundle': return <BundleItems product={product} viewer={viewer} />
    case 'coaching': return <CoachingDetails product={product} request={request} />
    case 'community': return <CommunityDetails product={product} />
    case 'media-library': return <SalesEpisodes product={product} owned={owned} />
    case 'event': return <EventDetails product={product} viewer={viewer} />
    case 'newsletter': return <NewsletterDetails product={product} />
    default: return null
  }
}
