// Product helpers shared by every page: routes, labels, ownership and ProductCard props.
import { products, getProductData } from '@/data/products.js'
import { owned, accessRequests } from '@/data/account.js'
import { needsSiteAccess, viewerHasSiteAccess } from '@/lib/access.js'
import { conditions } from '@/data/conditions.js'
import { appointmentTypes } from '@/data/appointments.js'
import { getPractitioner } from '@/data/people.js'

// URL segment per product type. Each has /:type/:slug (sales page) and /:type/:slug/open (content),
// except the asset library, which has its own routes (/asset-library/:slug, …/category, …/folder, …/file).
export const ROUTE_FOR = {
  course: 'course', cohort: 'course', bundle: 'bundle', coaching: 'coaching', community: 'community',
  event: 'event', 'media-library': 'media-library', 'asset-library': 'asset-library', newsletter: 'newsletter',
  appointment: 'appointment',
}
// These types have their own pages: src/pages/library, src/pages/newsletter, and each appointment's
// booking page (src/pages/Booking.jsx at /appointment/:slug).
const OWN_ROUTES = ['asset-library', 'newsletter', 'appointment']
export const PRODUCT_ROUTES = [...new Set(Object.values(ROUTE_FOR))].filter((r) => !OWN_ROUTES.includes(r))

export const TYPE_LABEL = {
  course: 'Course', cohort: 'Cohort', bundle: 'Bundle', coaching: 'Coaching', community: 'Community',
  event: 'Event', 'media-library': 'Media library', 'asset-library': 'Asset library', newsletter: 'Newsletter',
  appointment: 'Appointment',
}
// ProductCard's built-in labels use these keys.
const CARD_TYPE = { 'asset-library': 'asset-library' }

// Appointments (Scheduling → Appointments) in the catalogue, as product-shaped listings whose card opens
// the appointment's own booking page. They are Public or Membership only, as in the admin; magic slots and
// meetup polls are shared by link (listed: false), so they aren't listed. Booking an appointment is paid on
// its booking page, outside the cart and the access gate.
const amountOf = (price) => (typeof price === 'string' ? Number(price.replace(/[^0-9.]/g, '')) : 0)
const appointmentListings = appointmentTypes.filter((t) => t.listed !== false).map((t) => {
  const only = !!t.includedIn?.only
  return {
    slug: t.slug, type: 'appointment', title: t.title, summary: t.summary, category: t.category,
    // Round robin: the system assigns the host, so the card doesn't show anyone in particular.
    image: t.kind === 'round-robin' ? undefined : getPractitioner(t.hosts[0])?.photo,
    visibility: only ? 'membership' : 'public',
    plans: only ? t.includedIn.plans : undefined,
    prices: only ? []
      : t.price === 0 ? [{ id: 'free', kind: 'free', label: 'Free', amount: 0, price: { amount: 0 } }]
        : [{ id: 'once', kind: 'one-time', label: 'One payment', amount: amountOf(t.price), price: { amount: t.price } }],
    meta: [
      { icon: 'clock', label: t.duration },
      { icon: t.location.icon, label: t.location.kind === 'person' ? 'In person' : 'Online' },
    ],
    siteAccessExcluded: true,
    availability: 'available',
  }
})

// What the catalogue (and site search) lists: every product, plus the listed appointments.
export const listCatalog = () => [...products, ...appointmentListings]

// Catalogue tabs: only types the school sells, in this order (R: no counts beside tabs).
export const CATALOG_TABS = [
  { value: 'all', label: 'All' },
  { value: 'course', label: 'Courses', types: ['course', 'cohort'] },
  { value: 'bundle', label: 'Bundles', types: ['bundle'] },
  { value: 'coaching', label: 'Coaching', types: ['coaching'] },
  { value: 'appointment', label: 'Appointments', types: ['appointment'] },
  { value: 'community', label: 'Communities', types: ['community'] },
  { value: 'event', label: 'Events', types: ['event'] },
  { value: 'media-library', label: 'Audio and video', types: ['media-library'] },
  { value: 'asset-library', label: 'Library', types: ['asset-library'] },
  { value: 'newsletter', label: 'Newsletters', types: ['newsletter'] },
].filter((t) => !t.types || listCatalog().some((p) => t.types.includes(p.type)))

export const productHref = (p) => `/${ROUTE_FOR[p.type]}/${p.slug}`
// The library is browsable by everyone; each file shows its own lock, so it has no separate /open page.
// Products hosted elsewhere (a community on EzyCommunity) open at their own address.
export const openHref = (p) => p.externalUrl || (OWN_ROUTES.includes(ROUTE_FOR[p.type]) ? productHref(p) : `/${ROUTE_FOR[p.type]}/${p.slug}/open`)

export const getProduct = (slug) => getProductData(slug)
export const listProducts = () => products

export const isFree = (p) => p.prices.length > 0 && p.prices.every((x) => x.kind === 'free')
export const isSolo = (p, priceId) => {
  const price = p.prices.find((x) => x.id === priceId) || p.prices[0]
  return price?.kind === 'subscription'
}

export function ownsProduct(product, viewer) {
  if (viewer.role === 'visitor') return false
  if (product.visibility === 'membership') return Boolean(viewer.plan && (!product.plans || product.plans.includes(viewer.plan)))
  return owned.includes(product.slug) || owned.some((slug) => getProductData(slug)?.bundle?.includes(product.slug))
}

// Bundles the viewer owns that include this product (a course bought as part of a bundle).
export const ownedBundlesWith = (product, viewer) =>
  viewer.role === 'visitor' ? [] : owned.map(getProductData).filter((b) => b?.bundle?.includes(product.slug))

export const accessRequestFor = (product, viewer) =>
  viewer.role === 'visitor' ? null : accessRequests.find((r) => r.slug === product.slug) || null

// A product's category is one of the conditions (Health topics), e.g. "Gut health".
export const categoryOf = (product) => conditions.find((c) => c.slug === product.category) || null

// Props for the design system's ProductCard. The card owns its CTA wording and states.
export function cardProps(product, viewer) {
  const mine = ownsProduct(product, viewer)
  const defaultPrice = product.prices[0]
  return {
    type: CARD_TYPE[product.type] || product.type,
    title: product.title,
    href: mine ? openHref(product) : productHref(product),
    summary: product.summary,
    image: product.image,
    // The category leads the card's meta line, so every list shows what a product is about.
    meta: [categoryOf(product) && { icon: 'leaf', label: categoryOf(product).title }, ...(product.meta || [])].filter(Boolean),
    price: defaultPrice ? defaultPrice.price : undefined,
    visibility: product.visibility,
    availability: mine ? 'owned' : product.availability === 'pre-order' ? 'available' : product.availability,
    access: product.availability === 'pre-order' ? `Pre-order · opens ${product.releases}`
      : needsSiteAccess(product) && !viewerHasSiteAccess(viewer) && !mine ? 'Needs site access' : product.access,
  }
}
