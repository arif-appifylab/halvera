// A cohort's live session lesson in its four states: scheduled (date, countdown, add to calendar),
// join window and live ("Join live session"), recording on its way, and the replay.
import { Badge, Button, Card, Countdown, Icon, Notice } from '@/design-system'
import VideoPlayer from '@/components/media/VideoPlayer.jsx'
import { videoSourceFor } from '@/data/media.js'
import { studentRun, liveSessions, whenLabel, dayLabel, joinHref } from './cohort.js'
import { useNow } from './useNow.js'
import './course.css'

const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

function calendarHref(product, session) {
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Halvera//Cohorts//EN', 'BEGIN:VEVENT',
    `UID:${product.slug}-${session.lesson.id}@halvera`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(session.start)}`, `DTEND:${stamp(session.end)}`,
    `SUMMARY:${product.title}: ${session.lesson.title}`, `LOCATION:${product.cohort.location || 'Online'}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics)
}

const STATE_BADGE = {
  scheduled: { tone: 'info', icon: 'calendar', label: 'Scheduled' },
  soon: { tone: 'success', icon: 'video', label: 'Starting soon' },
  live: { tone: 'success', icon: 'video', label: 'Live now' },
  processing: { tone: 'neutral', icon: 'clock', label: 'Replay on its way' },
  replay: { tone: 'primary', icon: 'play', label: 'Replay' },
}

export default function CohortLiveLesson({ product, lesson }) {
  useNow(5000) // re-render so the join window opens on time
  const run = studentRun(product)
  const session = liveSessions(product, run).find((s) => s.lesson.id === lesson.id)
  if (!session) return null
  const c = product.cohort
  const badge = STATE_BADGE[session.state]
  const where = `${c.location || 'Online'}, ${c.sessionMinutes} minutes`

  if (session.state === 'replay') {
    return (
      <figure className="ln-figure">
        <VideoPlayer source={videoSourceFor(product.slug, lesson.id)} title={lesson.title} resumeKey={`${product.slug}/${lesson.id}`} />
        <figcaption className="t-body-sm t-muted cr-live-caption">
          <Badge tone={badge.tone} icon={badge.icon}>{badge.label}</Badge>
          <span>Recorded live with the {run.name} cohort on {dayLabel(session.start, c.timeZone)}.</span>
        </figcaption>
      </figure>
    )
  }

  const joinable = session.state === 'soon' || session.state === 'live'
  return (
    <Card padding="lg" className="cr-live">
      <div className="pg-row">
        <Badge tone={badge.tone} icon={badge.icon}>{badge.label}</Badge>
        <span className="t-body-sm t-muted">{run.name} cohort</span>
      </div>
      <dl className="pg-facts">
        <dt>When</dt><dd>{whenLabel(session.start)}</dd>
        <dt>Where</dt><dd>{where}</dd>
      </dl>
      {session.state === 'scheduled' && (
        <>
          <Countdown to={session.start} label="Starts in" />
          <p className="t-body-sm t-muted">Times are shown in your time zone. The join link appears here 15 minutes before the start, and the replay within a day.</p>
          <div className="pg-row">
            <Button variant="secondary" iconStart="calendar" href={calendarHref(product, session)} download={`${lesson.id}.ics`}>Add to calendar</Button>
          </div>
        </>
      )}
      {joinable && (
        <>
          <p>{session.state === 'live' ? 'The session has started. Come in whenever you’re ready, cameras optional.' : 'The room is open. Grab a drink and come in a few minutes early if you like.'}</p>
          <div className="pg-row">
            <Button size="lg" iconStart="video" href={joinHref(product)} target="_blank" rel="noopener noreferrer">
              Join live session<span className="sg-sr"> (opens {c.location || 'the meeting'} in a new tab)</span>
            </Button>
          </div>
        </>
      )}
      {session.state === 'processing' && (
        <Notice tone="info" title="The recording is on its way">
          We post every replay within a day of the session. It will play right here.
        </Notice>
      )}
      <p className="cr-live-note t-body-sm t-muted"><Icon name="users" size={16} />Questions you’d like covered? Post them in the cohort chat before the session.</p>
    </Card>
  )
}
