// What My programmes says about cohorts and bundles: progress and the line under the title.
import { studentRun, liveSessions, nextSession, whenLabel } from './cohort.js'
import { bundleProgress } from './bundle.js'

// { percent, completed, line } for a cohort or a bundle with courses, or null for anything else.
export function programmeSummary(product) {
  if (product.type === 'cohort' && product.cohort?.runs) {
    const run = studentRun(product)
    if (!run) return null
    const next = nextSession(liveSessions(product, run))
    const bits = [`${run.name} cohort`, run.dates, run.schedule]
    if (next) bits.push(`Next live session ${whenLabel(next.start)}`)
    return { line: bits.join(' · ') }
  }
  if (product.type === 'bundle') {
    const b = bundleProgress(product)
    if (!b.courses.length) return null
    const line = `${b.doneCount} of ${b.courses.length} courses complete${b.current ? ` · Up next: ${b.current.product.title}` : ''}`
    return { percent: b.percent, completed: b.complete, line }
  }
  return null
}
