import { useState } from 'react'
import { Button, StateNotice } from '@/design-system'
import AccessGate from '@/components/AccessGate.jsx'
import { useViewer } from '@/app/viewer.jsx'
import { ownsProduct, accessRequestFor, productHref } from '@/lib/products.js'
import { contentAccess, lessonLock } from '@/lib/access.js'
import { progress } from '@/data/account.js'
import { unavailableCopy } from '@/data/learn.js'
import { LessonBody } from '@/components/player/parts.jsx'
import { lessonHref } from '@/components/player/lesson-types.js'
import { studentRun, liveSessions, cohortLock, sessionMeta } from '@/components/course/cohort.js'
import { bundleLockFor } from '@/components/course/bundle.js'
import { CohortLockGate, BundleLockGate } from '@/components/course/CourseLocks.jsx'

// Everything a course player layout needs: the lesson list, access, locks, progress and the
// lesson body (content, gate or lock). Layouts in src/pages/learn/* only arrange it.
// Returns null when the lesson id isn't in the course. `query` (e.g. '?player=focus') is kept on
// every lesson link the hook builds; use `hrefFor(id)` for links in the layout.
export function usePlayer(product, lessonId, { query = '' } = {}) {
  const hrefFor = (id) => lessonHref(product.slug, id) + query
  const { viewer } = useViewer()
  const prog = progress[product.slug]
  const [done, setDone] = useState(() => new Set(prog?.done || []))

  const owned = ownsProduct(product, viewer)
  const access = contentAccess(product, viewer, { owned, requested: !!accessRequestFor(product, viewer) })
  const canOpen = access.state === 'open'

  const lessons = product.curriculum.flatMap((ch) => ch.lessons.map((l) => ({ ...l, chapter: ch.title })))
  const index = lessons.findIndex((l) => l.id === lessonId)
  if (index === -1) return null

  const lesson = lessons[index]
  const prev = lessons[index - 1]
  const next = lessons[index + 1]
  // Cohorts: the student's cohort, its live sessions and cohort-paced drip. Bundles in Progressive
  // mode: a course stays locked until the one before it is complete.
  const run = canOpen && product.type === 'cohort' ? studentRun(product) : null
  const sessions = run ? liveSessions(product, run) : []
  const sessionFor = (id) => sessions.find((s) => s.lesson.id === id) || null
  const bundleGate = canOpen ? bundleLockFor(product, viewer) : null
  // A lesson still locked for the cohort, or a session still ahead, never counts as done (?cohort=upcoming).
  const ahead = (id) => ['scheduled', 'soon', 'live'].includes(sessionFor(id)?.state)
  const isDone = (id) => canOpen && done.has(id) && !ahead(id) && !cohortLock(product, run, lessons.find((l) => l.id === id) || {})
  const prevDoneAt = (i) => i === 0 || isDone(lessons[i - 1].id)

  // Progress: start from the saved percent and spread the rest over the lessons still to do.
  const base = canOpen ? prog?.percent ?? 0 : 0
  const baseDone = canOpen ? prog?.done.length ?? 0 : 0
  const extra = (canOpen ? done.size : 0) - baseDone
  const remaining = lessons.length - baseDone
  const raw = extra >= 0
    ? base + extra * (remaining > 0 ? (100 - base) / remaining : 0)
    : base + extra * (baseDone > 0 ? base / baseDone : 0)
  const percent = Math.max(0, Math.min(100, Math.round(raw)))
  const complete = canOpen && percent >= 100

  const lockAt = (l, i) => cohortLock(product, run, l) || lessonLock(l, { previous: lessons[i - 1], previousDone: prevDoneAt(i) })

  const rowState = (l, i) => {
    if (!canOpen) return 'open'
    if (isDone(l.id)) return 'done'
    if (bundleGate) return 'drip'
    return lockAt(l, i)?.state || 'open'
  }

  // Duration line and unlock date for a lesson row (cohort dates and bundle locks need their own words).
  const rowMeta = (l, i) => {
    if (!canOpen) return { duration: l.duration, unlockDate: l.drip }
    if (bundleGate && !isDone(l.id)) return { duration: `${l.duration} · Complete ${bundleGate.previous.product.title} to unlock` }
    if (run && l.type === 'live') return { duration: sessionMeta(sessionFor(l.id), l.duration) }
    const lock = !isDone(l.id) && lockAt(l, i)
    if (lock?.cohort) return { duration: `${l.duration} · Unlocks with your cohort on ${lock.unlockDate}` }
    return { duration: l.duration, unlockDate: lock?.unlockDate }
  }

  const markDone = (id, on = true) => setDone((s) => {
    const n = new Set(s)
    if (on) n.add(id); else n.delete(id)
    return n
  })

  const gated = !canOpen && !lesson.preview
  const lock = canOpen ? (bundleGate ? { state: 'bundle' } : lockAt(lesson, index)) : null
  const previousLesson = prev ? { title: prev.title, href: hrefFor(prev.id) } : undefined

  let body
  if (gated && access.state === 'unavailable') {
    const copy = unavailableCopy[product.availability] || unavailableCopy['sales-ended']
    body = (
      <StateNotice
        title={product.title}
        reason={copy.reason}
        detail={copy.detail}
        actions={<><Button href="/courses">Explore programmes</Button><Button variant="secondary" href={productHref(product)}>See details</Button></>}
      />
    )
  } else if (gated) {
    body = <AccessGate state={access.state} product={product} lesson={lesson} viewer={viewer} />
  } else if (bundleGate) {
    body = <BundleLockGate product={product} lesson={lesson} gate={bundleGate} />
  } else if (lock?.cohort) {
    body = <CohortLockGate product={product} lesson={lesson} lock={lock} run={run} previousLesson={previousLesson} />
  } else if (lock) {
    body = <AccessGate state={lock.state} unlockDate={lock.unlockDate} previousLesson={previousLesson} product={product} lesson={lesson} viewer={viewer} />
  } else {
    body = (
      <LessonBody
        key={lesson.id}
        product={product}
        lesson={lesson}
        canOpen={canOpen}
        done={isDone(lesson.id)}
        onComplete={() => markDone(lesson.id)}
      />
    )
  }

  const showHeader = !gated && !lock

  return {
    viewer, access, canOpen, lessons, lesson, index, prev, next, isDone, rowState, rowMeta, markDone,
    percent, complete, gated, lock, previousLesson, body, showHeader, hrefFor,
    run, sessions, session: sessionFor(lesson.id), bundleGate,
  }
}
