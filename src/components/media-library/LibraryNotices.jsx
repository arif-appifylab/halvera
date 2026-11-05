// Notices at the top of a library page: what unlocks next (drip) and the expiration date.
// Also the closed state for people who reach an expired library without access.
import { Button, Notice, StateNotice } from '@/design-system'
import { productHref } from '@/lib/products.js'
import { itemLabel, releaseSummary, expiryOf } from './schedule.js'

export function LibraryNotices({ product, library }) {
  const next = library.episodes.find((e) => e.lock)
  const expiry = library.expiry
  if (!next && !expiry) return null
  return (
    <div className="pg-stack-sm">
      {next && (
        <Notice tone="info" title={`Next: ${itemLabel(product, next)}, ${next.title}`}>
          {next.lock.full || next.lock.label}. {releaseSummary(product)} We’ll email you when it opens.
        </Notice>
      )}
      {expiry && (
        <Notice tone={expiry.passed ? 'neutral' : 'info'} title={expiry.passed ? `This library closed to new members on ${expiry.date}` : `Open to new members until ${expiry.date}`}>
          {expiry.passed ? 'You joined before then, so everything here stays open for you.' : 'Your own access doesn’t change after that date.'}
        </Notice>
      )}
    </div>
  )
}

export function LibraryClosed({ product }) {
  const expiry = expiryOf(product)
  return (
    <StateNotice
      title={product.title}
      image={product.image}
      reason={expiry.label}
      detail="It’s no longer open to new members. Everyone who joined before then keeps their access, in My programmes."
      actions={<><Button href="/courses">Explore programmes</Button><Button variant="secondary" href={productHref(product)}>See details</Button></>}
    />
  )
}
