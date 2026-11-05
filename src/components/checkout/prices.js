// The prices a checkout line can switch between ("Change" in the order panel), as RadioCard rows.
// Reads pricesFor()'s display strings only; no price maths (R-PRICE-10).
import { pricesFor } from '@/lib/commerce.js'
import { getPlan, billingPeriods } from '@/data/plans.js'

const ONE_TIME = ['one-time', 'pwyw', 'free']
export const isOneTime = (p) => ONE_TIME.includes(p.kind)

const shown = (p) => (p.price?.amount ? p.price.amount : 'Free')
const countOf = (p) => p.count || p.price?.installments
const PERIOD_NOTE = Object.fromEntries(billingPeriods.map((b) => [b.value, b.note]))

// The end-aligned price: "$55 / month", "$49 / year", "$990", "From $9".
function display(p) {
  if (p.kind === 'free') return 'Free'
  if (p.kind === 'pwyw') return `From ${shown(p)}`
  if (p.kind === 'installments') return `${shown(p)} / ${p.interval || 'month'}`
  const interval = p.price?.interval || p.interval
  return interval ? `${shown(p)} / ${interval}` : shown(p)
}

// The second line: "3 × $55 · $165 total", "7-day free trial · Save $46 a year", "One payment".
function note(p, plan) {
  if (p.kind === 'installments') {
    const n = countOf(p)
    return p.price?.total ? `${n} × ${shown(p)} · ${p.price.total} total` : `${n} payments of ${shown(p)}`
  }
  if (p.kind === 'subscription') {
    const trial = p.trialDays ? `${p.trialDays}-day free trial` : plan?.trial || null
    const extra = p.price?.note || (plan && PERIOD_NOTE[p.id]) || null
    const parts = [trial, extra !== trial ? extra : null].filter(Boolean)
    const interval = p.price?.interval || p.interval
    return parts.length ? parts.join(' · ') : `Renews every ${interval}. Cancel any time.`
  }
  if (p.kind === 'free') return 'No payment needed'
  if (p.kind === 'pwyw') return p.price?.note || 'Pay what you want'
  const parts = [p.price?.strike && `Was ${p.price.strike}`, p.price?.note].filter(Boolean)
  if (plan && p.id === 'lifetime') return parts[0] ? `Lifetime · ${parts.join(' · ')}` : 'Lifetime'
  return parts.length ? parts.join(' · ') : 'One payment'
}

// The id of a line's price options panel. id: the line's key (a product id, or 'site-access').
export const switchId = (id) => `co-switch-${id.replace(/[^a-z0-9-]/gi, '-')}`

const aloneLabel = (p) => (p.kind === 'installments' ? `Prefer ${countOf(p)} payments?` : `Prefer to pay ${p.label.toLowerCase()}?`)

// item: a checkout item ({ productId, priceId }). cart: a cart checkout, which offers one-time
// prices only (subscriptions and instalments are bought on their own); `alone` then points to
// buying it on its own at another price.
// Returns { options: [{ id, title, meta, description }], alone: { label, href } | null } or null
// when there's nothing to switch to.
export function priceChoices(item, { cart = false } = {}) {
  const all = pricesFor(item.productId)
  const plan = item.productId.startsWith('plan:') ? getPlan(item.productId.slice(5)) : null
  const cartRule = cart && item.productId !== 'site-access'
  const offered = cartRule ? all.filter((p) => isOneTime(p) || p.id === item.priceId) : all
  const other = cartRule ? all.find((p) => !isOneTime(p) && p.id !== item.priceId) : null
  if (offered.length < 2 && !other) return null
  return {
    options: offered.map((p) => {
      const description = note(p, plan)
      return { id: p.id, title: p.label, meta: display(p), description: description !== p.label ? description : null }
    }),
    alone: other ? { label: aloneLabel(other), href: `/checkout/${item.productId}?price=${encodeURIComponent(other.id)}` } : null,
  }
}
