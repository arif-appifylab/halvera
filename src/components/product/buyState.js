// Which buy panel a viewer sees for a product. One state per view, one primary action per state.
import { ownsProduct, accessRequestFor, isFree } from '@/lib/products.js'
import { contentAccess } from '@/lib/access.js'

export const UNAVAILABLE = {
  'sold-out': 'Sold out',
  'sales-ended': 'Sales have ended',
  'enrolment-closed': 'Enrolment is closed',
}

// kind: owned | owned-preorder | access-ended | password | membership | private | unavailable | pre-order | free | buy
export function buyState(product, viewer, { request: localRequest } = {}) {
  const owned = ownsProduct(product, viewer)
  const request = localRequest || accessRequestFor(product, viewer)
  const access = contentAccess(product, viewer, { owned, requested: request?.status === 'Pending' })

  if (owned) {
    if (access.state === 'site-access-ended') return { kind: 'access-ended' }
    if (product.availability === 'pre-order') return { kind: 'owned-preorder' }
    return { kind: 'owned', viaPlan: product.visibility === 'membership' }
  }
  if (product.password) return { kind: 'password' }
  if (product.visibility === 'membership') return { kind: 'membership', upgrade: access.state === 'upgrade' }
  if (product.visibility === 'private') return { kind: 'private', request }
  if (UNAVAILABLE[product.availability]) return { kind: 'unavailable', reason: UNAVAILABLE[product.availability] }
  if (product.availability === 'pre-order') return { kind: 'pre-order' }
  if (isFree(product)) return { kind: 'free' }
  return { kind: 'buy' }
}

// What the unavailable notice says, per reason and product type.
export function unavailableDetail(product) {
  if (product.availability === 'sold-out') {
    const places = product.event?.seats || product.cohort?.seats
    return places
      ? `All ${places} places have been taken. Join the waitlist and we’ll email you if one opens up.`
      : 'Every place has been taken. Join the waitlist and we’ll email you if one opens up.'
  }
  if (product.availability === 'sales-ended') {
    return 'This programme is no longer on sale. Everyone who enrolled keeps their access.'
  }
  return 'Enrolment for this intake has closed. Join the waitlist to hear first when the next one opens.'
}
