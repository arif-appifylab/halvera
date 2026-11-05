// Lock screens for cohort-paced drip and bundle Progressive mode. Same look as AccessGate.
import { useId } from 'react'
import { Button, Countdown, Icon, ProgressBar } from '@/design-system'
import { openHref } from '@/lib/products.js'
import '@/components/access-gate.css'

function Gate({ icon, product, lesson, title, body, extra, actions }) {
  const titleId = useId()
  return (
    <section className="gate" aria-labelledby={titleId}>
      <span className="gate-icon"><Icon name={icon} size={26} /></span>
      <p className="gate-product">{lesson ? lesson.title : product.title}</p>
      <h1 id={titleId} className="gate-title">{title}</h1>
      <p className="gate-body">{body}</p>
      {extra && <div className="gate-extra">{extra}</div>}
      {actions && <div className="gate-actions">{actions}</div>}
    </section>
  )
}

// "Unlocks with your cohort on Tue 20 Oct"
export function CohortLockGate({ product, lesson, lock, run, previousLesson }) {
  const upcoming = run?.phase === 'upcoming'
  return (
    <Gate
      icon="calendar" product={product} lesson={lesson}
      title={`Unlocks with your cohort on ${lock.unlockDate}`}
      body={upcoming
        ? `The ${run.name} cohort starts on ${lock.unlockDate}. Until then, the Before we start lessons are open, so you can settle in.`
        : `Your cohort moves through the programme together, one week at a time. Each week opens on the day of its live session.`}
      extra={upcoming && product.cohort?.countdown && <Countdown to={run.start} label="Your cohort starts in" />}
      actions={previousLesson && <Button variant="secondary" href={previousLesson.href}>Back to {previousLesson.title}</Button>}
    />
  )
}

// Progressive mode: "Complete Gut Health Reset to unlock"
export function BundleLockGate({ product, lesson, gate }) {
  const { bundle, previous } = gate
  return (
    <Gate
      icon="lock" product={product} lesson={lesson}
      title={`Complete ${previous.product.title} to unlock`}
      body={`${product.title} is part of ${bundle.title}, where courses open in order. Finish ${previous.product.title} and this one opens straight away.`}
      extra={<div className="cr-gate-progress"><ProgressBar value={previous.percent} label={`${previous.product.title} · ${previous.percent}% complete`} /></div>}
      actions={<>
        <Button href={previous.href}>Continue {previous.product.title}</Button>
        <Button variant="ghost" href={openHref(bundle)}>Back to the bundle</Button>
      </>}
    />
  )
}
