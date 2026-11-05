// Access gate (Sell → Memberships → Access gate) and every other reason a visitor can't open something.
//
// Access gate: when "Require site access to buy" is on, buyers need site access before they can buy
// products. Site access is its own line in the cart ("Name at checkout"). Buyers who already have
// access never see that line. Settings mirrored from the admin:
//
// enabled is the admin's on/off switch ("Require site access to buy"). It is off by default; the theme
// preview turns it on for the whole site (Theme preview → Require site access to buy). That choice is
// kept in this browser and the page reloads, so every price, cart, checkout and dashboard reads the same value.

const GATE_KEY = 'halvera-preview-site-access'

function readGateSetting() {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(GATE_KEY) === 'on'
  } catch {
    return false
  }
}

export function setSiteAccessEnabled(on) {
  try { localStorage.setItem(GATE_KEY, on ? 'on' : 'off') } catch { /* storage blocked: nothing to keep */ }
  window.location.reload()
}

export const siteAccess = {
  enabled: readGateSetting(),
  name: 'Site access', // Name at checkout
  prices: [
    { id: 'yearly', label: 'Yearly', kind: 'subscription', amount: 49, interval: 'year', price: { amount: '$49', interval: 'year' }, default: true },
    { id: 'lifetime', label: 'Lifetime', kind: 'one-time', amount: 129, price: { amount: '$129', note: 'One payment' } },
  ],
  freeProductsExempt: true, // "Free products don't need access"
  membershipsRequire: false, // "Require access for memberships too"
  whenEnds: 'lock', // "When someone's access ends": 'keep' (they keep what they bought) | 'lock' (lock purchases until they renew)
  // Exclusion rules and excluded products: these never need access.
  rules: [{ label: 'All events', type: 'event' }],
  benefits: [
    'Buy any programme, workshop pass or download',
    'Free programmes and the Sunday Letter stay free',
    'Your purchases stay yours while access is active',
  ],
}

const isFree = (product) => product.prices.length > 0 && product.prices.every((p) => p.kind === 'free')

// Does buying this product need site access?
// Also takes a library item (getLibraryItem in src/lib/library.js, type 'library'): paid library
// items need it like any other product; free and member items don't. The asset library product
// itself is never sold (its items are), so it doesn't.
export function needsSiteAccess(product) {
  if (!siteAccess.enabled) return false
  if (product.type === 'asset-library') return false
  if (product.type === 'library') return product.prices.some((p) => p.amount > 0)
  if (product.siteAccessExcluded) return false
  if (siteAccess.rules.some((r) => r.type === product.type)) return false
  if (siteAccess.freeProductsExempt && isFree(product)) return false
  return true
}

export const viewerHasSiteAccess = (viewer) => viewer.siteAccess === 'active'

// Should checkout add the site access line for this viewer and product?
export const addsSiteAccessLine = (product, viewer) => needsSiteAccess(product) && !viewerHasSiteAccess(viewer)

// Why a viewer can or can't open a product's content (course player, community, library).
// Returns { state, ... } where state is one of:
//   open | signin | verify | site-access-ended | purchase | membership | upgrade | private | pending | password | pre-order | unavailable
export function contentAccess(product, viewer, { owned, requested } = {}) {
  const free = isFree(product)
  if (product.password) return { state: 'password' }
  if (viewer.role === 'visitor') return { state: 'signin' }
  if (!viewer.verified) return { state: 'verify' }
  if (product.visibility === 'membership') {
    if (!viewer.plan) return { state: 'membership' }
    if (product.plans && !product.plans.includes(viewer.plan)) return { state: 'upgrade' }
    return { state: 'open' }
  }
  if (owned || (free && product.availability !== 'pre-order')) {
    if (owned && viewer.siteAccess === 'ended' && siteAccess.whenEnds === 'lock' && needsSiteAccess(product)) {
      return { state: 'site-access-ended' }
    }
    if (owned && product.availability === 'pre-order') return { state: 'pre-order' }
    return { state: 'open' }
  }
  if (product.visibility === 'private') return { state: requested ? 'pending' : 'private' }
  if (['sold-out', 'sales-ended', 'enrolment-closed'].includes(product.availability)) return { state: 'unavailable' }
  return { state: 'purchase' }
}

// Lesson-level locks inside a course the viewer can open. The admin's "Prerequisite for next lesson"
// sits on the earlier lesson: the lesson after it stays locked until it's complete (and drip still applies).
export function lessonLock(lesson, { previous, previousDone = true } = {}) {
  if (lesson.drip) return { state: 'drip', unlockDate: lesson.drip }
  if (previous?.prereq && !previousDone) return { state: 'prereq' }
  return null
}
