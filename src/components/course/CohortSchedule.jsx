// The cohort block on the sales page: how the circle runs, every upcoming cohort with its dates,
// places left and enrolment deadline, and what happens when one is full (next cohort or waitlist).
import { Badge, Card, Countdown, Icon } from '@/design-system'
import { cohortSale, studentRun, placesLabel } from './cohort.js'
import './course.css'

export default function CohortSchedule({ product, owned }) {
  const c = product.cohort
  const { upcoming, next, whenFull, firstFull } = cohortSale(product)
  const mine = owned ? studentRun(product) : null
  const nextOpen = (run) => upcoming.find((r) => r.open && r.start > run.start)

  return (
    <section className="pd-section" aria-labelledby="pd-dates">
      <h2 id="pd-dates" className="t-heading-2">Dates and times</h2>
      <p className="t-muted">We meet as a small group, so places are limited. Each cohort starts together and moves through the weeks together.</p>

      {mine && (
        <p className="cr-mine">
          <Icon name="check-circle" size={18} />
          <span>You’re in the <strong>{mine.name}</strong> cohort · {mine.schedule}</span>
        </p>
      )}

      <Card tone="sunken" padding="md">
        <dl className="pg-facts pd-facts">
          <div className="pd-fact"><dt>Length</dt><dd>{c.weeks} weeks</dd></div>
          <div className="pd-fact"><dt>Schedule</dt><dd>{c.schedule}<span className="pd-fact-note">Times show in your time zone in the course</span></dd></div>
          <div className="pd-fact"><dt>Where</dt><dd>{c.location}, plus a private group chat</dd></div>
          {c.runs[0]?.seats && <div className="pd-fact"><dt>Group size</dt><dd>Up to {c.runs[0].seats} people</dd></div>}
        </dl>
      </Card>

      {upcoming.length > 0 && (
        <div className="pg-stack-sm">
          <h3 className="t-heading-4">Upcoming cohorts</h3>
          <ul className="cr-runs">
            {upcoming.map((r) => {
              const passOn = r.full && whenFull === 'next' ? nextOpen(r) : null
              return (
                <li key={r.id} className={'cr-run' + (r.open ? '' : ' is-muted')}>
                  <div className="cr-run-main">
                    <span className="t-strong">{r.name}</span>
                    <span className="t-body-sm t-muted">{r.dates}</span>
                  </div>
                  <div className="cr-run-end">
                    <Badge tone={r.full ? 'warning' : r.seatsLeft <= 4 ? 'accent' : 'neutral'} icon={r.full ? 'users' : undefined}>{placesLabel(r)}</Badge>
                    <span className="t-body-sm t-muted">
                      {r.full
                        ? passOn ? `New enrolments join ${passOn.name}` : 'Join the waitlist for a place'
                        : r.closed ? 'Enrolment closed' : `Enrolment closes ${r.closesLabel}`}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
          {firstFull && whenFull === 'next' && next && (
            <p className="t-body-sm t-muted">When a cohort is full, new enrolments go to the next one that hasn’t started.</p>
          )}
        </div>
      )}

      {next && !mine && <Countdown to={next.start} label={`${next.name} starts in`} />}
    </section>
  )
}
