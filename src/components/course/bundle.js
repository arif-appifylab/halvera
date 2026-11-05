// Bundle course helpers: each course's progress, Progressive mode locks and certificates.
// Admin → Bundle course: Progressive mode ("Users must finish each course before the next opens.
// Overrides prerequisites."), the bundle certificate and "Allow component certificates".
//
// Preview state (query string, for the theme's demo pages only):
//   ?bundle=complete   every course in the bundle is complete
import { owned, progress, certificates } from '@/data/account.js'
import { getProduct, ownedBundlesWith, openHref } from '@/lib/products.js'

const preview = () => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('bundle'))

const lessonCount = (p) => (p.curriculum || []).reduce((n, ch) => n + ch.lessons.length, 0)
const percentOf = (slug) => (preview() === 'complete' ? 100 : progress[slug]?.percent ?? 0)

// The courses in a bundle, in list order, with progress and locks.
export function bundleCourses(bundle) {
  const list = (bundle.bundle || []).map(getProduct).filter((p) => p && ['course', 'cohort'].includes(p.type))
  const courses = list.map((product) => {
    const percent = percentOf(product.slug)
    return {
      product, percent, lessons: lessonCount(product),
      done: percent >= 100, started: percent > 0 || Boolean(progress[product.slug]?.lastOpened),
      href: openHref(product), cert: certificates.find((c) => c.course === product.title),
    }
  })
  return courses.map((c, i) => {
    const previous = courses[i - 1] || null
    // Progressive mode only gates courses the student has through the bundle alone.
    const locked = Boolean(bundle.progressive && previous && !previous.done && !owned.includes(c.product.slug))
    return { ...c, previous, locked }
  })
}

// Overall progress, weighted by lessons, and whether everything is complete.
export function bundleProgress(bundle) {
  const courses = bundleCourses(bundle)
  const total = courses.reduce((n, c) => n + c.lessons, 0)
  const done = courses.reduce((n, c) => n + (c.percent / 100) * c.lessons, 0)
  const percent = total ? Math.round((done / total) * 100) : 0
  return {
    courses, percent,
    complete: courses.length > 0 && courses.every((c) => c.done),
    doneCount: courses.filter((c) => c.done).length,
    current: courses.find((c) => !c.done && !c.locked) || null,
  }
}

// A course opened through a bundle in Progressive mode, before the previous course is complete:
// { bundle, previous } or null.
export function bundleLockFor(product, viewer) {
  if (owned.includes(product.slug)) return null
  for (const bundle of ownedBundlesWith(product, viewer).filter((b) => b.progressive)) {
    const c = bundleCourses(bundle).find((x) => x.product.slug === product.slug)
    if (c?.locked) return { bundle, previous: c.previous }
  }
  return null
}

export const isBundlePreview = () => preview() === 'complete'
