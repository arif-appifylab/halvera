// Product sales page for every product type: /course, /bundle, /coaching, /community, /event,
// /media-library and /newsletter, each at /:type/:slug. The asset library has its own pages (src/pages/library).
import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import {
  Badge, Breadcrumbs, Button, Icon, Accordion, PractitionerCard, Testimonial,
} from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { getProduct, ownsProduct, accessRequestFor, TYPE_LABEL, ROUTE_FOR, CATALOG_TABS } from '@/lib/products.js'
import { getCondition } from '@/data/conditions.js'
import { altFor } from '@/data/media-credits.js'
import { getPractitioner, testimonials } from '@/data/people.js'
import BuyPanel from '@/components/product/BuyPanel.jsx'
import TypeDetails from '@/components/product/TypeDetails.jsx'
import LibraryPromo from '@/components/media-library/LibraryPromo.jsx'
import { EventStatusBadge } from '@/components/event/parts.jsx'
import { UNAVAILABLE } from '@/components/product/buyState.js'
import NotFound from '@/pages/NotFound.jsx'
import './product.css'

const MEDIA_ICON = {
  course: 'play', cohort: 'users', bundle: 'book', coaching: 'heart', community: 'users',
  event: 'calendar', 'media-library': 'headphones', newsletter: 'mail',
}

// Stories about this product first, then others, so every page has two.
function storiesFor(product) {
  const own = testimonials.filter((t) => t.detail === product.title)
  const rest = testimonials.filter((t) => t.detail !== product.title)
  return [...own, ...rest].slice(0, 2)
}

function Stats({ product, practitioner }) {
  const items = []
  if (product.rating) {
    items.push(
      <li key="rating" className="pd-rating">
        <Icon name="star" size={16} />
        <span><strong>{product.rating.value.toFixed(1)}</strong> ({product.rating.count} reviews)</span>
      </li>,
    )
  }
  if (product.students) items.push(<li key="students"><Icon name="users" size={16} />{product.students.toLocaleString('en-GB')} students</li>)
  items.push(<li key="by"><Icon name="user" size={16} />{practitioner.name}</li>)
  for (const m of product.meta || []) items.push(<li key={m.label}><Icon name={m.icon || 'clock'} size={16} />{m.label}</li>)
  if (product.certificate) items.push(<li key="cert"><Icon name="check-circle" size={16} />Certificate of completion</li>)
  return <ul className="pd-stats" aria-label="At a glance">{items}</ul>
}

function ProductPage({ product }) {
  const { viewer } = useViewer()
  const [request, setRequest] = useState(null)
  const owned = ownsProduct(product, viewer)
  const practitioner = getPractitioner(product.practitioner)
  const condition = getCondition(product.category)
  const preview = product.curriculum?.flatMap((c) => c.lessons).find((l) => l.preview)
  const unavailable = UNAVAILABLE[product.availability]
  const stories = storiesFor(product)
  const currentRequest = request || accessRequestFor(product, viewer)

  return (
    <div className="sg-container pd-page">
      <div className="pg-split pd-layout">
        <header className="pd-head">
          <Breadcrumbs items={[parentCrumb(product), { label: product.title }]} />
          <div className="pg-row pd-tags">
            <Badge tone="primary">{TYPE_LABEL[product.type]}</Badge>
            {condition && <a className="pd-category" href={`/conditions/${condition.slug}`}>{condition.title}</a>}
            {product.type === 'event' ? <EventStatusBadge product={product} /> : unavailable && !owned && <Badge tone="warning">{unavailable}</Badge>}
          </div>
          <h1 className="t-heading-1">{product.title}</h1>
          <p className="t-body-lg t-muted pd-summary">{product.summary}</p>
          <Stats product={product} practitioner={practitioner} />
        </header>

        <aside className="pg-split-aside pd-aside">
          <BuyPanel key={product.slug} product={product} request={request} onRequest={setRequest} />
        </aside>

        <div className="pd-body">
          {/* Media library: its promo video or audio takes the media slot (not once the library is unavailable). */}
          {product.mediaLibrary?.promo && !(unavailable && !owned) ? <LibraryPromo product={product} /> : (
          <div className={`pg-media pd-media${unavailable && !owned ? ' is-muted' : ''}`}>
            {product.image
              ? <img className="pd-media-img" src={product.image} alt={altFor(product.image)} width="1200" height="675" decoding="async" />
              : <Icon name={MEDIA_ICON[product.type] || 'leaf'} size={48} />}
            {preview && (
              <Button variant="secondary" size="sm" iconStart="play" href={`/course/${product.slug}/learn/${preview.id}`} className="pd-media-action">
                Watch a free preview
              </Button>
            )}
          </div>
          )}

          <section className="pd-section" aria-labelledby="pd-about">
            <h2 id="pd-about" className="t-heading-2">About this {TYPE_LABEL[product.type].toLowerCase()}</h2>
            <div className="pd-prose">
              {product.description.map((p) => <p key={p}>{p}</p>)}
            </div>
          </section>

          {product.includes?.length > 0 && (
            <section className="pd-section" aria-labelledby="pd-includes">
              <h2 id="pd-includes" className="t-heading-2">What’s included</h2>
              <ul className="pg-ticks pd-includes">
                {product.includes.map((item) => <li key={item}><Icon name="check" size={18} />{item}</li>)}
              </ul>
            </section>
          )}

          <TypeDetails product={product} viewer={viewer} owned={owned} request={currentRequest} />

          <section className="pd-section" aria-labelledby="pd-practitioner">
            <h2 id="pd-practitioner" className="t-heading-2">Your practitioner</h2>
            <PractitionerCard {...practitioner} />
          </section>

          {stories.length > 0 && (
            <section className="pd-section" aria-labelledby="pd-stories">
              <div className="pg-row-between">
                <h2 id="pd-stories" className="t-heading-2">What clients say</h2>
                {product.rating && (
                  <p className="t-body-sm t-muted">{product.rating.value.toFixed(1)} out of 5 from {product.rating.count} reviews</p>
                )}
              </div>
              <div className="pg-grid-2 pd-stories">
                {stories.map((t) => <Testimonial key={t.name} {...t} />)}
              </div>
            </section>
          )}

          {product.faqs?.length > 0 && (
            <section className="pd-section" aria-labelledby="pd-faqs">
              <h2 id="pd-faqs" className="t-heading-2">Questions</h2>
              <Accordion items={product.faqs} />
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

// The one parent a product page has: Programmes for courses, else its tab in All products.
function parentCrumb(product) {
  if (product.type === 'course' || product.type === 'cohort') return { label: 'Programmes', href: '/courses' }
  const tab = CATALOG_TABS.find((t) => t.types?.includes(product.type))
  return tab ? { label: tab.label, href: `/all-products?type=${tab.value}` } : { label: 'All products', href: '/all-products' }
}

export default function Product() {
  const { slug } = useParams()
  const { pathname } = useLocation()
  const product = getProduct(slug)
  // /event/gut-health-reset is not a page: the route segment must match the product's type.
  if (!product || pathname.split('/')[1] !== ROUTE_FOR[product.type]) return <NotFound />
  return <ProductPage key={product.slug} product={product} />
}
