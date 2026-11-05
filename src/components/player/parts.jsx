import { lazy, useEffect, useId, useRef, useState, Suspense } from 'react'
import {
  cx, Avatar, Badge, StatusBadge, Button, Card, Checkbox, Icon, IconButton, Notice,
  ProgressBar, RadioCard, Skeleton, Stepper, TextField,
} from '@/design-system'
import { certificates } from '@/data/account.js'
import { getPractitioner } from '@/data/people.js'
import { lessonContent, defaultNotes } from '@/data/learn.js'
import { getQuiz, quizSummary, formatWhen, RESULT_LABEL, layoutOf, layoutSummary } from '@/data/quizzes.js'
import { productHref } from '@/lib/products.js'
import { TYPE_LABEL, TYPE_ICON, COUNTS_QUESTIONS, lessonHref, shownType } from '@/components/player/lesson-types.js'
import VideoPlayer from '@/components/media/VideoPlayer.jsx'
import AudioStage from '@/components/media/AudioStage.jsx'
import { videoSourceFor } from '@/data/media.js'
import { getMedia } from '@/data/media-credits.js'
import RichTextEditor from '@/components/editor/RichTextEditor.jsx'
import RichTextView from '@/components/editor/RichTextView.jsx'
import { track as trackAssignment } from '@/lib/analytics/index.js'
import { track, getContext, useReadProgress, useFocusTime, parseDuration } from '@/lib/analytics'
import { installScormApi } from '@/lib/scorm/api.js'
import CohortLiveLesson from '@/components/course/CohortLiveLesson.jsx'
import AnswerBoard from '@/components/player/AnswerBoard.jsx'
import BookReader from '@/components/ebook/BookReader.jsx'
import '@/pages/learn.css'

// Lesson content shared by every course player layout (src/pages/learn/*). LessonBody picks one
// renderer per lesson type (see RENDERERS), then the "About this lesson" notes.

// Lesson type, duration (or question count) and the Free preview badge.
export function LessonMeta({ product, lesson }) {
  const questions = COUNTS_QUESTIONS.includes(lesson.type) && (getQuiz(product.slug, lesson.id) || lessonContent[product.slug]?.[lesson.id])?.questions
  return (
    <p className="ln-meta">
      <Icon name={TYPE_ICON[shownType(lesson)] || 'file'} size={16} />
      <span>{TYPE_LABEL[shownType(lesson)] || 'Lesson'}</span>
      {(questions || lesson.duration) && (
        <>
          <span aria-hidden="true">·</span>
          <span>{questions ? `${questions.length} questions` : lesson.duration}</span>
        </>
      )}
      {lesson.preview && <Badge tone="accent">Free preview</Badge>}
    </p>
  )
}

// Shown above a free-preview lesson for someone who can't open the course yet.
export function PreviewNotice({ product, access }) {
  if (access.state === 'pre-order') {
    return (
      <Notice tone="info" title={`${product.title} opens on ${product.releases}`}>
        Your pre-order is confirmed. Until then, this free preview is open to you.
      </Notice>
    )
  }
  return (
    <Notice tone="info" title="You’re watching a free preview" action={<Button size="sm" variant="secondary" href={productHref(product)}>See prices and enrol</Button>}>
      Enrol in {product.title} to open every lesson and save your progress.
    </Notice>
  )
}

// One renderer per lesson type. Each gets { product, lesson, content, canOpen, done, onComplete, practitioner }.
const RENDERERS = {
  video: MediaLesson,
  live: MediaLesson,
  interactive: InteractiveLesson,
  audio: AudioLesson,
  text: ReadingLesson,
  slide: SlideLesson,
  pdf: PdfLesson,
  download: DownloadLesson,
  quiz: QuizLesson,
  survey: SurveyLesson,
  assignment: AssignmentLesson,
  embedded: EmbeddedLesson,
  scorm: ScormLesson,
  multiple: MultiPartLesson,
  ai: CoachLesson,
  ebook: EbookLesson,
}

export function LessonBody({ product, lesson, canOpen, done, onComplete }) {
  const content = lessonContent[product.slug]?.[lesson.id] || {}
  const notes = content.notes || defaultNotes
  const practitioner = getPractitioner(product.practitioner)
  const Renderer = RENDERERS[lesson.type]

  return (
    <div className="ln-body">
      {Renderer && (
        <Renderer
          product={product}
          lesson={lesson}
          content={content}
          canOpen={canOpen}
          done={done}
          onComplete={onComplete}
          practitioner={practitioner}
        />
      )}

      {(notes.length > 0 || content.points) && (
        <section className="ln-notes" aria-labelledby="ln-notes-title">
          <h2 id="ln-notes-title" className="t-heading-3">About this lesson</h2>
          {notes.map((n) => <p key={n}>{n}</p>)}
          {content.points && (
            <ul className="pg-ticks">
              {content.points.map((pt) => <li key={pt}><Icon name="check" size={18} /><span>{pt}</span></li>)}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

const fileType = (f) => f.type || (f.name.split('.').pop() || 'File').toUpperCase()

/* ---------- Video, live and audio ---------- */

function MediaLesson({ lesson, product }) {
  return <MediaBlock lesson={lesson} product={product} />
}

// Video lessons and live replays play in VideoPlayer (Bunny Stream, DRM or not; a plain MP4 in the
// preview). The source comes from src/data/media.js. An upcoming cohort live session has no video yet.
export function MediaBlock({ lesson, product }) {
  const [playing, setPlaying] = useState(false)
  // Cohort live sessions: scheduled, join window, live, replay (src/components/course/CohortLiveLesson.jsx).
  if (lesson.type === 'live' && product.cohort?.runs) return <CohortLiveLesson product={product} lesson={lesson} />
  const upcomingLive = lesson.type === 'live' && product.type === 'cohort'
  const isVideo = lesson.type === 'video' || (lesson.type === 'live' && !upcomingLive)
  return (
    <figure className="ln-figure">
      {isVideo ? (
        <VideoPlayer
          source={videoSourceFor(product.slug, lesson.id)}
          title={lesson.title}
          resumeKey={`${product.slug}/${lesson.id}`}
        />
      ) : upcomingLive ? (
        <div className="pg-media ln-media">
          <Icon name="users" size={40} />
        </div>
      ) : (
        <div className="pg-media ln-media">
          {lesson.type === 'audio' && <Icon name="headphones" size={40} className="ln-media-mark" />}
          <button type="button" className="ln-play" onClick={() => setPlaying(!playing)} aria-label={(playing ? 'Pause ' : 'Play ') + lesson.title}>
            <Icon name={playing ? 'pause' : 'play'} size={30} />
          </button>
        </div>
      )}
      {lesson.type === 'live' && (
        <figcaption className="t-body-sm t-muted">
          {upcomingLive
            ? `Live on Zoom, ${lesson.duration} (GMT). The join link appears here 15 minutes before, and the replay within a day.`
            : 'Replay of the live session. Questions are listed in the notes below.'}
        </figcaption>
      )}
    </figure>
  )
}

// Interactive video: our own player (Video.js 10) with in-video questions, reflections and resource cards
// from lessonContent[slug][lessonId].interactive. Loaded on demand (docs/video-player.md "Interactive video").
const InteractiveVideo = lazy(() => import('@/components/media/InteractiveVideo.jsx'))

function InteractiveLesson({ product, lesson, content, canOpen, done, onComplete }) {
  const iv = content.interactive || {}
  return (
    <div className="ln-figure">
      <Suspense fallback={<Skeleton height={360} radius="var(--radius-xl)" />}>
        <InteractiveVideo
          source={videoSourceFor(product.slug, lesson.id)}
          title={lesson.title}
          cues={iv.cues}
          captions={iv.captions}
          chapters={iv.chapters}
          duration={parseDuration(lesson.duration)}
          resumeKey={`${product.slug}/${lesson.id}`}
          onRuleMet={canOpen && !done ? onComplete : undefined}
        />
      </Suspense>
    </div>
  )
}

// Audio lessons play in AudioStage (full width of the media column, like the video stage): the
// artwork (content.audio.cover, a media-credits key or URL, else the practitioner's photo, else the
// course image), title, length, timeline, skip 15 s, speed, and the audio_* analytics. The transcript
// lives in the lesson tools' Transcript tab (src/data/lesson-tools.js), not under the player.
const audioCover = (cover) => (cover && (getMedia(cover)?.url || cover)) || null

function AudioLesson({ product, lesson, content, practitioner }) {
  const audio = content.audio || {}
  return (
    <>
      <figure className="ln-figure ln-audio">
        <AudioStage
          title={audio.title || lesson.title}
          subtitle={audio.subtitle || (practitioner && `Guided by ${practitioner.name}`)}
          duration={audio.duration || lesson.duration}
          src={audio.src}
          cover={audioCover(audio.cover) || practitioner?.photo || product.image}
          eyebrow="Guided audio"
          resumeKey={`${product.slug}/${lesson.id}`}
        />
      </figure>
    </>
  )
}

/* ---------- Reading ---------- */

function ReadingLesson({ lesson, content }) {
  const reading = content.reading
  const readRef = useRef(null)
  useReadProgress(readRef, { enabled: !!reading })
  if (!reading) return null
  return (
    <article className="ln-reading" aria-label={lesson.title} ref={readRef}>
      <p className="ln-reading-time"><Icon name="clock" size={16} />{reading.minutes} min read</p>
      <div className="pg-prose">
        {reading.blocks.map((b, i) => {
          if (b.h2) return <h2 key={i}>{b.h2}</h2>
          if (b.h3) return <h3 key={i}>{b.h3}</h3>
          if (b.list) return <ul key={i}>{b.list.map((li) => <li key={li}>{li}</li>)}</ul>
          if (b.quote) {
            return (
              <blockquote key={i} className="ln-pull">
                <p>{b.quote}</p>
                {b.cite && <footer className="ln-pull-cite"><cite>{b.cite}</cite></footer>}
              </blockquote>
            )
          }
          return <p key={i}>{b.p}</p>
        })}
      </div>
    </article>
  )
}

/* ---------- Slides and PDF: one viewer (src/components/media/DocumentViewer.jsx, docs/document-viewer.md) ---------- */

// pdf.js is large, so the viewer loads only when a PDF or slide lesson opens.
const DocumentViewer = lazy(() => import('@/components/media/DocumentViewer.jsx'))

function DocumentLesson(props) {
  return (
    <Suspense fallback={<Skeleton height={420} radius="var(--radius-lg)" />}>
      <DocumentViewer {...props} />
    </Suspense>
  )
}

// Slide decks are stored as PDF (the backend converts PPTX, Keynote and Google Slides on upload,
// one slide per page). content.file.url overrides the sample deck.
function SlideLesson({ product, lesson, content }) {
  const file = content.file || {}
  return (
    <DocumentLesson
      key={lesson.id}
      mode="slides"
      file={file.url || '/files/gut-basics-slides.pdf'}
      title={lesson.title}
      downloadable={Boolean(file.downloadable)}
      rememberKey={`${product.slug}/${lesson.id}`}
    />
  )
}

// content.file.url overrides the sample PDF; downloads are on unless content.file.downloadable is false.
function PdfLesson({ product, lesson, content }) {
  const file = content.file || {}
  return (
    <DocumentLesson
      key={lesson.id}
      mode="document"
      file={file.url || '/files/symptom-tracker.pdf'}
      title={file.name?.replace(/\.pdf$/i, '') || lesson.title}
      downloadable={file.downloadable !== false}
      rememberKey={`${product.slug}/${lesson.id}`}
    />
  )
}

/* ---------- Downloads ---------- */

function DownloadLesson({ lesson, content }) {
  const files = content.files || [content.file || { name: `${lesson.title}.pdf`, type: 'PDF', size: '1.2 MB' }]
  return <FileList files={files} />
}

export function FileList({ files, title = 'Files in this lesson' }) {
  const headId = useId()
  return (
    <Card padding="sm" className="ln-files">
      <div className="ln-files-head">
        <h2 id={headId} className="t-heading-4">{title}</h2>
        {files.length > 1 && <Button variant="ghost" size="sm" iconStart="download" onClick={() => track('file_download', { all: true, count: files.length })}>Download all</Button>}
      </div>
      <ul className="ln-files-list" aria-labelledby={headId}>
        {files.map((f) => (
          <li key={f.name} className="ln-file-row">
            <span className="ln-file-icon"><Icon name="file" size={22} /></span>
            <span className="ln-file-text">
              <span className="t-strong">{f.name}</span>
              <span className="t-body-sm t-muted">{[fileType(f), f.size, f.pages].filter(Boolean).join(' · ')}</span>
            </span>
            <Button variant="secondary" size="sm" iconStart="download" aria-label={`Download ${f.name}`} onClick={() => track('file_download', { file: f.name, fileType: fileType(f), size: f.size })}>Download</Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// Kept for other pages that show a single file.
export function FileCard({ file }) {
  return (
    <Card className="ln-file">
      <span className="ln-file-icon"><Icon name="file" size={24} /></span>
      <span className="ln-file-text">
        <span className="t-strong">{file.name}</span>
        <span className="t-body-sm t-muted">{[file.size, file.pages].filter(Boolean).join(' · ')}</span>
      </span>
      <Button variant="secondary" iconStart="download" onClick={() => track('file_download', { file: file.name, fileType: fileType(file), size: file.size })}>Download</Button>
    </Card>
  )
}

/* ---------- Quiz ---------- */

// The quiz lesson is an intro card. The quiz itself opens full screen at
// /course/<slug>/learn/<lessonId>/quiz (src/pages/QuizAttempt.jsx); a passed attempt there marks
// this lesson complete when the student comes back. Definitions and attempts: src/data/quizzes.js.
function QuizLesson({ product, lesson, canOpen, done, onComplete }) {
  const summary = quizSummary(product.slug, lesson.id, { canSave: canOpen })
  if (!summary) return null
  return <Quiz product={product} lesson={lesson} summary={summary} canSave={canOpen} passedBefore={done} onPass={onComplete} />
}

const minutesLeft = (deadline) => Math.max(0, Math.ceil((deadline - Date.now()) / 60000))
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export function Quiz({ product, lesson, summary, canSave, passedBefore, onPass }) {
  const { quiz, used, allowed, left, best, last, current, canStart, passedOnce } = summary
  const s = quiz.settings
  const href = `${lessonHref(product.slug, lesson.id)}/quiz`
  const passed = passedBefore || passedOnce

  // A pass recorded on the quiz page completes the lesson here.
  useEffect(() => {
    if (canSave && passedOnce && !passedBefore) onPass()
  }, [canSave, passedOnce, passedBefore, onPass])

  const layout = layoutOf(quiz)
  const parts = layout === 'sections' ? quiz.sections || [] : []
  const rules = [
    layout === 'all' && 'Every question is on one page. Submit at the bottom when you’re done.',
    parts.length > 0 && `The test has ${parts.length} sections, each on its own page. Use Next and Back to move between them.`,
    parts.length > 0 && s.beforeSubmit === 'review' && 'At the end you can review every answer before you submit.',
    s.shuffle && 'Questions are shuffled, so each attempt is in a different order.',
    s.back && layout !== 'all' && 'You can go back and change answers before you submit.',
    s.skip && layout === 'one' && 'You can skip a question and come back to it. Required questions still need an answer before you submit.',
    layout === 'one' && 'You can flag a question for review.',
    s.timeLimit && `You have ${s.timeLimit} minutes${parts.length ? ' in total' : ''}. The quiz submits itself when time runs out.`,
    'Your answers are saved as you go, so you can leave and come back.',
    s.passingRequired && 'Passing is required to continue to the next lesson.',
  ].filter(Boolean)

  const outOfAttempts = canSave && !current && !canStart && !passedOnce
  const status = current
    ? <Badge tone="info" icon="clock">In progress</Badge>
    : passed ? <StatusBadge status="Completed">Passed</StatusBadge>
    : last?.result === 'needs-review' ? <StatusBadge status="Needs review" />
    : null

  return (
    <Card padding="lg" className="ln-quiz">
      <div className="pg-stack">
        <div className="pg-stack-sm">
          <div className="pg-row-between">
            <h2 className="t-heading-3">{quiz.title}</h2>
            {status}
          </div>
          {quiz.intro && <p className="t-muted">{quiz.intro}</p>}
        </div>

        <dl className="pg-facts ln-quiz-facts">
          <dt>Layout</dt><dd>{layoutSummary(quiz)}</dd>
          {parts.length > 0 && <><dt>Sections</dt><dd>{parts.map((x) => x.title).join(', ')}</dd></>}
          <dt>Questions</dt><dd>{quiz.questions.length}</dd>
          <dt>Pass mark</dt><dd>{s.passMark}%</dd>
          <dt>Time limit</dt><dd>{s.timeLimit ? `${s.timeLimit} minutes` : 'None'}</dd>
          <dt>Attempts</dt><dd>{allowed === Infinity ? `${used} used · Unlimited` : `${used} of ${allowed} used`}</dd>
          {canSave && <><dt>Best score</dt><dd>{best == null ? 'No attempts yet' : `${best}%`}</dd></>}
          {last && (
            <>
              <dt>Last attempt</dt>
              <dd>{RESULT_LABEL[last.result]} · {last.score}% · {formatWhen(last.submittedAt)}</dd>
            </>
          )}
        </dl>

        <ul className="pg-ticks">
          {rules.map((r) => <li key={r}><Icon name="check" size={18} /><span>{r}</span></li>)}
        </ul>

        {current && (
          <Notice tone="info" title="You have an attempt in progress">
            Your answers so far are saved.{current.deadline ? ` About ${plural(minutesLeft(current.deadline), 'minute')} left.` : ''}
          </Notice>
        )}
        {last?.result === 'needs-review' && !passed && !current && (
          <Notice tone="info" title="Your last attempt needs review">
            {quiz.marker} is marking your written answers. Your result updates when that’s done, usually within two working days.
          </Notice>
        )}
        {outOfAttempts && (
          <Notice tone="warning" title="You’ve used every attempt" action={<Button size="sm" variant="secondary" href="/contact-us">Contact us</Button>}>
            Send us a message and we’ll reset it for you.
          </Notice>
        )}
        {!canSave && (
          <p className="ln-private"><Icon name="lock" size={16} />You can try this quiz in the preview. Enrol to save your score.</p>
        )}

        <div className="pg-row">
          {(current || canStart || !canSave) && (
            <Button variant="secondary" iconEnd="arrow-right" href={href}>
              {current ? 'Continue the quiz' : 'Start quiz'}
            </Button>
          )}
          {last && <Button variant="link" href={`${href}?review=last`}>Review your last attempt</Button>}
          {canSave && left !== Infinity && left > 0 && used > 0 && !current && (
            <span className="t-body-sm t-muted">{plural(left, 'attempt')} left</span>
          )}
        </div>
      </div>
    </Card>
  )
}

/* ---------- Survey ---------- */

function SurveyLesson({ content, canOpen, done, onComplete, practitioner }) {
  if (!content.questions) return null
  return <Survey survey={content} canSave={canOpen} sentBefore={done} onSend={onComplete} practitioner={practitioner.name} />
}

const listNumbers = (nums) => (nums.length === 1 ? `question ${nums[0]}` : `questions ${nums.slice(0, -1).join(', ')} and ${nums[nums.length - 1]}`)

export function Survey({ survey, canSave, sentBefore, onSend, practitioner }) {
  const uid = useId()
  const [answers, setAnswers] = useState({})
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const set = (id, v) => setAnswers((a) => ({ ...a, [id]: v }))
  const toggle = (id, v) => setAnswers((a) => {
    const cur = a[id] || []
    return { ...a, [id]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }
  })
  const answered = (q) => {
    const v = answers[q.id]
    return Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : v != null
  }

  const submit = (e) => {
    e.preventDefault()
    const missing = survey.questions.map((q, i) => (!q.optional && !answered(q) ? i + 1 : null)).filter(Boolean)
    if (missing.length) { setError(`Answer ${listNumbers(missing)} to send your answers.`); return }
    setError(null)
    setSent(true)
    // Counts only: what someone answered stays with the survey, never in analytics.
    track('survey_submit', { answered: survey.questions.filter(answered).length, total: survey.questions.length, resubmit: sentBefore || undefined })
    if (canSave) onSend()
  }

  const privacy = (
    <p className="ln-private"><Icon name="lock" size={16} />Your answers are private to your practitioner, {practitioner}.</p>
  )

  if (sent) {
    return (
      <Card padding="lg" className="pg-stack">
        <Notice
          tone="success"
          title="Thank you, your answers are in"
          action={<Button variant="secondary" size="sm" onClick={() => setSent(false)}>Change my answers</Button>}
        >
          {survey.thanks}
        </Notice>
        {privacy}
      </Card>
    )
  }

  return (
    <Card padding="lg" className="ln-survey">
      <form onSubmit={submit} className="pg-stack" noValidate>
        <div className="pg-stack-sm">
          <div className="pg-row-between">
            <p className="t-body-sm t-muted">{survey.questions.length} questions · No right or wrong answers</p>
            {sentBefore && <StatusBadge status="Completed">Sent</StatusBadge>}
          </div>
          {survey.intro && <p>{survey.intro}</p>}
          {privacy}
        </div>

        {survey.questions.map((q, qi) => {
          const n = qi + 1
          const name = `${uid}-${q.id}`
          if (q.freeText) {
            return (
              <TextField
                key={q.id}
                label={`${n}. ${q.prompt}`}
                optional={q.optional}
                multiline
                rows={4}
                value={answers[q.id] || ''}
                onChange={(e) => set(q.id, e.target.value)}
              />
            )
          }
          if (q.scale) {
            const endsId = `${name}-ends`
            return (
              <fieldset key={q.id} className="ln-question" aria-describedby={endsId}>
                <legend className="ln-legend">{n}. {q.prompt}</legend>
                <div className="ln-scale">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <label key={v} className="ln-scale-opt">
                      <input type="radio" className="ln-vh" name={name} value={v} checked={answers[q.id] === v} onChange={() => set(q.id, v)} />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
                <p id={endsId} className="ln-scale-ends"><span>1 · {q.scale.min}</span><span>5 · {q.scale.max}</span></p>
              </fieldset>
            )
          }
          if (q.multiple) {
            return (
              <fieldset key={q.id} className="ln-question">
                <legend className="ln-legend">{n}. {q.prompt}</legend>
                {q.hint && <p className="t-body-sm t-muted ln-question-hint">{q.hint}</p>}
                <div className="pg-stack-sm">
                  {q.options.map((o) => (
                    <Checkbox
                      key={o.value}
                      label={o.label}
                      checked={(answers[q.id] || []).includes(o.value)}
                      onChange={() => toggle(q.id, o.value)}
                    />
                  ))}
                </div>
              </fieldset>
            )
          }
          return (
            <fieldset key={q.id} className="ln-question">
              <legend className="ln-legend">{n}. {q.prompt}</legend>
              <div className="pg-stack-sm">
                {q.options.map((o) => (
                  <RadioCard
                    key={o.value}
                    name={name}
                    value={o.value}
                    title={o.label}
                    checked={answers[q.id] === o.value}
                    onChange={() => set(q.id, o.value)}
                  />
                ))}
              </div>
            </fieldset>
          )
        })}

        {error && <Notice tone="danger">{error}</Notice>}

        <div className="pg-row">
          <Button type="submit" disabled={!canSave}>Submit answers</Button>
          {!canSave && <span className="t-body-sm t-muted">Enrol to send your answers.</span>}
        </div>
      </form>
    </Card>
  )
}

/* ---------- Assignment ---------- */

function AssignmentLesson({ product, lesson, content, canOpen, practitioner }) {
  return (
    <Assignment
      prompt={content.prompt}
      practitioner={practitioner}
      canSubmit={canOpen}
      submission={content.submission}
      draftKey={product && lesson ? `assignment:${product.slug}:${lesson.id}` : undefined}
    />
  )
}

const ASSIGNMENT_STEPS = [{ label: 'Draft' }, { label: 'Needs review' }, { label: 'Graded' }]

const countAnswerWords = (text) => (String(text || '').trim().match(/\S+/g) || []).length

// Draft → Needs review → Graded. `submission` (from data) starts the lesson on an earlier, graded answer.
// The answer is rich text (RichTextEditor, autosaved per course + lesson under `draftKey`); it's kept as
// Tiptap JSON plus schema-limited HTML and shown back with RichTextView.
export function Assignment({ prompt, practitioner, canSubmit, submission, draftKey }) {
  const person = typeof practitioner === 'string' ? { name: practitioner } : practitioner
  const [status, setStatus] = useState(submission?.graded ? 'graded' : 'draft')
  const [answer, setAnswer] = useState(() => ({
    html: submission?.text || '', json: null, text: submission?.text || '', words: countAnswerWords(submission?.text),
  }))
  const [file, setFile] = useState(submission?.file || null)
  const [error, setError] = useState(null)
  const [over, setOver] = useState(false)
  const fileRef = useRef(null)
  const editorRef = useRef(null)
  const answerValue = answer.json || answer.html
  const fid = useId()
  const step = { draft: 0, review: 1, graded: 3 }[status]

  const removeFile = () => {
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const header = (badge) => (
    <div className="ln-assign-head">
      <Stepper steps={ASSIGNMENT_STEPS} current={step} />
      <div className="pg-row-between">
        <h2 className="t-heading-4">{status === 'draft' ? 'Your answer' : 'Your submission'}</h2>
        {badge}
      </div>
    </div>
  )

  const attachment = file && (
    <p className="ln-attached"><Icon name="file" size={18} /><span>{file}</span></p>
  )

  if (status === 'graded') {
    return (
      <Card padding="lg" className="pg-stack">
        {header(<StatusBadge status="Graded" />)}
        <dl className="pg-facts">
          <dt>Sent</dt><dd>{submission.sent}</dd>
          <dt>Graded</dt><dd>{submission.gradedOn}</dd>
          <dt>Result</dt><dd>{submission.result}</dd>
        </dl>
        <section className="ln-feedback" aria-label={`Feedback from ${person.name}`}>
          <div className="ln-feedback-who">
            <Avatar name={person.name} size="sm" />
            <span className="ln-feedback-name">
              <span className="t-strong">{person.name}</span>
              <span className="t-body-sm t-muted">Feedback · {submission.gradedOn}</span>
            </span>
          </div>
          {submission.feedback.map((f) => <p key={f}>{f}</p>)}
        </section>
        <div className="pg-stack-sm">
          <h3 className="t-body-sm t-muted">Your answer</h3>
          <RichTextView value={answerValue} />
          {attachment}
        </div>
        <div className="pg-row">
          <Button variant="secondary" iconStart="arrow-left" onClick={() => setStatus('draft')} disabled={!canSubmit}>Revise and resubmit</Button>
        </div>
      </Card>
    )
  }

  if (status === 'review') {
    return (
      <Card padding="lg" className="pg-stack">
        {header(<StatusBadge status="Needs review" />)}
        <RichTextView value={answerValue} />
        {attachment}
        <p className="t-body-sm t-muted">Sent just now. {person.name} usually replies within 5 working days, and we’ll email you when there’s feedback.</p>
        <div className="pg-row">
          <Button variant="ghost" size="sm" onClick={() => setStatus('draft')}>Withdraw and edit</Button>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="lg">
      <form
        className="pg-stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (!answer.text.trim()) {
            setError('Write your answer before you submit it.')
            editorRef.current?.focus()
            return
          }
          setError(null)
          trackAssignment('assignment_submit', { words: answer.words, attachments: file ? 1 : 0 })
          editorRef.current?.clearDraft()
          setStatus('review')
        }}
      >
        {header(<StatusBadge status="Draft" />)}
        <RichTextEditor
          ref={editorRef}
          label="Your answer"
          hint={prompt || 'Write your answer below. Your practitioner will read it and reply.'}
          placeholder="Start writing your answer…"
          minHeight={180}
          value={answerValue}
          onChange={(html, json, { text, words }) => {
            setAnswer({ html, json, text, words })
            if (words) setError(null)
          }}
          error={error}
          autosaveKey={canSubmit ? draftKey : undefined}
        />

        <div className="ln-drop">
          <span className="sg-label" id={`${fid}-label`}>Attach a file <span className="t-muted">(optional)</span></span>
          <input
            ref={fileRef}
            id={fid}
            type="file"
            className="ln-vh"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            aria-labelledby={`${fid}-label`}
            aria-describedby={`${fid}-hint`}
            onChange={(e) => setFile(e.target.files?.[0]?.name || null)}
          />
          <label
            htmlFor={fid}
            className={cx('ln-drop-zone', over && 'is-over')}
            onDragOver={(e) => { e.preventDefault(); setOver(true) }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(false)
              const name = e.dataTransfer.files?.[0]?.name
              if (name) setFile(name)
            }}
          >
            <span className="ln-drop-icon" aria-hidden="true"><Icon name="plus" size={20} /></span>
            <span className="t-strong">Choose a file or drag it here</span>
            <span id={`${fid}-hint`} className="t-body-sm t-muted">PDF, Word or an image, up to 20 MB</span>
          </label>
          {file && (
            <div className="ln-attached is-removable">
              <Icon name="file" size={18} />
              <span>{file}</span>
              <IconButton icon="x" size="sm" label={`Remove ${file}`} onClick={removeFile} />
            </div>
          )}
        </div>

        <div className="pg-row">
          <Button type="submit" disabled={!canSubmit}>Submit for review</Button>
          <Button variant="ghost" onClick={() => editorRef.current?.saveDraft()} disabled={!canSubmit || !draftKey || !answer.text.trim()}>Save draft</Button>
          {!canSubmit && <span className="t-body-sm t-muted">Enrol to submit assignments.</span>}
        </div>
      </form>
    </Card>
  )
}

/* ---------- Embedded tool ---------- */

// Embedded lessons hold an embed URL or embed code (Admin → Embedded). A link to an outside tool shows in
// a framed window; embed code for an answer walkthrough (content.board) draws in the theme's own design.
function EmbeddedLesson({ content, product, lesson }) {
  if (content.board) return <AnswerBoard board={content.board} product={product} lesson={lesson} />
  return <EmbeddedTool content={content} />
}

function EmbeddedTool({ content }) {
  const tool = content.embed
  const frameRef = useRef(null)
  const provider = tool?.domain
  useEffect(() => { if (provider) track('embed_open', { provider, mode: 'inline', dedupeKey: 'inline' }) }, [provider])
  useFocusTime(frameRef, { type: 'embed_active_time', data: { provider } })
  if (!tool) return null
  return (
    <figure className="ln-embed">
      <div className="ln-embed-window" ref={frameRef}>
        <div className="ln-embed-bar">
          <span className="ln-embed-site">
            <Icon name="globe" size={18} />
            <span className="t-strong">{tool.name}</span>
            <span className="ln-embed-domain" dir="ltr">{tool.domain}</span>
          </span>
          <Button variant="secondary" size="sm" href={tool.url} target="_blank" rel="noopener noreferrer" onClick={() => track('embed_open', { provider, mode: 'new-tab' })}>Open in a new tab</Button>
        </div>
        <div className="ln-embed-frame" role="region" aria-label={`${tool.name}, embedded from ${tool.domain}`}>
          <div className="ln-embed-ph">
            <span className="ln-embed-mark" aria-hidden="true"><Icon name="clock" size={28} /></span>
            <p className="t-heading-3">{tool.name}</p>
            <p className="t-body-sm t-muted">{tool.description}</p>
            {tool.fields && (
              <ul className="ln-embed-fields" aria-label="What the tool asks for">
                {tool.fields.map((f) => (
                  <li key={f}><span className="t-body-sm">{f}</span><Skeleton height={36} radius="var(--radius-md)" /></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <figcaption className="ln-embed-note">
        <Icon name="info" size={16} />
        <span>Opens content from {tool.domain}{tool.provider ? `, run by ${tool.provider}` : ''}. What you enter there is covered by their privacy policy.</span>
      </figcaption>
    </figure>
  )
}

/* ---------- SCORM package ---------- */

function ScormLesson({ content, canOpen, done, onComplete }) {
  if (!content.scorm) return null
  return <ScormModule module={content.scorm} canSave={canOpen} doneBefore={done} onComplete={onComplete} />
}

export function ScormModule({ module: m, canSave, doneBefore, onComplete }) {
  const total = m.screens.length
  const [state, setState] = useState(doneBefore ? 'completed' : 'not-started')
  const [screen, setScreen] = useState(0)
  const [furthest, setFurthest] = useState(doneBefore ? total : 0)
  const [open, setOpen] = useState(false)
  const launchRef = useRef(null)
  const frameHead = useRef(null)
  const frameId = useId()

  useEffect(() => { if (open) frameHead.current?.focus() }, [open])

  // The simulated package talks to the SCORM 1.2 shim (src/lib/scorm/api.js) like a real one would.
  const scorm = useRef(null)
  useEffect(() => () => { scorm.current?.api.LMSFinish(''); scorm.current?.uninstall() }, [])
  const sco = (calls) => {
    const api = scorm.current?.api
    if (!api) return
    Object.entries(calls).forEach(([el, v]) => api.LMSSetValue(el, v))
    api.LMSCommit('')
  }

  const percent = state === 'completed' ? 100 : Math.round((furthest / total) * 100)
  const goTo = (n) => {
    setScreen(n)
    setFurthest((f) => Math.max(f, n))
    sco({ 'cmi.core.lesson_location': String(n), 'cmi.suspend_data': JSON.stringify({ furthest: Math.max(furthest, n) }) })
  }
  const launch = () => {
    if (!scorm.current) {
      const ctx = getContext()
      scorm.current = installScormApi({
        lessonKey: `${ctx.courseSlug}/${ctx.lessonId}`,
        onEvent: (type, data) => track(type, { courseSlug: ctx.courseSlug, lessonId: ctx.lessonId, lessonType: ctx.lessonType, sessionId: ctx.sessionId, ...data }),
      })
    }
    scorm.current.api.LMSInitialize('')
    if (state === 'not-started') { setState('in-progress'); sco({ 'cmi.core.lesson_status': 'incomplete' }) }
    if (state === 'completed') setScreen(0)
    setOpen(true)
  }
  const exit = () => {
    sco({ 'cmi.core.exit': state === 'completed' ? '' : 'suspend' })
    scorm.current?.api.LMSFinish('')
    setOpen(false)
    requestAnimationFrame(() => launchRef.current?.focus())
  }
  const finish = () => {
    setFurthest(total)
    setState('completed')
    sco({ 'cmi.core.score.raw': String(m.score), 'cmi.core.score.min': '0', 'cmi.core.score.max': '100', 'cmi.core.lesson_status': 'passed' })
    if (canSave) onComplete()
  }

  const badge = {
    'not-started': <Badge>Not started</Badge>,
    'in-progress': <Badge tone="info" icon="clock">In progress</Badge>,
    completed: <StatusBadge status="Completed" />,
  }[state]
  const launchLabel = { 'not-started': 'Launch module', 'in-progress': 'Resume module', completed: 'Review module' }[state]
  const s = m.screens[screen]
  const last = screen === total - 1

  return (
    <div className="ln-scorm">
      <Card padding="lg" className="ln-scorm-card">
        <span className="ln-scorm-icon" aria-hidden="true"><Icon name="play" size={24} /></span>
        <div className="ln-scorm-main">
          <div className="pg-row-between">
            <h2 className="t-heading-3">{m.module}</h2>
            {badge}
          </div>
          <p className="t-body-sm t-muted">{m.version} · {m.length}</p>
          <ProgressBar value={percent} label="Progress" />
          {state === 'completed' && <p className="t-body-sm">Score {m.score}% · Your result has been saved to this course.</p>}
          {state === 'in-progress' && !open && <p className="t-body-sm t-muted">You’re on screen {screen + 1} of {total}. It picks up where you left off.</p>}
          {!open && (
            <div className="pg-row">
              <Button ref={launchRef} variant="secondary" iconStart="play" onClick={launch} aria-controls={frameId} disabled={!canSave}>{launchLabel}</Button>
              {!canSave && <span className="t-body-sm t-muted">Enrol to open this module.</span>}
            </div>
          )}
        </div>
      </Card>

      {open && (
        <section id={frameId} className="ln-scorm-frame" aria-label={`${m.module}, training module`}>
          <div className="ln-scorm-bar">
            <span className="t-body-sm t-muted">{m.module} · Screen {screen + 1} of {total}</span>
            <Button variant="secondary" size="sm" iconStart="x" onClick={exit}>Exit module</Button>
          </div>
          <div className="ln-scorm-screen">
            <div className="ln-scorm-progress" aria-hidden="true">
              {m.screens.map((x, i) => <span key={x.title} className={cx(i <= screen && 'is-on')} />)}
            </div>
            <h3 ref={frameHead} tabIndex={-1} className="t-heading-2">{s.title}</h3>
            <p className="t-body-lg">{s.text}</p>
            {last && state === 'completed' && (
              <Notice tone="success" title="Module complete">You scored {m.score}%. You can exit the module now.</Notice>
            )}
            <div className="ln-scorm-nav">
              <Button variant="ghost" size="sm" iconStart="arrow-left" disabled={screen === 0} onClick={() => goTo(screen - 1)}>Back</Button>
              {!last && <Button variant="secondary" size="sm" iconEnd="arrow-right" onClick={() => goTo(screen + 1)}>Continue</Button>}
              {last && state !== 'completed' && <Button variant="secondary" size="sm" iconStart="check" onClick={finish}>Finish module</Button>}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

/* ---------- Multi-part lesson ---------- */

function MultiPartLesson({ product, lesson, content }) {
  const parts = content.parts || []
  const baseId = useId()
  const partsRef = useRef(null)
  useReadProgress(partsRef)
  return (
    <ol className="ln-parts" ref={partsRef}>
      {parts.map((p, i) => {
        const headId = `${baseId}-${i}`
        return (
          <li key={p.title} className="ln-part">
            <section aria-labelledby={headId} className="pg-stack-sm">
              <header className="ln-part-head">
                <span className="ln-part-num">Part {i + 1} of {parts.length}</span>
                <h2 id={headId} className="t-heading-3">{p.title}</h2>
              </header>
              {p.video && (
                <PartVideo
                  title={p.title}
                  duration={p.video.duration}
                  source={videoSourceFor(product.slug, lesson.id, i)}
                  resumeKey={`${product.slug}/${lesson.id}#${i}`}
                />
              )}
              {p.audio && (
                <AudioStage
                  title={p.audio.title || p.title}
                  subtitle={p.audio.subtitle}
                  duration={p.audio.duration}
                  src={p.audio.src}
                  cover={audioCover(p.audio.cover) || product.image}
                  resumeKey={`${product.slug}/${lesson.id}#${i}`}
                />
              )}
              {p.reading && (
                <div className="pg-prose ln-part-prose">
                  {p.reading.map((t) => <p key={t}>{t}</p>)}
                  {p.list && <ul>{p.list.map((t) => <li key={t}>{t}</li>)}</ul>}
                </div>
              )}
              {p.files && <FileList files={p.files} title="Download" />}
              {p.reflection && <Reflection prompt={p.reflection} />}
            </section>
          </li>
        )
      })}
    </ol>
  )
}

function PartVideo({ title, duration, source, resumeKey }) {
  return (
    <div className="ln-part-video">
      <VideoPlayer source={source} title={title} resumeKey={resumeKey} />
      <p className="t-body-sm t-muted">Video · {duration}</p>
    </div>
  )
}

function Reflection({ prompt }) {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  return (
    <form
      className="pg-stack-sm"
      onSubmit={(e) => { e.preventDefault(); if (text.trim()) { setSaved(true); track('reflection_save', { length: text.trim().length }) } }}
    >
      <TextField label={prompt} hint="Only you can see this." multiline rows={3} value={text} onChange={(e) => { setText(e.target.value); setSaved(false) }} />
      <div className="pg-row">
        <Button type="submit" variant="secondary" size="sm" disabled={!text.trim()}>Save reflection</Button>
        {saved && <span className="ln-saved" role="status"><Icon name="check" size={16} />Saved to your notes</span>}
      </div>
    </form>
  )
}

/* ---------- AI practice coach ---------- */

function CoachLesson({ content, canOpen }) {
  // The coach can be the lesson's whole content, or nested under `coach` (multi-part lessons).
  const coach = content.coach || (content.intro && content.suggestions ? content : null)
  if (!coach) return null
  return <Coach coach={coach} canChat={canOpen} />
}

export function Coach({ coach, canChat }) {
  const [messages, setMessages] = useState([{ from: 'coach', text: coach.intro }])
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [used, setUsed] = useState([])
  const timer = useRef(null)
  const listRef = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typing])

  const replyFor = (text) => {
    const exact = coach.suggestions.find((s) => s.prompt === text)
    if (exact) return exact.reply
    const lower = text.toLowerCase()
    return coach.replies.find((r) => r.keywords.some((k) => lower.includes(k)))?.reply || coach.fallback
  }

  const send = (raw) => {
    const text = raw.trim()
    if (!text || typing || !canChat) return
    setMessages((m) => [...m, { from: 'you', text }])
    setDraft('')
    setTyping(true)
    // Role and length only: the conversation itself is never part of analytics.
    track('ai_message', { role: 'user', length: text.length, suggested: coach.suggestions.some((s) => s.prompt === text) || undefined })
    timer.current = setTimeout(() => {
      const reply = replyFor(text)
      setMessages((m) => [...m, { from: 'coach', text: reply }])
      setTyping(false)
      track('ai_message', { role: 'assistant', length: reply.length })
    }, 700)
  }

  const chips = coach.suggestions.filter((s) => !used.includes(s.prompt))

  return (
    <Card padding="sm" className="ln-chat">
      <div className="ln-chat-head">
        <span className="ln-chat-mark" aria-hidden="true"><Icon name="sparkle" size={20} /></span>
        <span className="ln-chat-name">
          <span className="t-strong">{coach.name}</span>
          <span className="t-body-sm t-muted">Answers come from this programme’s lessons</span>
        </span>
      </div>

      <div className="ln-chat-log" ref={listRef} role="log" aria-live="polite" aria-label="Conversation with the AI coach" tabIndex={0}>
        {messages.map((m, i) => (
          <div key={i} className={cx('ln-msg', m.from === 'you' ? 'is-you' : 'is-coach')}>
            <span className="ln-msg-who">{m.from === 'you' ? 'You' : 'AI coach'}</span>
            <p className="ln-msg-text">{m.text}</p>
          </div>
        ))}
        {typing && (
          <div className="ln-msg is-coach is-typing">
            <span className="ln-msg-who">AI coach</span>
            <p className="ln-msg-text">Writing a reply…</p>
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <div className="ln-chat-suggest">
          <p className="t-body-sm t-muted" id="ln-chat-try">Try asking</p>
          <ul className="ln-chips" aria-labelledby="ln-chat-try">
            {chips.map((s) => (
              <li key={s.prompt}>
                <button
                  type="button"
                  className="ln-chip"
                  disabled={typing || !canChat}
                  onClick={() => { setUsed((u) => [...u, s.prompt]); send(s.prompt) }}
                >
                  {s.prompt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="ln-chat-form" onSubmit={(e) => { e.preventDefault(); send(draft) }}>
        <TextField
          label="Message the coach"
          className="ln-chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about pace, timing, fibre, stress or sleep"
          disabled={!canChat}
          autoComplete="off"
        />
        <Button type="submit" variant="secondary" iconEnd="arrow-right" disabled={!draft.trim() || typing || !canChat}>Send</Button>
      </form>

      <p className="ln-chat-note"><Icon name="info" size={16} /><span>{coach.disclaimer}</span></p>
    </Card>
  )
}

/* ---------- Ebook ---------- */

// The book's cover in the lesson; "Open book" opens the flipbook full screen (src/components/ebook/BookReader.jsx).
function EbookLesson({ content }) {
  if (!content.ebook) return null
  return <BookReader book={content.ebook} />
}

/* ---------- Course end ---------- */

export function CompletedNotice({ product }) {
  const cert = certificates.find((c) => c.course === product.title)
  return (
    <Notice
      tone="success"
      title="You’ve completed this course"
      action={cert && <Button size="sm" variant="secondary" iconStart="download" href="/files/sample-certificate.pdf" download>Download certificate</Button>}
    >
      {cert ? (
        <>
          Certificate ID <span className="sg-code">{cert.id}</span>, issued {cert.issued}. Anyone can check it on our{' '}
          <a href={`/verify?id=${cert.id}`}>verification page</a>.
        </>
      ) : product.certificate
        ? 'Your certificate of completion is on its way. It will appear in Achievements within a few minutes.'
        : 'Every lesson stays open, so you can come back whenever you need a refresher.'}
    </Notice>
  )
}

export function ReviewForm({ product }) {
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  if (sent) {
    return (
      <Notice tone="success" title="Thank you for your review">
        It will appear on the {product.title} page once we’ve had a quick look.
      </Notice>
    )
  }

  return (
    <Card padding="lg" className="ln-review">
      <form
        className="pg-stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (!rating) { setError('Choose a rating from 1 to 5 stars.'); return }
          setError(null)
          setSent(true)
        }}
      >
        <div className="pg-stack-sm">
          <h2 className="t-heading-3">Leave a review</h2>
          <p className="t-body-sm t-muted">How did {product.title} go for you? A few honest words help others decide if it’s right for them.</p>
        </div>
        <div className="pg-stack-sm">
          <span id="ln-rating" className="sg-label">Your rating</span>
          <div role="radiogroup" aria-labelledby="ln-rating" className="ln-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                className={cx('ln-star', n <= rating && 'is-on')}
                onClick={() => setRating(n)}
              >
                <Icon name="star" size={28} />
              </button>
            ))}
          </div>
          {error && <p className="ln-error" role="alert"><Icon name="alert" size={16} />{error}</p>}
        </div>
        <TextField label="Your review" optional multiline rows={4} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="pg-row">
          <Button type="submit" variant="secondary">Post review</Button>
        </div>
      </form>
    </Card>
  )
}
