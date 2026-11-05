// Stand-in for the server. EzyCourse sends prices and totals already formatted (R-PRICE-10);
// pages render these strings and never do their own maths.
import { getProduct, TYPE_LABEL } from '@/lib/products.js'
import { getPlan } from '@/data/plans.js'
import { siteAccess, addsSiteAccessLine } from '@/lib/access.js'
import { getLibraryItem } from '@/lib/library.js'
import { plans } from '@/data/plans.js'
import { pickDates, datesSummary, datesCount, perDatePrice } from '@/components/event/dates.js'

export const money = (n) => '$' + n.toFixed(2)

// Sell → Offers → Coupons, as the admin sets them up:
//   method   a code the buyer types (`coupons`, up to MAX_CODES per checkout) or automatic
//            (`automaticDiscounts`, applied with no code when the rules match; only one per order)
//   kind     'product' takes money off the items it applies to; 'order' takes money off the cart total
//   discount percent off · fixed amount off · setPrice (a new price for the product)
//   limits   types / products it applies to, minimum order, ended
//   combines which other discounts can apply with it ("Can combine with product discounts" /
//            "Can combine with order discounts"). Two discounts (two codes, or a code and the automatic
//            discount) stack only when both allow each other's kind.
// One of each case, so everything can be tried at checkout (the theme preview panel lists them).
export const coupons = {
  WELCOME10: { label: '$10 off your order', kind: 'order', fixed: 10, combines: { product: true } },
  SPRING25: { label: '25% off courses, cohorts and bundles', kind: 'product', percent: 25, types: ['course', 'cohort', 'bundle'], combines: { order: true } },
  LIBRARY50: { label: '50% off library categories, folders and files', kind: 'product', percent: 50, types: ['library'], combines: { product: true, order: true } },
  RESET99: { label: 'Gut Health Reset for $99', kind: 'product', setPrice: 99, products: ['gut-health-reset'], combines: {} },
  BIG20: { label: '20% off orders of $100 or more', kind: 'order', percent: 20, minimum: 100, combines: { product: true } },
  SUMMER15: { label: '15% off, ended Mon 31 Aug 2026', kind: 'order', percent: 15, ended: 'Mon 31 Aug 2026', combines: {} },
}
// How many codes one checkout takes (when they combine).
export const MAX_CODES = 2
export const automaticDiscounts = [
  { id: 'autumn-week', name: 'Autumn week', label: '10% off live groups (cohorts), no code needed', kind: 'product', percent: 10, types: ['cohort'], combines: { product: true, order: true } },
]

const fitsLine = (c, r) => r.type !== 'site-access' && (!c.types || c.types.includes(r.type)) && (!c.products || c.products.includes(r.product?.slug))
const allows = (a, b) => !!a.combines?.[b.kind] && !!b.combines?.[a.kind]

// Takes a discount off `left` (what's still due on each line) and returns the saving (0 when it doesn't apply).
function applyDiscount(c, resolved, left, itemsSubtotal) {
  if (!c || c.ended || (c.minimum && itemsSubtotal < c.minimum)) return 0
  if (c.kind === 'order') {
    const total = left.reduce((n, x) => n + x, 0)
    const saving = c.percent ? total * (c.percent / 100) : Math.min(c.fixed, total)
    // Spread over the lines in proportion, so a later discount sees what's really left.
    left.forEach((x, i) => { left[i] = total ? x - (x / total) * saving : x })
    return saving
  }
  let saving = 0
  resolved.forEach((r, i) => {
    if (!fitsLine(c, r)) return
    const cut = c.setPrice != null ? Math.max(0, left[i] - c.setPrice) : c.percent ? left[i] * (c.percent / 100) : Math.min(c.fixed, left[i])
    left[i] -= cut
    saving += cut
  })
  return saving
}

// Can this code apply together with that discount (an automatic one, or another code's coupon)? Both have to allow it.
export const codeCombinesWith = (code, other) => !!coupons[code] && allows(coupons[code], other)

// The order's automatic discount: the first one whose rules match something in it.
function automaticFor(resolved, itemsSubtotal) {
  return automaticDiscounts.find((a) => !a.ended && (!a.minimum || itemsSubtotal >= a.minimum) && resolved.some((r) => fitsLine(a, r))) || null
}
// The bump is a library folder at a bump-only price (usually $15, so "Save 40%").
export const orderBump = {
  productId: 'library:folder:weekly-meal-plans', priceId: 'once', amount: 9, save: '40%',
  title: 'Add Weekly meal plans for $9',
  text: 'Four weeks of gut-friendly meal plans with shopping lists, from our library. Usually $15.',
  showWith: ['gut-health-reset', 'mens-health-circle', 'calm-gut-bundle'],
}
export const TAX_RATE = 0.2
export const TAX_LABEL = 'VAT (20%)'

// Every price a checkout item can switch between, in the product price shape
// ({ id, kind, label, amount, price, … }). Used by checkout's "Change" control.
export function pricesFor(productId) {
  if (productId === 'site-access') return siteAccess.prices
  if (productId.startsWith('plan:')) {
    const plan = plans.find((p) => p.id === productId.slice(5))
    if (!plan) return []
    const label = { monthly: 'Monthly', yearly: 'Yearly', lifetime: 'Lifetime' }
    return Object.entries(plan.prices).map(([id, v]) => ({
      id, label: label[id] || id, kind: id === 'lifetime' ? 'one-time' : 'subscription',
      interval: id === 'yearly' ? 'year' : id === 'monthly' ? 'month' : undefined, amount: v.amount, price: v.price,
    }))
  }
  if (productId.startsWith('library:')) return getLibraryItem(productId.slice(8))?.prices || []
  return getProduct(productId)?.prices || []
}

// Is this cart item still something the school sells? A cart saved before a product, plan or library
// item was removed must not break the cart, the mini cart or checkout, so callers drop the rest.
export function isKnownItem(item) {
  const id = item?.productId
  if (typeof id !== 'string') return false
  if (id.startsWith('library:')) return !!getLibraryItem(id.slice(8))
  return pricesFor(id).length > 0
}

// Quantity: library items at a one-time price (a category, folder or file) can be bought several
// times over, as gifts or for a team, up to MAX_QUANTITY. Everything else is always one.
export const MAX_QUANTITY = 10

export function allowsQuantity(item) {
  if (!item?.productId?.startsWith('library:') || item.bump) return false
  const prices = pricesFor(item.productId)
  return (prices.find((p) => p.id === item.priceId) || prices[0])?.kind === 'one-time'
}

// The item's quantity: 1 when it can't have one, or when an older cart didn't store it.
export function quantityOf(item) {
  if (!allowsQuantity(item)) return 1
  const n = Math.round(Number(item.quantity) || 1)
  return Math.min(MAX_QUANTITY, Math.max(1, n))
}

// Resolve one cart item to { name, title, kind, detail, info, amount, due, then, type, solo, quantity, maxQuantity }.
// title is the name without "× 2"; info says what it is ("Folder · 5 files", "Course").
export function resolveItem(item) {
  const r = resolveOne(item)
  const info = r.info || (r.product ? TYPE_LABEL[r.product.type] : r.type === 'membership' ? 'Membership' : undefined)
  return { title: r.name, quantity: 1, maxQuantity: 1, ...r, info }
}

function resolveOne(item) {
  if (item.productId === 'site-access') {
    const price = siteAccess.prices.find((p) => p.id === item.priceId) || siteAccess.prices[0]
    return {
      name: siteAccess.name, kind: 'Required', detail: price.label, type: 'site-access', due: price.amount,
      then: price.kind === 'subscription' ? `Then ${money(price.amount)} / ${price.interval}.` : null, solo: false,
    }
  }
  if (item.productId.startsWith('plan:')) {
    const plan = getPlan(item.productId.slice(5))
    const price = plan.prices[item.priceId]
    const trial = plan.trial && item.priceId !== 'lifetime'
    return {
      name: `${plan.name} membership`, detail: item.priceId === 'lifetime' ? 'Lifetime' : `Billed ${item.priceId}`,
      type: 'membership', due: trial ? 0 : price.amount, trialAmount: trial ? price.amount : 0, solo: true,
      then: trial ? `${plan.trial}, then ${money(price.amount)} / ${item.priceId === 'yearly' ? 'year' : 'month'}.`
        : item.priceId === 'lifetime' ? null : `Then ${money(price.amount)} / ${item.priceId === 'yearly' ? 'year' : 'month'}.`,
    }
  }
  if (item.productId.startsWith('library:')) return resolveLibraryItem(item)
  const product = getProduct(item.productId)
  const price = product.prices.find((p) => p.id === item.priceId) || product.prices[0]
  // Per date (events): { priceId: 'per-date', dates: ['2026-10-21', …] } pays the price for each date.
  if (price.perDate) {
    const picked = pickDates(product, item.dates)
    return {
      name: product.title, product, type: product.type, kind: item.bonus ? 'Bonus' : undefined,
      detail: picked.length ? `${datesCount(picked.length)} (${datesSummary(picked)})` : 'No dates chosen',
      dates: picked.map((o) => o.key), due: price.amount * picked.length, then: null, solo: false, trialAmount: 0,
    }
  }
  const amount = price.kind === 'pwyw' ? Math.max(price.min, item.amount ?? price.suggested) : price.amount
  let then = null
  if (price.kind === 'installments') then = `Then ${money(price.amount)} a month for ${price.count - 1} more months.`
  if (price.kind === 'subscription' && price.cycles) then = `Then ${money(price.amount)} a ${price.interval} for ${price.cycles - 1} more ${price.interval}s.`
  else if (price.kind === 'subscription') then = price.trialDays
    ? `${price.trialDays}-day free trial, then ${money(price.amount)} / ${price.interval}.`
    : `Then ${money(price.amount)} / ${price.interval}.`
  return {
    name: product.title, product, type: product.type, detail: price.kind === 'one-time' ? undefined : price.label,
    kind: item.bonus ? 'Bonus' : product.availability === 'pre-order' ? 'Pre-order' : undefined,
    due: price.kind === 'subscription' && price.trialDays ? 0 : amount, then, solo: price.kind === 'subscription',
    trialAmount: price.kind === 'subscription' && price.trialDays ? amount : 0,
  }
}

// A library category, folder or file ('library:<ref>'). Subscription and installment prices
// (categories only) are bought on their own.
function resolveLibraryItem(item) {
  const li = getLibraryItem(item.productId.slice(8))
  if (!li || !li.prices.length) return { name: li?.title || 'Library item', type: 'library', detail: li?.detail, due: 0, then: null, solo: false, unavailable: true }
  const price = li.prices.find((p) => p.id === item.priceId) || li.prices[0]
  const more = (price.count || 0) - 1
  let then = null
  if (price.kind === 'installments') then = `Then ${money(price.amount)} a month for ${more} more ${more === 1 ? 'month' : 'months'}.`
  else if (price.kind === 'subscription') then = `Then ${money(price.amount)} / ${price.interval}.`
  // "Soups and stews × 2" with "2 × $12".
  const quantity = quantityOf(item)
  const each = price.price?.amount || money(price.amount)
  return {
    name: quantity > 1 ? `${li.title} × ${quantity}` : li.title, title: li.title, info: li.detail,
    libraryItem: li, type: 'library', image: li.image,
    detail: quantity > 1 ? `${quantity} × ${each}` : price.kind === 'one-time' ? li.detail : `${li.detail} · ${price.label}`,
    kind: item.bonus ? 'Bonus' : undefined, due: price.amount * quantity, then,
    solo: price.kind === 'subscription' || price.kind === 'installments', trialAmount: 0,
    quantity, maxQuantity: allowsQuantity(item) ? MAX_QUANTITY : 1,
  }
}

// Quote a checkout: the cart items plus, when needed, the site access line.
export function quote(items, viewer, { coupon, bump, siteAccessPriceId = 'yearly' } = {}) {
  const all = [...items]
  if (bump) all.push({ productId: orderBump.productId, priceId: orderBump.priceId, amount: orderBump.amount, bump: true })
  const resolved = all.map((i) => ({ ...resolveItem(i), bump: i.bump }))
  if (bump) resolved[resolved.length - 1].due = orderBump.amount

  const needsAccess = resolved.some((r) => (r.product || r.libraryItem) && addsSiteAccessLine(r.product || r.libraryItem, viewer))
    || (siteAccess.membershipsRequire && resolved.some((r) => r.type === 'membership') && viewer.siteAccess !== 'active')
  if (needsAccess) resolved.unshift(resolveItem({ productId: 'site-access', priceId: siteAccessPriceId }))

  const subtotal = resolved.reduce((s, r) => s + r.due, 0)
  // The chosen items only, before site access, the bump and discounts (the cart page's subtotal).
  const itemsSubtotal = resolved.filter((r) => r.type !== 'site-access' && !r.bump).reduce((s, r) => s + r.due, 0)
  // Product discounts come off first, then order discounts; the automatic one before a code of the same kind.
  const discounts = []
  const left = resolved.map((r) => r.due)
  // coupon: one code or a list (up to MAX_CODES); checkout only accepts codes that combine with each other.
  const codes = [].concat(coupon || []).filter((c) => coupons[c] && !coupons[c].ended).slice(0, MAX_CODES)
  const auto = automaticFor(resolved, itemsSubtotal)
  const autoFits = auto && codes.every((c) => allows(coupons[c], auto))
  const stack = [...(autoFits ? [{ d: auto, code: auto.name, automatic: true }] : []), ...codes.map((c) => ({ d: coupons[c], code: c }))]
  stack.sort((a, b) => (a.d.kind === b.d.kind ? 0 : a.d.kind === 'product' ? -1 : 1)).forEach(({ d, code, automatic }) => {
    const saving = applyDiscount(d, resolved, left, itemsSubtotal)
    if (saving > 0) discounts.push({ code, automatic: !!automatic, saving: money(saving), value: saving })
  })
  const afterDiscount = subtotal - discounts.reduce((s, d) => s + d.value, 0)
  const tax = afterDiscount * TAX_RATE / (1 + TAX_RATE) // prices include VAT

  // The first charge when free trials end (Stripe's "Total after trial").
  const trialTotal = resolved.reduce((s, r) => s + (r.trialAmount || 0), 0)

  return {
    siteAccessAdded: needsAccess,
    afterTrial: trialTotal > 0 ? money(trialTotal) : null,
    // Recurring terms are in `then`, shown once under the summary, not repeated on each line.
    lines: resolved.map((r) => ({ name: r.name, kind: r.kind, detail: r.detail, amount: r.due === 0 ? 'Free' : money(r.due) })),
    then: resolved.map((r) => r.then).filter(Boolean),
    discounts: discounts.map(({ code, saving, automatic }) => ({ code, saving, automatic: !!automatic })),
    // The automatic discount this order qualifies for (shown even when a code replaced it).
    automatic: auto ? { name: auto.name, label: auto.label } : null,
    subtotal: money(subtotal),
    itemsSubtotal: money(itemsSubtotal),
    itemsSubtotalValue: itemsSubtotal,
    tax: money(tax),
    taxLabel: TAX_LABEL,
    total: money(afterDiscount),
    free: afterDiscount === 0 && resolved.every((r) => r.due === 0 && !r.then),
    hasSolo: resolved.some((r) => r.solo),
  }
}

// "$12 per date · 3 dates · $36" for the event buy panel (the stand-in server does the maths).
export function perDateQuote(productId, dates) {
  const product = getProduct(productId)
  const price = perDatePrice(product)
  if (!price) return null
  const picked = pickDates(product, dates)
  const whole = (n) => (Number.isInteger(n) ? `$${n}` : money(n))
  return {
    each: whole(price.amount), count: picked.length, countLabel: datesCount(picked.length),
    total: whole(price.amount * picked.length), dates: picked.map((o) => o.key), summary: datesSummary(picked),
  }
}

// Why a code can't be added, or null. q: the order's quote as it is now (its minimum spend and the
// automatic discount on it); applied: the codes already on the order.
export function couponError(code, q, applied = []) {
  if (!code) return null
  const c = coupons[code]
  if (!c) return 'This code isn’t valid. Check the spelling and try again.'
  if (applied.includes(code)) return 'This code is already on your order.'
  if (applied.length >= MAX_CODES) return `You can use up to ${MAX_CODES} codes on one order.`
  if (c.ended) return `This code ended on ${c.ended}.`
  if (c.minimum && q && q.itemsSubtotalValue < c.minimum) return `This code is for orders of ${money(c.minimum)} or more. Your order is ${q.itemsSubtotal}.`
  const clash = applied.find((other) => coupons[other] && !allows(c, coupons[other]))
  if (clash) return `This code can’t be combined with ${clash}. Remove ${clash} to use it instead.`
  const auto = q?.automatic && automaticDiscounts.find((a) => a.name === q.automatic.name)
  if (auto && !allows(c, auto)) return `This code can’t be combined with the ${auto.name} discount already on your order.`
  return null
}
