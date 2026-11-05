// Turn the /checkout/:id route into checkout items, and read facts about them that change
// the form (gifting, trials, pre-orders, agreements). No price maths here: totals come from quote().
import { getNewsletterPost } from '@/data/newsletter.js'
import { getProduct, openHref } from '@/lib/products.js'
import { getPlan } from '@/data/plans.js'
import { siteAccess } from '@/lib/access.js'
import { getLibraryItem } from '@/lib/library.js'
import { pricesFor, isKnownItem } from '@/lib/commerce.js'
import { productAgreements } from '@/data/checkout.js'
import { perDateKeys } from '@/components/event/dates.js'

const UNAVAILABLE = {
  'sold-out': 'Every place has been taken, so it can’t be bought right now.',
  'sales-ended': 'Sales have ended, so it can’t be bought any more.',
  'enrolment-closed': 'Enrolment is closed, so it can’t be bought right now.',
}

// Returns { kind: 'cart' | 'site-access' | 'plan' | 'library' | 'product', items, error }.
export function itemsFor(id, params, cartItems) {
  const price = params.get('price')
  if (id === 'cart') {
    // Skip anything the school has since removed, so a stale cart can't break checkout.
    const known = cartItems.filter(isKnownItem)
      // Per-date event items keep only dates that can still be booked.
      .map((i) => (i.dates ? { ...i, dates: perDateKeys(getProduct(i.productId), i.dates) || [] } : i))
    return { kind: 'cart', items: known }
  }

  if (id === 'site-access') {
    if (!siteAccess.enabled) return { kind: 'site-access', items: [], error: 'Site access isn’t needed to buy here, so there’s nothing to pay for. Everything in the catalogue can be bought on its own.' }
    const priceId = siteAccess.prices.some((p) => p.id === price) ? price : 'yearly'
    return { kind: 'site-access', items: [{ productId: 'site-access', priceId }] }
  }

  if (id.startsWith('plan:')) {
    const plan = getPlan(id.slice(5))
    const priceId = price || 'monthly'
    if (!plan || !plan.prices[priceId]) return { kind: 'plan', items: [], error: 'We couldn’t find this membership price. It may have changed since the link was made.' }
    return { kind: 'plan', items: [{ productId: id, priceId }] }
  }

  if (id.startsWith('library:')) {
    const prices = pricesFor(id)
    if (!prices.length) return { kind: 'library', items: [], error: 'We couldn’t find this part of the library. The link may be out of date.' }
    return { kind: 'library', items: [{ productId: id, priceId: prices.some((p) => p.id === price) ? price : prices[0].id }] }
  }

  const product = getProduct(id)
  if (!product) return { kind: 'product', items: [], error: 'We couldn’t find this programme. The link may be out of date.' }
  if (UNAVAILABLE[product.availability]) return { kind: 'product', items: [], error: UNAVAILABLE[product.availability], product }
  if (!product.prices.length) return { kind: 'product', items: [], error: 'This is included in a membership and can’t be bought on its own.', product }

  const priceId = product.prices.some((p) => p.id === price) ? price : product.prices[0].id
  const amount = params.get('amount')
  const item = { productId: id, priceId }
  if (amount && !Number.isNaN(Number(amount))) item.amount = Number(amount)
  // Per date: ?price=per-date&dates=2026-10-21,2026-10-28 (past or full dates drop off; none
  // given → the next date with places).
  if (product.prices.find((p) => p.id === priceId)?.perDate) {
    const dates = perDateKeys(product, params.get('dates'))
    if (!dates) return { kind: 'product', items: [], error: 'Every date in this run is full or has passed, so it can’t be booked right now.', product }
    item.dates = dates
  }
  return { kind: 'product', items: [item] }
}

const priceOf = (item) => {
  if (item.productId === 'site-access') return siteAccess.prices.find((p) => p.id === item.priceId)
  if (item.productId.startsWith('plan:')) {
    const plan = getPlan(item.productId.slice(5))
    return { kind: item.priceId === 'lifetime' ? 'one-time' : 'subscription', trial: item.priceId !== 'lifetime' ? plan?.trial : null }
  }
  const prices = pricesFor(item.productId)
  return prices.find((p) => p.id === item.priceId) || prices[0]
}

// What a checkout was opened for (`for=<ref>`): a product slug, a library ref ('folder:recipes',
// also accepted as 'library:folder:recipes'), or a newsletter post ('newsletter:<slug>:<post>',
// from a paid post's "Upgrade to read").
// Returns { title, href } or { title: null, href: null } when it can't be resolved (yet).
export function forContext(ref) {
  if (!ref) return null
  if (ref.startsWith('newsletter:')) {
    const [, slug, postSlug] = ref.split(':')
    const post = getNewsletterPost(slug, postSlug)
    return post ? { title: post.title, href: `/newsletter/${slug}/${postSlug}` } : { title: null, href: slug ? `/newsletter/${slug}` : null }
  }
  const libRef = ref.replace(/^library:/, '')
  if (/^(category|folder|file):/.test(libRef)) {
    const item = getLibraryItem(libRef)
    if (item) return { title: item.title, href: `/asset-library/${item.librarySlug}/${item.kind}/${item.id}` }
  } else {
    const product = getProduct(ref)
    if (product) return { title: product.title, href: openHref(product) }
  }
  return { title: null, href: null }
}

// Facts about the items the buyer chose (not the site access line quote() may add).
export function itemFacts(items) {
  const products = items.map((i) => getProduct(i.productId)).filter(Boolean)
  const prices = items.map(priceOf).filter(Boolean)
  const preOrder = products.find((p) => p.availability === 'pre-order')
  const agreement = products.map((p) => productAgreements[p.type]).find(Boolean)
  const plan = items.find((i) => i.productId.startsWith('plan:'))
  return {
    oneTime: prices.length > 0 && prices.every((p) => ['one-time', 'pwyw', 'free'].includes(p.kind)),
    trial: prices.some((p) => p.trial || p.trialDays),
    // Trial length in days, for the "7 days free" headline ('7-day free trial' on plans).
    trialDays: prices.map((p) => p.trialDays || (typeof p.trial === 'string' ? parseInt(p.trial, 10) : 0)).find((d) => d > 0) || null,
    preOrder: preOrder ? { title: preOrder.title, releases: preOrder.releases } : null,
    agreement,
    planId: plan ? plan.productId.slice(5) : null,
    productIds: items.map((i) => i.productId),
  }
}
