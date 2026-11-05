// The cohort strip at the top of the course player: which cohort, its dates, "Week 3 of 8", the
// next live session (with a countdown, and "Join live session" from 15 minutes before) and the
// cohort's group chat on EzyCommunity.
import { Badge, Button, Icon } from '@/design-system'
import { lessonHref } from '@/components/player/lesson-types.js'
import { canJoin, nextSession, whenLabel, dayLabel, joinHref, liveSessions } from './cohort.js'
import { useNow, untilText } from './useNow.js'
import './course.css'

export default function CohortBanner({ product, run, sessions: initial, currentLessonId, query = '' }) {
  const now = useNow(canJoin(nextSession(initial)) ? 5000 : 30000)
  if (!run) return null
  const sessions = liveSessions(product, run, { now }) // fresh states as time passes
  const c = product.cohort
  const next = nextSession(sessions)
  const joinable = canJoin(next)
  const onThisLesson = next && next.lesson.id === currentLessonId
  const done = sessions.filter((s) => s.state === 'replay' || s.state === 'processing').length

  let status
  if (run.phase === 'upcoming') {
    status = (
      <p className="cr-banner-next">
        <Icon name="calendar" size={18} />
        <span>
          <span className="t-strong">Your cohort starts {dayLabel(run.start, c.timeZone)}</span>
          {c.countdown && <span className="t-muted"> · in {untilText(run.start.getTime() - now)}</span>}
        </span>
      </p>
    )
  } else if (next) {
    status = (
      <p className="cr-banner-next">
        <Icon name={joinable ? 'video' : 'clock'} size={18} />
        <span>
          <span className="t-muted">{next.state === 'live' ? 'Live now: ' : 'Next live session: '}</span>
          <a href={lessonHref(product.slug, next.lesson.id) + query} className="t-strong">{next.lesson.title}</a>
          <span className="t-muted">
            {' · '}
            {next.state === 'live' ? `started ${untilText(now - next.start.getTime())} ago` : `${whenLabel(next.start)}, in ${untilText(next.start.getTime() - now)}`}
          </span>
        </span>
      </p>
    )
  } else {
    status = (
      <p className="cr-banner-next">
        <Icon name="check-circle" size={18} />
        <span className="t-muted">All {done} live sessions are done. Replays stay open for as long as you have access.</span>
      </p>
    )
  }

  return (
    <section className="cr-banner" aria-label="Your cohort">
      <div className="cr-banner-main">
        <div className="cr-banner-head">
          <span className="sg-eyebrow">{run.name} cohort</span>
          <Badge tone={run.phase === 'running' ? 'primary' : run.phase === 'upcoming' ? 'info' : 'neutral'} icon={run.phase === 'upcoming' ? 'calendar' : undefined}>
            {run.schedule}
          </Badge>
          {joinable && <Badge tone="success" icon="video">{next.state === 'live' ? 'Live now' : 'Starting soon'}</Badge>}
        </div>
        <p className="t-body-sm t-muted">{run.dates} · {c.schedule}</p>
        {status}
      </div>
      <div className="cr-banner-actions">
        {joinable && !onThisLesson && (
          <Button href={joinHref(product)} iconStart="video" target="_blank" rel="noopener noreferrer">Join live session</Button>
        )}
        {c.community && (
          <Button variant="ghost" size="sm" iconStart="users" href={c.community} target="_blank" rel="noopener noreferrer">
            Cohort chat<span className="sg-sr"> (opens EzyCommunity in a new tab)</span>
          </Button>
        )}
      </div>
    </section>
  )
}
