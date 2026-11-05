// Who is reading the newsletter, and what they can open. In EzyCourse the server sends the
// reader's subscription; here it comes from the account data, and the theme preview can
// override it with ?tier= (none · free · trial · paid · supporter · paused · ended · unsubscribed).
import { subscriptions } from '@/data/account.js'
import { getPlan } from '@/data/plans.js'
import { pricesFor } from '@/lib/commerce.js'

export const TIER_PREVIEW = [
  { value: 'none', label: 'Not subscribed' },
  { value: 'free', label: 'Free' },
  { value: 'trial', label: 'Paid · trial' },
  { value: 'paid', label: 'Paid' },
  { value: 'supporter', label: 'Supporter' },
  { value: 'paused', label: 'Paused' },
  { value: 'ended', label: 'Cancelled' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
]
const STATUSES = TIER_PREVIEW.map((t) => t.value)

// Paid tiers that open paid posts. Paused and cancelled paid readers stay on the free list.
const PAID = ['trial', 'paid', 'supporter']
const ON_LIST = ['free', 'trial', 'paid', 'supporter', 'paused', 'ended']

export function readerFor(newsletter, product, viewer, search) {
  const param = new URLSearchParams(search).get('tier')
  const plan = viewer.plan && newsletter.membershipPlans.includes(viewer.plan) ? getPlan(viewer.plan) : null
  let status
  if (STATUSES.includes(param)) status = param
  else if (viewer.role === 'visitor') status = 'visitor'
  else if (viewer.role === 'member') status = 'free' // members read through their plan; the email is the free letter
  else {
    const sub = subscriptions.find((s) => s.name === product.title)
    status = sub?.status === 'Trialing' ? 'trial' : sub?.status === 'Active' ? 'paid' : 'free'
  }
  const known = status !== 'visitor'
  return {
    status,
    known,
    email: viewer.email || 'adnan@example.com',
    name: viewer.name || 'Adnan Rahman',
    plan, // a site membership that includes the paid edition
    paid: PAID.includes(status),
    supporter: status === 'supporter',
    subscribed: ON_LIST.includes(status),
    trialUsed: ['trial', 'paid', 'supporter', 'paused', 'ended'].includes(status),
  }
}

// Can this reader open the whole post?
export function canRead(post, reader) {
  switch (post.access) {
    case 'public': return true
    case 'subscribers': return reader.subscribed || Boolean(reader.plan)
    case 'paid': return reader.paid || Boolean(reader.plan)
    case 'supporter': return reader.supporter
    case 'members': return Boolean(reader.plan)
    default: return true
  }
}

export const isPaidPost = (post) => ['paid', 'supporter', 'members'].includes(post.access)

export function canComment(post, reader, newsletter) {
  if (!newsletter.comments.on || !reader.known) return false
  if (isPaidPost(post) && newsletter.comments.paidOnly) return canRead(post, reader)
  return reader.subscribed || Boolean(reader.plan)
}

export const BADGE = {
  public: { label: 'Free', tone: 'neutral' },
  subscribers: { label: 'Free', tone: 'neutral' },
  paid: { label: 'Paid', tone: 'accent' },
  supporter: { label: 'Supporters', tone: 'accent' },
  members: { label: 'Members', tone: 'primary' },
}

// Paid prices for a tier ('paid', 'supporter') or every paid tier.
export const paidPrices = (product, tier) =>
  pricesFor(product.slug).filter((p) => p.tier && (!tier || p.tier === tier))

export function checkoutHref(product, priceId, forRef) {
  return `/checkout/${product.slug}?price=${priceId}${forRef ? `&for=${encodeURIComponent(forRef)}` : ''}`
}

// Button wording for a paid price: a trial only for readers who haven't had one.
export function upgradeLabel(price, reader, verb = 'Upgrade') {
  if (price?.trialDays && !reader.trialUsed) return `Start ${price.trialDays}-day free trial`
  if (reader.status === 'ended') return 'Restart the paid edition'
  return verb
}

// Keep the preview switch in every in-newsletter link.
export function withTier(href, search) {
  const tier = new URLSearchParams(search).get('tier')
  const as = new URLSearchParams(search).get('as')
  const q = new URLSearchParams()
  if (as) q.set('as', as)
  if (tier) q.set('tier', tier)
  const s = q.toString()
  return s ? `${href}?${s}` : href
}
