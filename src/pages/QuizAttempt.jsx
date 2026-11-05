import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  cx, Badge, Button, Card, Checkbox, Icon, Modal, Notice, ProgressBar, RadioCard, Select, TextField, LogoMark,
} from '@/design-system'
import { getProduct } from '@/lib/products.js'
import { usePlayer } from '@/components/player/usePlayer.jsx'
import ThemeToggle from '@/components/ThemeToggle.jsx'
import RichTextEditor from '@/components/editor/RichTextEditor.jsx'
import RichTextView from '@/components/editor/RichTextView.jsx'
import NotFound from '@/pages/NotFound.jsx'
import { track, setLessonContext } from '@/lib/analytics/index.js'
import {
  QUESTION_TYPES, HAND_MARKED, NOT_SCORED, RESULT_LABEL, getQuiz, loadHistory, addToHistory, loadCurrent,
  saveCurrent, clearCurrent, newAttempt, scoreAttempt, isAnswered, fillParse, formatWhen, pointsOf,
  layoutOf, quizSections, passageOf,
} from '@/data/quizzes.js'
import { PassagePane, SplitDivider } from '@/pages/quiz/QuizPassage.jsx'
import { useWide, readSplit, saveSplit, nowMs } from '@/pages/quiz/quiz-layout.js'
import './quiz-attempt.css'

// The quiz attempt: full screen and distraction-free. Top bar (title, timer, progress, Exit quiz), then
// one of three layouts (quiz.settings.layout, the admin's Layout setting):
//   one       One question at a time: the question with a numbered navigator, Skip and Flag, a review
//             page before Submit quiz.
//   sections  Section by section: one page per section break with all its questions, Back and Next
//             between pages, then the review page (when the quiz has one) before Submit quiz.
//   all       All on one page: a sticky progress and timer bar, a question index, Submit at the bottom.
// A sticky passage (rich text or a figure) sits beside its questions: in one question at a time its own
// scrolling column with a resizable divider on wide screens, on page layouts it sticks beside the
// questions after it; narrow screens get a "Show passage" toggle. Audio and image items sit in the page.
// Questions without a passage (an essay, a speaking answer) take the full width
// (src/pages/quiz/QuizPassage.jsx). Then the results with the answer review. Definitions, scoring and
// the attempt store: src/data/quizzes.js. Answers are saved to localStorage on every change, so a
// refresh or leaving the page loses nothing.

// The question types whose options can be labelled A, B, C ("Label options A, B, C").
const CHOICE_TYPES = ['single', 'yesno', 'poll']
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const clock = (secs) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
const duration = (secs) => {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m ? `${m} min${s ? ` ${s} s` : ''}` : `${s} s`
}
const formatDay = (iso) => {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}
const pointsLabel = (q) => {
  if (NOT_SCORED.includes(q.type)) return 'Not scored'
  return plural(pointsOf(q), 'point')
}

// Line glyphs the design-system set doesn't have, drawn on the same 24px grid and 1.75 stroke.
const GLYPHS = {
  flag: ['M5 21V4', 'M5 4h12l-2.5 4.5L17 13H5'],
  'chevron-up': ['m18 15-6-6-6 6'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm17 8-5-5-5 5', 'M12 3v12'],
  mic: ['M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z', 'M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v3'],
  stop: ['M7 7h10v10H7Z'],
  pen: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
  eraser: ['m7 21-4.3-4.3a1 1 0 0 1 0-1.4l10-10a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L13 19', 'M22 21H7', 'm5 11 9 9'],
  move: ['M12 3v18', 'm8 7 4-4 4 4', 'm8 17 4 4 4-4'],
  skip: ['m5 4 10 8-10 8Z', 'M19 5v14'],
}

function Glyph({ name, size = 18, className }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={cx('sg-icon', className)} aria-hidden="true">
      {GLYPHS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  )
}

// Move focus to a screen's heading when the screen changes (not on first load).
function useFocusOnChange(ref, key) {
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    ref.current?.focus({ preventScroll: true })
  }, [ref, key])
}

export default function QuizAttempt() {
  const { slug, lessonId } = useParams()
  const product = getProduct(slug)
  if (!product || !['course', 'cohort'].includes(product.type) || !product.curriculum?.length) return <NotFound />
  return <QuizPage key={`${slug}/${lessonId}`} product={product} lessonId={lessonId} />
}

function QuizPage({ product, lessonId }) {
  const p = usePlayer(product, lessonId)
  const quiz = getQuiz(product.slug, lessonId)

  useEffect(() => {
    setLessonContext({ courseSlug: product.slug, lessonId, lessonType: 'quiz' })
  }, [product.slug, lessonId])

  if (!p || p.lesson.type !== 'quiz' || !quiz) return <NotFound />
  const lessonUrl = p.hrefFor(lessonId)

  // Not enrolled, or the lesson is locked: the same gate the player shows.
  if (p.gated || p.lock) {
    return (
      <div className="qa-app">
        <TopBar title={quiz.title} course={product.title} exitHref={lessonUrl} />
        <div className="qa-main"><div className="qa-stage">{p.body}</div></div>
      </div>
    )
  }

  return (
    <QuizRunner
      product={product}
      lesson={p.lesson}
      quiz={quiz}
      canSave={p.canOpen}
      lessonUrl={lessonUrl}
      next={p.next ? { title: p.next.title, href: p.hrefFor(p.next.id) } : null}
    />
  )
}

/* ---------- Top bar ---------- */

function TopBar({ title, course, exitHref, onExit, timer, progress }) {
  return (
    <header className="qa-top">
      <div className="qa-brand">
        <LogoMark size={24} />
        <span className="qa-heading">
          <span className="qa-heading-title">{title}</span>
          <span className="qa-heading-course">{course}</span>
        </span>
      </div>
      <div className="qa-top-end">
        {timer}
        {progress}
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          iconStart="logout"
          className="qa-exit"
          aria-label="Exit quiz"
          {...(onExit ? { onClick: onExit } : { href: exitHref })}
        >
          <span className="qa-exit-text">Exit quiz</span>
        </Button>
      </div>
    </header>
  )
}

// role="timer" isn't announced on every tick; the page's polite live region says the time at
// set points instead (see the clock effect in QuizRunner).
function Timer({ ms, scope }) {
  const secs = Math.ceil(ms / 1000)
  const low = ms <= 60000
  const mins = Math.ceil(secs / 60)
  const where = scope ? ` in ${scope}` : ''
  return (
    <div className={cx('qa-timer', low && 'is-low', scope && 'has-scope')} role="timer" aria-label={low ? `Less than a minute left${where}` : `About ${plural(mins, 'minute')} left${where}`}>
      <Icon name={low ? 'alert' : 'clock'} size={18} />
      {scope && <span className="qa-timer-scope" aria-hidden="true">{scope}</span>}
      <span className="qa-timer-value" dir="ltr" aria-hidden="true">{clock(secs)}</span>
      <span className="qa-timer-word" aria-hidden="true">left</span>
    </div>
  )
}

/* ---------- The attempt ---------- */

const snapAll = (a) => Object.fromEntries((a?.order || []).map((id) => [id, JSON.stringify(a.answers[id] ?? null)]))

function QuizRunner({ product, lesson, quiz, canSave, lessonUrl, next }) {
  const slug = product.slug
  const lid = lesson.id
  const s = quiz.settings
  const layout = layoutOf(quiz)
  const allowed = s.attempts || Infinity
  // "Label options A, B, C" is one setting for the whole quiz.
  const byId = useMemo(() => Object.fromEntries(quiz.questions.map((q) => [q.id, quiz.settings.optLetters && CHOICE_TYPES.includes(q.type) ? { ...q, letters: true } : q])), [quiz])
  const sections = useMemo(() => quizSections(quiz), [quiz])
  const wide = useWide()
  const [params, setParams] = useSearchParams()

  // First screen: ?review=last (or an attempt number) shows that attempt's results; otherwise resume
  // the attempt in progress, or start a new one while attempts are left.
  const [boot] = useState(() => {
    const hist = canSave ? loadHistory(slug, lid) : []
    const saved = canSave ? loadCurrent(slug, lid) : null
    const resume = saved && Array.isArray(saved.order) && saved.order.every((id) => byId[id]) ? saved : null
    const review = params.get('review')
    if (review && hist.length) {
      const a = review === 'last' ? hist[hist.length - 1] : hist.find((x) => String(x.n) === review)
      if (a) return { hist, attempt: null, viewing: a.id, resume }
    }
    if (resume) return { hist, attempt: resume, viewing: null, resume: null }
    const passedOnce = hist.some((h) => scoreAttempt(quiz, h.answers).passed)
    if (hist.length < allowed && (s.retake !== 'fail' || !passedOnce)) {
      const a = newAttempt(quiz, hist.length + 1)
      if (canSave) saveCurrent(slug, lid, a)
      return { hist, attempt: a, viewing: null, resume: null }
    }
    return { hist, attempt: null, viewing: hist[hist.length - 1]?.id || null, resume: null }
  })

  const [history, setHistory] = useState(boot.hist)
  const [attempt, setAttempt] = useState(boot.attempt)
  const [viewing, setViewing] = useState(boot.viewing)
  const [resume, setResume] = useState(boot.resume)
  const [now, setNow] = useState(() => Date.now())
  const [live, setLive] = useState('')
  const [exitOpen, setExitOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [split, setSplit] = useState(readSplit)
  const [jump, setJump] = useState(null)

  const mainRef = useRef(null)
  const headingRef = useRef(null)
  const splitRef = useRef(null)
  const started = useRef(new Set())
  const sectionStarted = useRef(new Set())
  const snapshot = (a, i) => {
    const id = a?.order?.[i]
    return id ? { id, value: JSON.stringify(a.answers[id] ?? null) } : { id: null, value: 'null' }
  }
  // The answer as it was when the question opened, so quiz_answer only fires when it changed.
  const entry = useRef(snapshot(boot.attempt, boot.attempt?.index ?? 0))
  // The same for page layouts (sections, all on one page): every answer as last reported.
  const pageSnap = useRef(snapAll(boot.attempt))
  const submitting = useRef(false)
  const lastRemaining = useRef(null)

  const order = attempt?.order || []
  const index = attempt?.index ?? 0
  const defaultScreen = layout === 'sections' ? 'section' : layout === 'all' ? 'page' : 'question'
  const screen = attempt ? attempt.screen || defaultScreen : 'results'
  const numberOf = Object.fromEntries(order.map((id, i) => [id, i + 1]))
  const skipped = attempt?.skipped || []
  const secIndex = layout === 'sections' ? Math.min(attempt?.section ?? 0, sections.length - 1) : 0
  const sec = layout === 'sections' && attempt ? sections[secIndex] : null
  const secIds = sec ? order.filter((id) => sec.ids.includes(id)) : []
  const q = attempt && layout === 'one' && screen === 'question' ? byId[order[index]] : null
  const remaining = attempt?.deadline ? Math.max(0, attempt.deadline - now) : null
  const done = (id) => !!attempt && isAnswered(byId[id], attempt.answers[id])
  const answeredCount = attempt ? order.filter(done).length : 0
  // One question at a time: the question's passage, in its own column. Page layouts place passages in the page.
  const passage = layout === 'one' ? passageOf(quiz, q) : null

  // Save the attempt in progress on every change.
  useEffect(() => {
    if (attempt && canSave) saveCurrent(slug, lid, attempt)
  }, [attempt, canSave, slug, lid])

  // quiz_start once per attempt (a resumed attempt says so).
  useEffect(() => {
    if (!attempt || started.current.has(attempt.id)) return
    started.current.add(attempt.id)
    track('quiz_start', {
      attempt: attempt.n, questions: attempt.order.length, timeLimit: s.timeLimit || null, layout,
      resumed: Object.keys(attempt.answers).length > 0,
    })
  }, [attempt, s.timeLimit, layout])

  // quiz_section_start once per section per attempt.
  const attemptId = attempt?.id
  const attemptN = attempt?.n
  useEffect(() => {
    if (!attemptId || !sec) return
    const key = `${attemptId}:${sec.id}`
    if (sectionStarted.current.has(key)) return
    sectionStarted.current.add(key)
    track('quiz_section_start', { attempt: attemptN, sectionId: sec.id, section: secIndex + 1, questions: sec.ids.length })
  }, [attemptId, attemptN, sec, secIndex])

  // The clock ticks once a second while a timed attempt is open. It announces the time politely at
  // 10, 5 and 1 minute left (never every second). When the time runs out the quiz submits itself,
  // also on return if it ran out while the student was away.
  const submitRef = useRef(null)
  useEffect(() => {
    const deadline = attempt?.deadline
    if (!deadline) return
    lastRemaining.current = Math.max(0, deadline - Date.now())
    const t = setInterval(() => {
      const at = Date.now()
      setNow(at)
      const left = Math.max(0, deadline - at)
      const prev = lastRemaining.current
      lastRemaining.current = left
      if (left === 0) { submitRef.current?.(true); return }
      const crossed = [10, 5, 1].find((m) => prev > m * 60000 && left <= m * 60000)
      if (crossed) setLive(crossed === 1 ? 'One minute left. The quiz submits itself when time runs out.' : `${crossed} minutes left.`)
    }, 1000)
    return () => clearInterval(t)
  }, [attempt?.deadline])

  useFocusOnChange(headingRef, `${screen}:${index}:${secIndex}:${viewing}`)

  // Jump to a question on a page layout once it's on screen: scroll it into view and focus it.
  useEffect(() => {
    if (!jump) return
    const el = document.getElementById(`qa-q-${jump.id}`)
    if (!el) return
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' })
    el.focus({ preventScroll: true })
  }, [jump])

  useEffect(() => {
    const t = setTimeout(() => saveSplit(split), 300)
    return () => clearTimeout(t)
  }, [split])

  const reportLeave = () => {
    const e = entry.current
    if (!attempt || !e.id || screen !== 'question') return
    const v = attempt.answers[e.id]
    const value = JSON.stringify(v ?? null)
    if (value === e.value) return
    entry.current = { ...e, value }
    const qq = byId[e.id]
    track('quiz_answer', { questionId: e.id, type: qq.type, answered: isAnswered(qq, v) })
  }
  const reportPage = (ids) => {
    if (!attempt) return
    ids.forEach((id) => {
      const v = attempt.answers[id]
      const value = JSON.stringify(v ?? null)
      if (pageSnap.current[id] === value) return
      pageSnap.current[id] = value
      track('quiz_answer', { questionId: id, type: byId[id].type, answered: isAnswered(byId[id], v) })
    })
  }

  const scrollTop = () => mainRef.current?.scrollTo?.(0, 0)
  const goTo = (i) => {
    reportLeave()
    setSubmitError(null)
    setNavOpen(false)
    entry.current = snapshot(attempt, i)
    setAttempt((a) => ({ ...a, index: i, screen: 'question' }))
    scrollTop()
  }
  const toReview = () => {
    reportLeave()
    setNavOpen(false)
    setAttempt((a) => ({ ...a, screen: 'review' }))
    scrollTop()
  }
  const setAnswer = (id, v) => setAttempt((a) => ({ ...a, answers: { ...a.answers, [id]: v } }))
  const toggleFlag = (id) => setAttempt((a) => ({
    ...a, flagged: a.flagged.includes(id) ? a.flagged.filter((x) => x !== id) : [...a.flagged, id],
  }))

  // Skip: move on and mark the question Skipped (until it's answered). Required questions can be
  // skipped too; they still need an answer before the quiz can be submitted.
  const skip = () => {
    if (!q) return
    track('quiz_skip', { questionId: q.id, type: q.type, required: !!q.required, position: index + 1 })
    setAttempt((a) => ({ ...a, skipped: (a.skipped || []).includes(q.id) ? a.skipped : [...(a.skipped || []), q.id] }))
    setLive(`Question ${index + 1} skipped.`)
    if (index === order.length - 1) toReview()
    else goTo(index + 1)
  }

  // Page layouts: show a question (opening its section's page first when it's on another one).
  const jumpTo = (id) => {
    setNavOpen(false)
    if (layout === 'sections') {
      const k = sections.findIndex((x) => x.ids.includes(id))
      if (k < 0) return
      if (k !== secIndex || screen !== 'section') {
        reportPage(secIds)
        setSubmitError(null)
        setAttempt((a) => ({ ...a, section: k, screen: 'section' }))
      }
    }
    setJump({ id, at: nowMs() })
  }

  // Section by section: Back and Next move between section pages. Next on the last page opens the
  // review page (Before the final submit → Show a review page), or submits.
  const openSection = (k) => {
    if (!attempt || !sections[k]) return
    reportPage(secIds)
    setNavOpen(false)
    setSubmitError(null)
    setAttempt((a) => ({ ...a, section: k, screen: 'section' }))
    setLive(`Section ${k + 1} of ${sections.length}: ${sections[k].title}.`)
    scrollTop()
  }
  const finishSections = () => {
    reportPage(secIds)
    if (s.beforeSubmit === 'review') {
      setSubmitError(null)
      setAttempt((a) => ({ ...a, screen: 'review' }))
      scrollTop()
      return
    }
    submitPage()
  }

  const requiredMissing = order.filter((id) => byId[id].required && !done(id))

  const submit = (auto = false) => {
    if (!attempt || submitting.current) return
    if (!auto && requiredMissing.length) {
      setSubmitError(`Question ${requiredMissing.map((id) => numberOf[id]).join(', ')} needs an answer before you submit.`)
      return
    }
    submitting.current = true
    reportLeave()
    if (layout !== 'one') reportPage(order)
    const end = Math.min(nowMs(), attempt.deadline || Infinity)
    const seconds = Math.max(1, Math.round((end - Date.parse(attempt.startedAt)) / 1000))
    const record = {
      id: attempt.id, n: attempt.n, startedAt: attempt.startedAt, submittedAt: new Date(end).toISOString(), seconds,
      answers: attempt.answers, flagged: attempt.flagged, skipped: attempt.skipped || [], order: attempt.order, options: attempt.options, auto,
    }
    if (canSave) {
      addToHistory(slug, lid, record)
      clearCurrent(slug, lid)
    }
    const r = scoreAttempt(quiz, record.answers)
    const answered = quiz.questions.filter((qq) => isAnswered(qq, record.answers[qq.id])).length
    track('quiz_submit', { attempt: record.n, seconds, answered, flagged: record.flagged.length, skipped: record.skipped.filter((id) => !isAnswered(byId[id], record.answers[id])).length, layout, auto })
    track('quiz_result', { attempt: record.n, score: r.score, passed: r.passed, needsReview: r.needsReview })
    setHistory((h) => [...h, record])
    setAttempt(null)
    setViewing(record.id)
    setExitOpen(false)
    setConfirmOpen(false)
    setSubmitError(null)
    if (params.get('review')) setParams({}, { replace: true })
    setLive(auto
      ? `Time is up, so your answers were submitted. ${RESULT_LABEL[r.result]}, ${r.score}%.`
      : `Quiz submitted. ${RESULT_LABEL[r.result]}, ${r.score}%.`)
    scrollTop()
  }

  useEffect(() => {
    submitRef.current = submit
  })

  // All on one page: Submit at the bottom. Required questions first, then a check when some are blank.
  const submitPage = () => {
    if (requiredMissing.length) {
      setSubmitError('required')
      setJump({ id: requiredMissing[0], at: Date.now() })
      return
    }
    if (order.some((id) => !done(id)) && !confirmOpen) { setConfirmOpen(true); return }
    submit(false)
  }

  const tryAgain = () => {
    const a = resume || newAttempt(quiz, history.length + 1)
    if (canSave) saveCurrent(slug, lid, a)
    submitting.current = false
    entry.current = snapshot(a, a.index || 0)
    pageSnap.current = snapAll(a)
    setResume(null)
    setNow(nowMs())
    setAttempt(a)
    setViewing(null)
    setLive('')
    if (params.get('review')) setParams({}, { replace: true })
    scrollTop()
  }

  const viewed = viewing ? history.find((h) => h.id === viewing) : null
  const ctx = attempt ? { byId, numberOf, attempt, order, setAnswer, toggleFlag, marker: quiz.marker, exam: layout === 'sections', media: quiz.media || {} } : null

  const renderPassage = (mode) => passage && (
    <PassagePane
      key={`${passage.id}:${mode}`}
      passage={passage}
      mode={mode}
    />
  )

  const timer = attempt && layout !== 'all' && remaining != null ? <Timer ms={remaining} /> : null

  let progress = null
  if (attempt && layout === 'one') {
    progress = (
      <div className="qa-progress">
        <span className="qa-progress-text">
          {screen === 'review' ? 'Review' : <>Question <strong>{index + 1}</strong> of {order.length}</>}
        </span>
        <div className="qa-progress-bar">
          <ProgressBar value={answeredCount} max={order.length} label={`${answeredCount} of ${order.length} questions answered`} showValue={false} />
        </div>
      </div>
    )
  } else if (attempt && layout === 'sections') {
    progress = (
      <div className="qa-progress">
        <span className="qa-progress-text">{screen === 'review' ? 'Review' : <>Section <strong>{secIndex + 1}</strong> of {sections.length}</>}</span>
        <div className="qa-progress-bar">
          <ProgressBar value={answeredCount} max={order.length} label={`${answeredCount} of ${order.length} questions answered`} showValue={false} />
        </div>
      </div>
    )
  }

  const splitStyle = passage && wide ? { '--qa-split': `${split}%` } : undefined
  const skippedOpen = skipped.filter((id) => !done(id))

  return (
    <div className={cx('qa-app', attempt && layout !== 'all' && 'has-actions')}>
      <TopBar
        title={quiz.title}
        course={product.title}
        exitHref={lessonUrl}
        onExit={attempt ? () => setExitOpen(true) : undefined}
        timer={timer}
        progress={progress}
      />
      <p className="qa-vh" role="status" aria-live="polite">{live}</p>

      {/* ---------- One question at a time ---------- */}
      {attempt && layout === 'one' && screen === 'question' && q && (
        <>
          <div ref={splitRef} className={cx('qa-body', passage && wide && 'has-passage')} style={splitStyle}>
            {passage && wide && <>{renderPassage('split')}<SplitDivider containerRef={splitRef} value={split} onChange={setSplit} /></>}
            <div className="qa-main" ref={mainRef}>
              <div className="qa-stage">
                {passage && !wide && renderPassage('inline')}
                <div className="qa-mobile-nav">
                  <button type="button" className="qa-disclosure" aria-expanded={navOpen} aria-controls="qa-nav-mobile" onClick={() => setNavOpen((o) => !o)}>
                    <span className="qa-disclosure-text">
                      <span className="qa-disclosure-title">All questions</span>
                      <span className="qa-disclosure-meta">
                        {answeredCount} of {order.length} answered{skippedOpen.length ? ` · ${skippedOpen.length} skipped` : ''}{attempt.flagged.length ? ` · ${attempt.flagged.length} flagged` : ''}
                      </span>
                    </span>
                    <Icon name="chevron-down" size={20} className="qa-chevron" />
                  </button>
                  {navOpen && (
                    <div id="qa-nav-mobile" className="qa-mobile-panel">
                      <Navigator order={order} byId={byId} attempt={attempt} current={index} canBack={s.back} canSkip={s.skip} onPick={goTo} onReview={toReview} />
                    </div>
                  )}
                </div>

                <form className="qa-card" noValidate onSubmit={(e) => { e.preventDefault(); if (index === order.length - 1) toReview(); else goTo(index + 1) }}>
                  <div className="qa-q-top">
                    <h1 ref={headingRef} tabIndex={-1} className="qa-q-count">Question {index + 1} of {order.length}</h1>
                    <div className="qa-q-tags">
                      <Badge>{QUESTION_TYPES[q.type]}</Badge>
                      <span className="t-body-sm t-muted">
                        {pointsLabel(q)}{HAND_MARKED.includes(q.type) ? ` · Marked by ${quiz.marker}` : ''}
                      </span>
                      {skippedOpen.includes(q.id) && <Badge tone="neutral"><Glyph name="skip" size={14} className="qa-flip" />Skipped</Badge>}
                      {attempt.flagged.includes(q.id) && <Badge tone="warning"><Glyph name="flag" size={14} />Flagged</Badge>}
                    </div>
                  </div>
                  <QuestionField
                    key={q.id}
                    q={q}
                    value={attempt.answers[q.id]}
                    options={attempt.options?.[q.id]}
                    onChange={(v) => setAnswer(q.id, v)}
                  />
                  {s.skip && q.required && !done(q.id) && (
                    <p className="t-body-sm t-muted">You can skip this for now. It needs an answer before you submit.</p>
                  )}
                </form>
              </div>
            </div>
            <aside className="qa-side" aria-label="Question navigator">
              <Navigator order={order} byId={byId} attempt={attempt} current={index} canBack={s.back} canSkip={s.skip} onPick={goTo} onReview={toReview} />
            </aside>
          </div>

          <div className="qa-actions">
            <div className="qa-actions-side">
              {index > 0 && s.back && (
                <Button variant="ghost" iconStart="arrow-left" onClick={() => goTo(index - 1)}>Previous</Button>
              )}
            </div>
            <div className="qa-actions-centre">
              <FlagButton on={attempt.flagged.includes(q.id)} onToggle={() => toggleFlag(q.id)} />
              {s.skip && !done(q.id) && (
                <button type="button" className="sg-btn sg-btn-ghost sg-btn-md qa-skip" onClick={skip}>
                  <span>Skip</span>
                  <Glyph name="skip" className="qa-flip" />
                </button>
              )}
            </div>
            <div className="qa-actions-side is-end">
              {index === order.length - 1
                ? <Button iconEnd="arrow-right" onClick={toReview}>Review answers</Button>
                : <Button iconEnd="arrow-right" onClick={() => goTo(index + 1)}>Next</Button>}
            </div>
          </div>
        </>
      )}

      {attempt && layout === 'one' && screen === 'review' && (
        <ReviewScreen
          order={order}
          byId={byId}
          attempt={attempt}
          headingRef={headingRef}
          mainRef={mainRef}
          error={submitError}
          canSkip={s.skip}
          onPick={goTo}
          onSubmit={() => submit(false)}
        />
      )}

      {/* ---------- Section by section ---------- */}
      {attempt && layout === 'sections' && sec && screen === 'section' && (
        <>
          <div className="qa-body is-sections">
            <div className="qa-main" ref={mainRef}>
              <div className="qa-stage is-page">
                <header className="qa-sec-head">
                  <p className="sg-eyebrow">Section {secIndex + 1} of {sections.length}</p>
                  <h1 ref={headingRef} tabIndex={-1} className="qa-sec-title">{sec.title}</h1>
                  {sec.intro && <p className="t-muted">{sec.intro}</p>}
                  <p className="t-body-sm t-muted">{rangeLabel(numberOf[secIds[0]], numberOf[secIds[secIds.length - 1]])}</p>
                </header>
                <SectionBlocks quiz={quiz} sec={sec} ids={secIds} ctx={ctx} wide={wide} />
              </div>
            </div>
          </div>

          <div className="qa-actions">
            <div className="qa-actions-side">
              {secIndex > 0 && s.back && <Button variant="ghost" iconStart="arrow-left" onClick={() => openSection(secIndex - 1)}>Back</Button>}
            </div>
            <div className="qa-actions-centre">
              <span className="t-body-sm t-muted qa-actions-note">{answeredCount} of {order.length} answered</span>
            </div>
            <div className="qa-actions-side is-end">
              {secIndex < sections.length - 1
                ? <Button iconEnd="arrow-right" onClick={() => openSection(secIndex + 1)}>Next</Button>
                : s.beforeSubmit === 'review'
                  ? <Button iconEnd="arrow-right" onClick={finishSections}>Review answers</Button>
                  : <Button iconStart="check" onClick={finishSections}>Submit quiz</Button>}
            </div>
          </div>
        </>
      )}

      {attempt && layout === 'sections' && screen === 'review' && (
        <ReviewScreen
          order={order}
          byId={byId}
          attempt={attempt}
          headingRef={headingRef}
          mainRef={mainRef}
          error={submitError}
          canSkip={false}
          onPick={(i) => jumpTo(order[i])}
          onSubmit={() => submit(false)}
        />
      )}

      {/* ---------- All on one page ---------- */}
      {attempt && layout === 'all' && (
        <div className="qa-body is-all">
          <div className="qa-main" ref={mainRef}>
            <div className="qa-bar">
              <div className="qa-bar-inner">
                <span className="qa-progress-text"><strong>{answeredCount}</strong> of {order.length} answered{attempt.flagged.length ? ` · ${attempt.flagged.length} flagged` : ''}</span>
                <div className="qa-bar-progress">
                  <ProgressBar value={answeredCount} max={order.length} label={`${answeredCount} of ${order.length} questions answered`} showValue={false} />
                </div>
                {remaining != null && <Timer ms={remaining} />}
                <Button variant="ghost" size="sm" className="qa-bar-jump" onClick={() => setJump({ id: 'submit', at: Date.now() })}>Go to submit</Button>
              </div>
            </div>
            <div className="qa-stage is-page">
              <header className="pg-stack-sm">
                <h1 ref={headingRef} tabIndex={-1} className="t-heading-2">{quiz.title}</h1>
                <p className="t-muted">{plural(order.length, 'question')} on one page. Answer in any order, then submit at the bottom.</p>
              </header>
              <div className="qa-mobile-nav">
                <button type="button" className="qa-disclosure" aria-expanded={navOpen} aria-controls="qa-index-mobile" onClick={() => setNavOpen((o) => !o)}>
                  <span className="qa-disclosure-text">
                    <span className="qa-disclosure-title">Question index</span>
                    <span className="qa-disclosure-meta">{answeredCount} of {order.length} answered</span>
                  </span>
                  <Icon name="chevron-down" size={20} className="qa-chevron" />
                </button>
                {navOpen && (
                  <div id="qa-index-mobile" className="qa-mobile-panel">
                    <QuestionIndex ids={order} ctx={ctx} onJump={jumpTo} label="Question index" />
                  </div>
                )}
              </div>

              {sections.map((x) => {
                const ids = order.filter((id) => x.ids.includes(id))
                return (
                  <section key={x.id} className="qa-page-sec" aria-labelledby={x.title ? `qa-sec-${x.id}` : undefined}>
                    {x.title && (
                      <div className="qa-page-sec-head">
                        <h2 id={`qa-sec-${x.id}`} className="t-heading-3">{x.title}</h2>
                        <p className="t-body-sm t-muted">{rangeLabel(numberOf[ids[0]], numberOf[ids[ids.length - 1]])}</p>
                      </div>
                    )}
                    <SectionBlocks quiz={quiz} sec={x} ids={ids} ctx={ctx} wide={wide} />
                  </section>
                )
              })}

              <footer id="qa-q-submit" tabIndex={-1} className="qa-submit">
                <h2 className="t-heading-3">Ready to submit?</h2>
                {submitError === 'required' && requiredMissing.length > 0 && (
                  <Notice tone="danger" title={`${plural(requiredMissing.length, 'required question')} still ${requiredMissing.length === 1 ? 'needs' : 'need'} an answer`}>
                    <Jumps ids={requiredMissing} numberOf={numberOf} onJump={jumpTo} />
                  </Notice>
                )}
                {order.some((id) => !done(id)) ? (
                  <p className="t-muted">
                    {plural(order.filter((id) => !done(id)).length, 'question')} not answered yet. Questions you leave blank score 0.{' '}
                    <Jumps ids={order.filter((id) => !done(id))} numberOf={numberOf} onJump={jumpTo} />
                  </p>
                ) : (
                  <p className="t-muted">Every question is answered. You can still change any answer before you submit.</p>
                )}
                {attempt.flagged.length > 0 && (
                  <p className="t-muted">You flagged {plural(attempt.flagged.length, 'question')}. <Jumps ids={order.filter((id) => attempt.flagged.includes(id))} numberOf={numberOf} onJump={jumpTo} /></p>
                )}
                <div><Button iconStart="check" onClick={submitPage}>Submit quiz</Button></div>
              </footer>
            </div>
          </div>
          <aside className="qa-side" aria-label="Question index">
            <div className="qa-nav">
              <div className="qa-nav-head">
                <p className="sg-eyebrow">Questions</p>
                <p className="t-body-sm t-muted">{answeredCount} of {order.length} answered</p>
              </div>
              <QuestionIndex ids={order} ctx={ctx} onJump={jumpTo} label="Question index" />
              <IndexKey />
              <Button variant="secondary" size="sm" block onClick={() => setJump({ id: 'submit', at: Date.now() })}>Go to submit</Button>
            </div>
          </aside>
        </div>
      )}

      {!attempt && viewed && (
        <ResultsScreen
          quiz={quiz}
          attempt={viewed}
          history={history}
          allowed={allowed}
          canSave={canSave}
          resume={resume}
          lessonUrl={lessonUrl}
          next={next}
          headingRef={headingRef}
          mainRef={mainRef}
          onRetry={tryAgain}
        />
      )}

      {!attempt && !viewed && (
        <div className="qa-main" ref={mainRef}>
          <div className="qa-stage">
            <Notice tone="info" title="There’s no attempt to show" action={<Button size="sm" variant="secondary" href={lessonUrl}>Back to the lesson</Button>}>
              Start the quiz from its lesson.
            </Notice>
          </div>
        </div>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit with questions not answered?"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Keep answering</Button>
            <Button onClick={() => submit(false)}>Submit quiz</Button>
          </>
        )}
      >
        <p>
          {attempt ? `${plural(order.filter((id) => !done(id)).length, 'question')} ${order.filter((id) => !done(id)).length === 1 ? 'isn’t' : 'aren’t'} answered. Questions you leave blank score 0.` : ''}
        </p>
      </Modal>

      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Leave the quiz?"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setExitOpen(false)}>Stay in the quiz</Button>
            <Button href={lessonUrl}>Leave the quiz</Button>
          </>
        )}
      >
        <p>
          {canSave ? 'Your answers so far are saved. Come back to the lesson to carry on.' : 'This is a preview, so your answers aren’t saved.'}
          {s.timeLimit && canSave ? ' The timer keeps running while you’re away, and the quiz submits itself when time runs out.' : ''}
        </p>
      </Modal>
    </div>
  )
}

const rangeLabel = (from, to) => (from === to ? `Question ${from}` : `Questions ${from}–${to}`)

function Jumps({ ids, numberOf, onJump }) {
  return (
    <span className="qa-jumps">
      {ids.map((id) => <Button key={id} variant="link" size="sm" onClick={() => onJump(id)}>Question {numberOf[id]}</Button>)}
    </span>
  )
}

function FlagButton({ on, onToggle }) {
  return (
    <button type="button" className={cx('sg-btn sg-btn-ghost sg-btn-md qa-flag', on && 'is-on')} aria-pressed={on} onClick={onToggle}>
      <Glyph name="flag" />
      <span>Flag for review</span>
    </button>
  )
}

// A small flag toggle beside a question on a page layout.
function FlagMini({ n, on, onToggle }) {
  const label = `Flag question ${n} for review`
  return (
    <button type="button" className={cx('qa-flag-mini', on && 'is-on')} aria-pressed={on} aria-label={label} title={label} onClick={onToggle}>
      <Glyph name="flag" size={16} />
    </button>
  )
}

/* ---------- Page layouts: question index, sections, groups ---------- */

function QuestionIndex({ ids, ctx, onJump, label, current }) {
  const { byId, numberOf, attempt } = ctx
  return (
    <nav className="qa-index" aria-label={label}>
      <ol className="qa-grid">
        {ids.map((id) => {
          const a = isAnswered(byId[id], attempt.answers[id])
          const f = attempt.flagged.includes(id)
          const n = numberOf[id]
          const cur = id === current
          const text = `Question ${n}, ${a ? 'answered' : 'not answered'}${f ? ', flagged' : ''}`
          return (
            <li key={id}>
              <button type="button" className={cx('qa-cell', a && 'is-answered', f && 'is-flagged', cur && 'is-current')} aria-label={text} aria-current={cur ? 'step' : undefined} title={text} onClick={() => onJump(id)}>
                <span aria-hidden="true">{n}</span>
                {f && <Glyph name="flag" size={12} className="qa-cell-flag" />}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function IndexKey() {
  return (
    <ul className="qa-key" aria-hidden="true">
      <li><span className="qa-swatch is-answered" />Answered</li>
      <li><span className="qa-swatch" />Not answered</li>
      <li><Glyph name="flag" size={14} className="qa-key-flag" />Flagged</li>
    </ul>
  )
}

// A section's content laid out as the builder places it on a page. What the questions refer to sits
// on the left and sticks while they scroll on the right: a sticky passage (until the next passage),
// or a group's audio and image items. Groups with neither take the full width.
const mediaIds = (g) => (Array.isArray(g.media) ? g.media : g.media ? [g.media] : [])

function SectionBlocks({ quiz, sec, ids, ctx, wide }) {
  const chunks = []
  sec.groups.forEach((g) => {
    const media = mediaIds(g).filter((m) => quiz.media?.[m])
    const pid = g.passage || sec.passage || null
    const key = media.length ? `media:${g.id}` : pid && quiz.passages?.[pid] ? `passage:${pid}` : null
    const last = chunks[chunks.length - 1]
    if (last && key && last.key === key) last.groups.push(g)
    else if (last && !key && !last.key) last.groups.push(g)
    else chunks.push({ key, pid, media, groups: [g] })
  })
  const groups = (list) => list.map((g) => <GroupBlock key={g.id} group={g} ids={ids.filter((id) => g.questions.includes(id))} ctx={ctx} />)
  return chunks.map((c) => {
    if (!c.key) return <div key={c.groups[0].id} className="qa-flow">{groups(c.groups)}</div>
    const p = c.media.length
      ? { id: c.key, media: c.media.map((m) => ({ id: m, ...quiz.media[m] })) }
      : { id: c.pid, ...quiz.passages[c.pid] }
    return (
      <div key={c.groups[0].id} className={cx('qa-block', wide && 'has-passage')}>
        <PassagePane passage={p} mode={wide ? 'sticky' : 'inline'} />
        <div className="qa-block-qs">{groups(c.groups)}</div>
      </div>
    )
  })
}

// A group as the builder places it: an optional note (the instructions), then its questions. Its audio
// and image items are on the left (SectionBlocks).
function GroupBlock({ group, ids, ctx }) {
  if (!ids.length) return null
  const list = <ol className="qa-qlist">{ids.map((id) => <PageQuestion key={id} q={ctx.byId[id]} ctx={ctx} />)}</ol>
  if (!group.note) return list
  return (
    <div className="qa-group">
      <p className="qa-group-instr">{group.note}</p>
      {list}
    </div>
  )
}

function PageQuestion({ q, ctx }) {
  const { numberOf, attempt, setAnswer, toggleFlag, marker, exam } = ctx
  const n = numberOf[q.id]
  const flagged = attempt.flagged.includes(q.id)
  const onChange = (v) => setAnswer(q.id, v)
  if (exam && q.type === 'fill' && !q.prompt) {
    return (
      <li id={`qa-q-${q.id}`} tabIndex={-1} className="qa-pq is-row">
        <span className="qa-num" aria-hidden="true">{n}</span>
        <QuestionField q={q} number={n} value={attempt.answers[q.id]} onChange={onChange} compact />
        <FlagMini n={n} on={flagged} onToggle={() => toggleFlag(q.id)} />
      </li>
    )
  }
  return (
    <li id={`qa-q-${q.id}`} tabIndex={-1} className={cx('qa-pq', !exam && 'is-card')}>
      <div className="qa-pq-head">
        <span className="qa-num" aria-hidden="true">{n}</span>
        {!exam && (
          <span className="t-body-sm t-muted qa-pq-meta">
            {QUESTION_TYPES[q.type]} · {pointsLabel(q)}{HAND_MARKED.includes(q.type) ? ` · Marked by ${marker}` : ''}{q.required ? ' · Required' : ''}
          </span>
        )}
        <FlagMini n={n} on={flagged} onToggle={() => toggleFlag(q.id)} />
      </div>
      <QuestionField q={q} number={n} value={attempt.answers[q.id]} options={attempt.options?.[q.id]} onChange={onChange} compact />
    </li>
  )
}

// A question's prompt as plain text, for lists (sentence completion has the sentence instead).
const promptText = (q) => q.prompt || (q.type === 'fill' ? fillParse(q.passage).map((x) => (x.blank === undefined ? x.text : '______')).join('') : '')

/* ---------- Navigator ---------- */

function Navigator({ order, byId, attempt, current, canBack, canSkip, onPick, onReview }) {
  const answered = order.filter((id) => isAnswered(byId[id], attempt.answers[id])).length
  const flagged = attempt.flagged.length
  const skippedOpen = (attempt.skipped || []).filter((id) => byId[id] && !isAnswered(byId[id], attempt.answers[id])).length
  return (
    <nav className="qa-nav" aria-label="Questions">
      <div className="qa-nav-head">
        <p className="sg-eyebrow">Questions</p>
        <p className="t-body-sm t-muted">{answered} of {order.length} answered{skippedOpen ? ` · ${skippedOpen} skipped` : ''}{flagged ? ` · ${flagged} flagged` : ''}</p>
      </div>
      <ol className="qa-grid">
        {order.map((id, i) => {
          const a = isAnswered(byId[id], attempt.answers[id])
          const sk = !a && (attempt.skipped || []).includes(id)
          const f = attempt.flagged.includes(id)
          const cur = i === current && (attempt.screen || 'question') === 'question'
          const label = `Question ${i + 1}, ${a ? 'answered' : sk ? 'skipped' : 'not answered'}${f ? ', flagged' : ''}`
          return (
            <li key={id}>
              <button
                type="button"
                className={cx('qa-cell', a && 'is-answered', sk && 'is-skipped', f && 'is-flagged', cur && 'is-current')}
                aria-current={cur ? 'step' : undefined}
                aria-label={label}
                title={label}
                disabled={!canBack && i < current}
                onClick={() => onPick(i)}
              >
                <span aria-hidden="true">{i + 1}</span>
                {f && <Glyph name="flag" size={12} className="qa-cell-flag" />}
              </button>
            </li>
          )
        })}
      </ol>
      <ul className="qa-key" aria-hidden="true">
        <li><span className="qa-swatch is-answered" />Answered</li>
        <li><span className="qa-swatch" />Not answered</li>
        {canSkip && <li><span className="qa-swatch is-skipped" />Skipped</li>}
        <li><span className="qa-swatch is-current" />Current</li>
        <li><Glyph name="flag" size={14} className="qa-key-flag" />Flagged</li>
      </ul>
      <Button variant="secondary" size="sm" block onClick={onReview}>Review and submit</Button>
    </nav>
  )
}

/* ---------- One question ---------- */

// number: the question's number on a page layout (said to screen readers; the badge beside it is
// visual). compact: a smaller legend for questions listed on a page.
function QuestionField({ q, value, options, onChange, number, compact }) {
  const legendId = useId()
  const hintId = useId()
  const Input = INPUTS[q.type]
  return (
    <fieldset className={cx('qa-fieldset', compact && 'is-compact')} aria-describedby={q.hint ? hintId : undefined}>
      <legend id={legendId} className={cx('qa-legend', !q.prompt && 'qa-vh')}>
        {number != null && <span className="qa-vh">Question {number}{q.prompt ? ': ' : ''}</span>}
        {q.prompt}{q.required && <span className="qa-required"> (required)</span>}
      </legend>
      {q.hint && <p id={hintId} className="qa-hint">{q.hint}</p>}
      {Input && <Input q={q} value={value} options={options} onChange={onChange} labelledBy={legendId} describedBy={q.hint ? hintId : undefined} number={number} />}
    </fieldset>
  )
}

function ChoiceInput({ q, value, options, onChange }) {
  const name = useId()
  const ids = options || q.options.map((o) => o.id)
  return (
    <div className={cx('qa-choices', q.type === 'yesno' && 'is-pair')}>
      {ids.map((id) => {
        const o = q.options.find((x) => x.id === id)
        if (!o) return null
        const letter = q.letters ? String.fromCharCode(65 + q.options.indexOf(o)) : null
        const title = letter ? <><span className="qa-letter" aria-hidden="true">{letter}</span><span className="qa-vh">{letter}. </span>{o.label}</> : o.label
        return <RadioCard key={id} name={name} value={id} title={title} checked={value === id} onChange={() => onChange(id)} />
      })}
    </div>
  )
}

function MultiInput({ q, value, options, onChange }) {
  const ids = options || q.options.map((o) => o.id)
  const picked = Array.isArray(value) ? value : []
  const toggle = (id) => onChange(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id])
  return (
    <div className="qa-choices">
      {ids.map((id) => {
        const o = q.options.find((x) => x.id === id)
        if (!o) return null
        return <Checkbox key={id} className="qa-check" label={o.label} checked={picked.includes(id)} onChange={() => toggle(id)} />
      })}
    </div>
  )
}

// Short answer and maths. A character limit (q.maxLen, the builder's "Character limit") stops typing
// past it and shows a counter under the field.
function TextInput({ q, value, onChange, labelledBy, describedBy }) {
  const countId = useId()
  const math = q.type === 'math'
  const limit = Number(q.maxLen) > 0 ? Number(q.maxLen) : null
  return (
    <div className="sg-field">
      <input
        type="text"
        className={cx('sg-input', math && 'qa-math')}
        aria-labelledby={labelledBy}
        aria-describedby={[describedBy, limit && countId].filter(Boolean).join(' ') || undefined}
        placeholder={q.placeholder || (math ? 'Like 2 + 3w' : 'Type your answer')}
        value={value || ''}
        maxLength={limit || undefined}
        onChange={(e) => onChange(e.target.value)}
        dir={math ? 'ltr' : undefined}
        spellCheck={math ? false : undefined}
        autoComplete="off"
      />
      {limit && <p id={countId} className="qa-count t-caption t-muted">{(value || '').length} / {limit}</p>}
    </div>
  )
}

function NumberInput({ q, value, onChange, labelledBy, describedBy }) {
  const errId = useId()
  const v = value || ''
  const bad = v.trim() !== '' && Number.isNaN(Number(v.replace(/,/g, '')))
  return (
    <div className={cx('sg-field', bad && 'has-error')}>
      <div className="qa-number">
        <input
          type="text"
          inputMode="decimal"
          className="sg-input"
          dir="ltr"
          aria-labelledby={labelledBy}
          aria-describedby={[describedBy, bad && errId].filter(Boolean).join(' ') || undefined}
          aria-invalid={bad || undefined}
          placeholder="0"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
        />
        {q.unit && <span className="qa-unit" aria-hidden="true">{q.unit}</span>}
      </div>
      {bad && <p id={errId} className="sg-field-msg sg-field-error"><Icon name="alert" size={16} />Enter a number, like 3 or 2.5</p>}
    </div>
  )
}

function DateInput({ value, onChange, labelledBy, describedBy }) {
  return (
    <div className="sg-field qa-date">
      <input type="date" className="sg-input" dir="ltr" aria-labelledby={labelledBy} aria-describedby={describedBy} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

// The editor mounts one tick after the question does: mounted together with the page on first load
// (a resumed attempt, or all on one page), the editor's toolbar state read an editor that wasn't ready.
function LongInput({ q, value, onChange }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 0)
    return () => clearTimeout(t)
  }, [])
  if (!ready) return <div className="qa-long-wait" aria-hidden="true" />
  return (
    <RichTextEditor
      label="Your answer"
      value={value || ''}
      placeholder="Write your answer"
      minHeight={180}
      onChange={(html, _json, meta) => onChange(meta?.text?.trim() ? html : '')}
      id={`qa-long-${q.id}`}
    />
  )
}

function GrammarInput({ q, value, onChange }) {
  const text = value ?? q.passage
  return (
    <div className="pg-stack-sm">
      <blockquote className="qa-passage">{q.passage}</blockquote>
      <TextField
        label="Your corrected version"
        multiline
        rows={4}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        hint="It starts with the text above. Change what needs changing."
      />
      {value != null && value !== q.passage && (
        <div><Button variant="link" size="sm" onClick={() => onChange(undefined)}>Start again from the original text</Button></div>
      )}
    </div>
  )
}

function FillInput({ q, value, onChange, number }) {
  const segs = fillParse(q.passage)
  const count = segs.filter((x) => x.blank !== undefined).length
  const v = value || {}
  const sentence = segs.map((x) => (x.blank === undefined ? x.text : '…')).join('')
  return (
    <div className="pg-stack-sm">
      <p className="qa-fill">
        {segs.map((seg, k) => (seg.blank === undefined ? (
          <span key={k}>{seg.text}</span>
        ) : (
          <input
            key={k}
            type="text"
            className="sg-input qa-blank"
            aria-label={count === 1 && number != null ? `Question ${number}: ${sentence}` : `Blank ${seg.blank + 1} of ${count}`}
            value={v[seg.blank] || ''}
            onChange={(e) => onChange({ ...v, [seg.blank]: e.target.value })}
            autoComplete="off"
          />
        )))}
      </p>
    </div>
  )
}

function MatchInput({ q, value, options, onChange }) {
  const v = value || {}
  const choices = options || [...q.pairs.map((p) => p.match), ...(q.extra || [])]
  return (
    <div className="qa-match">
      {(q.extra || []).length > 0 && <p className="t-body-sm t-muted">{plural(q.extra.length, 'option')} won’t be used.</p>}
      {q.pairs.map((p) => (
        <Select
          key={p.id}
          className="qa-match-row"
          label={p.label}
          placeholder="Choose a match"
          options={choices}
          value={v[p.id] || ''}
          onChange={(e) => onChange({ ...v, [p.id]: e.target.value })}
        />
      ))}
    </div>
  )
}

function OrderInput({ q, value, options, onChange }) {
  const uid = useId()
  const touched = Array.isArray(value) && value.length > 0
  const list = touched ? value : options || q.items.map((it) => it.id)
  const [msg, setMsg] = useState('')
  const [dragging, setDragging] = useState(null)
  const labelOf = (id) => q.items.find((it) => it.id === id)?.label || ''

  const place = (from, to) => {
    if (to < 0 || to >= list.length || from === to) return
    const next = list.slice()
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
    setMsg(`${labelOf(item)}, moved to position ${to + 1} of ${list.length}.`)
    return item
  }
  const move = (i, dir) => {
    const item = place(i, i + dir)
    if (!item) return
    // Keep focus on the moved item's control; at the ends, the other arrow.
    const to = i + dir
    const which = (dir < 0 && to === 0) ? 'down' : (dir > 0 && to === list.length - 1) ? 'up' : dir < 0 ? 'up' : 'down'
    requestAnimationFrame(() => document.getElementById(`${uid}-${item}-${which}`)?.focus())
  }

  return (
    <div className="pg-stack-sm">
      <p className="t-body-sm t-muted">
        {q.type === 'ranking' ? 'Put the one that matters most at the top.' : 'Put the first step at the top.'} Drag an item, or use its move buttons.
      </p>
      <ol className="qa-order">
        {list.map((id, i) => (
          <li
            key={id}
            className={cx('qa-order-item', dragging === id && 'is-dragging')}
            draggable
            onDragStart={(e) => { setDragging(id); e.dataTransfer.effectAllowed = 'move' }}
            onDragEnd={() => setDragging(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (dragging) place(list.indexOf(dragging), i); setDragging(null) }}
          >
            <span className="qa-order-pos" aria-hidden="true">{i + 1}</span>
            <Glyph name="move" size={16} className="qa-order-grip" />
            <span className="qa-order-label">{labelOf(id)}</span>
            <span className="qa-order-moves">
              <button type="button" id={`${uid}-${id}-up`} className="sg-iconbtn sg-iconbtn-outline sg-iconbtn-sm" aria-label={`Move ${labelOf(id)} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <Glyph name="chevron-up" />
              </button>
              <button type="button" id={`${uid}-${id}-down`} className="sg-iconbtn sg-iconbtn-outline sg-iconbtn-sm" aria-label={`Move ${labelOf(id)} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)}>
                <Icon name="chevron-down" size={18} />
              </button>
            </span>
          </li>
        ))}
      </ol>
      {!touched && (
        <p className="qa-order-keep">
          <span className="t-body-sm t-muted">Not answered yet.</span>
          <Button variant="link" size="sm" onClick={() => onChange(list.slice())}>Keep this order</Button>
        </p>
      )}
      <p className="qa-vh" aria-live="polite">{msg}</p>
    </div>
  )
}

const fileSize = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

function FilePicker({ id, accept, onPick, title, meta, describedBy }) {
  const [over, setOver] = useState(false)
  return (
    <>
      <input type="file" id={id} className="qa-vh" accept={accept} aria-describedby={describedBy} onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = '' }} />
      <label
        htmlFor={id}
        className={cx('qa-drop', over && 'is-over')}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onPick(e.dataTransfer.files?.[0]) }}
      >
        <span className="qa-drop-icon"><Glyph name="upload" size={20} /></span>
        <span className="t-strong">{title}</span>
        <span className="t-body-sm t-muted">{meta}</span>
      </label>
    </>
  )
}

function FileRow({ name, meta, onRemove, icon = 'file' }) {
  return (
    <div className="qa-file">
      <span className="qa-file-icon"><Icon name={icon} size={20} /></span>
      <span className="qa-file-text">
        <span className="t-strong">{name}</span>
        {meta && <span className="t-body-sm t-muted">{meta}</span>}
      </span>
      <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove ${name}`}>Remove</Button>
    </div>
  )
}

function FileInput({ q, value, onChange, describedBy }) {
  const id = useId()
  const errId = useId()
  const [error, setError] = useState(null)
  const pick = (file) => {
    if (!file) return
    if (q.maxMb && file.size > q.maxMb * 1024 * 1024) { setError(`That file is over ${q.maxMb} MB. Try a smaller photo, or a PDF.`); return }
    setError(null)
    onChange({ name: file.name, size: fileSize(file.size), type: file.type })
  }
  if (value) return <FileRow name={value.name} meta={`${value.size} · Attached to this attempt`} onRemove={() => onChange(null)} />
  return (
    <div className={cx('sg-field', error && 'has-error')}>
      <FilePicker id={id} accept={q.accept} onPick={pick} title="Choose a file or drop it here" meta={`${q.acceptLabel}, up to ${q.maxMb} MB`} describedBy={[describedBy, error && errId].filter(Boolean).join(' ') || undefined} />
      {error && <p id={errId} className="sg-field-msg sg-field-error"><Icon name="alert" size={16} />{error}</p>}
    </div>
  )
}

function RecordInput({ q, value, onChange }) {
  const fileId = useId()
  const [state, setState] = useState('idle') // idle | recording | blocked
  const [secs, setSecs] = useState(0)
  const [url, setUrl] = useState(null)
  const [msg, setMsg] = useState('')
  const rec = useRef(null)
  const chunks = useRef([])
  const tick = useRef(null)
  const stream = useRef(null)
  const startedAt = useRef(0)
  const max = q.maxSeconds || 60
  const supported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== 'undefined'

  useEffect(() => () => {
    clearInterval(tick.current)
    if (rec.current?.state === 'recording') rec.current.stop()
    stream.current?.getTracks().forEach((t) => t.stop())
  }, [])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])

  const stop = () => {
    clearInterval(tick.current)
    if (rec.current?.state === 'recording') rec.current.stop()
  }
  const start = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = media
      const r = new window.MediaRecorder(media)
      rec.current = r
      chunks.current = []
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data) }
      r.onstop = () => {
        const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' })
        setUrl(URL.createObjectURL(blob))
        const seconds = Math.min(max, Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)))
        onChange({ kind: 'recording', name: 'Voice recording', seconds })
        media.getTracks().forEach((t) => t.stop())
        setState('idle')
        setMsg(`Recording saved, ${clock(seconds)} long.`)
      }
      startedAt.current = Date.now()
      r.start()
      setSecs(0)
      setState('recording')
      setMsg('Recording.')
      tick.current = setInterval(() => {
        const e = Math.floor((Date.now() - startedAt.current) / 1000)
        setSecs(e)
        if (e >= max) stop()
      }, 250)
    } catch {
      setState('blocked')
    }
  }
  const pickFile = (file) => {
    if (!file) return
    onChange({ kind: 'file', name: file.name, size: fileSize(file.size) })
    setMsg(`${file.name} attached.`)
  }

  return (
    <div className="pg-stack-sm">
      {state === 'recording' ? (
        <div className="qa-rec is-live">
          <span className="qa-rec-dot" aria-hidden="true" />
          <span className="qa-rec-text"><span className="t-strong">Recording</span><span className="t-body-sm t-muted" dir="ltr">{clock(secs)} / {clock(max)}</span></span>
          <button type="button" className="sg-btn sg-btn-secondary sg-btn-sm" onClick={stop}><Glyph name="stop" /><span>Stop</span></button>
        </div>
      ) : value ? (
        <div className="pg-stack-sm">
          <FileRow
            icon="headphones"
            name={value.kind === 'file' ? value.name : 'Voice recording'}
            meta={value.kind === 'file' ? `${value.size} · Attached to this attempt` : `${clock(value.seconds)} · Saved to this attempt`}
            onRemove={() => { onChange(null); setUrl(null) }}
          />
          {url && value.kind === 'recording' && <audio className="qa-audio" controls src={url}>Your browser can’t play this recording.</audio>}
          {supported && <div><button type="button" className="sg-btn sg-btn-ghost sg-btn-sm" onClick={start}><Glyph name="mic" /><span>Record again</span></button></div>}
        </div>
      ) : (
        <div className="qa-rec">
          {supported && state !== 'blocked' ? (
            <button type="button" className="sg-btn sg-btn-secondary sg-btn-md" onClick={start}><Glyph name="mic" /><span>Start recording</span></button>
          ) : (
            <Notice tone="warning" title="We can’t use your microphone">
              Check your browser’s microphone permission, or upload an audio file instead.
            </Notice>
          )}
          <span className="t-body-sm t-muted">Up to {clock(max)}. You can listen back before you move on.</span>
        </div>
      )}
      {state !== 'recording' && !value && (
        <FilePicker id={fileId} accept="audio/*,video/*" onPick={pickFile} title="Or upload an audio file" meta="MP3, M4A, WAV or a short video" />
      )}
      <p className="qa-vh" aria-live="polite">{msg}</p>
    </div>
  )
}

function DrawInput({ value, onChange }) {
  const canvas = useRef(null)
  const drawing = useRef(false)
  const last = useRef(null)
  const latest = useRef(value)
  const [tool, setTool] = useState('pen')
  useEffect(() => { latest.current = value })

  const colours = () => {
    const cs = getComputedStyle(canvas.current)
    return { ink: cs.color, paper: cs.backgroundColor }
  }
  const paint = () => {
    const c = canvas.current
    const ctx = c.getContext('2d')
    ctx.fillStyle = colours().paper
    ctx.fillRect(0, 0, c.width, c.height)
  }

  useEffect(() => {
    paint()
    const saved = latest.current?.image
    if (saved) {
      const img = new Image()
      img.onload = () => canvas.current?.getContext('2d').drawImage(img, 0, 0, canvas.current.width, canvas.current.height)
      img.src = saved
    }
  }, [])

  const point = (e) => {
    const r = canvas.current.getBoundingClientRect()
    return { x: ((e.clientX - r.left) * canvas.current.width) / r.width, y: ((e.clientY - r.top) * canvas.current.height) / r.height }
  }
  const down = (e) => {
    drawing.current = true
    last.current = point(e)
    canvas.current.setPointerCapture?.(e.pointerId)
    move(e)
  }
  const move = (e) => {
    if (!drawing.current) return
    const ctx = canvas.current.getContext('2d')
    const p = point(e)
    const { ink, paper } = colours()
    ctx.strokeStyle = tool === 'pen' ? ink : paper
    ctx.lineWidth = tool === 'pen' ? 4 : 24
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x + 0.01, p.y + 0.01)
    ctx.stroke()
    last.current = p
  }
  const up = () => {
    if (!drawing.current) return
    drawing.current = false
    onChange({ ...(latest.current || {}), image: canvas.current.toDataURL('image/png') })
  }
  const clear = () => {
    paint()
    const text = latest.current?.text
    onChange(text ? { text } : null)
  }

  return (
    <div className="pg-stack-sm">
      <div className="qa-draw-tools" role="group" aria-label="Drawing tools">
        <button type="button" className={cx('sg-btn sg-btn-sm', tool === 'pen' ? 'sg-btn-secondary' : 'sg-btn-ghost')} aria-pressed={tool === 'pen'} onClick={() => setTool('pen')}><Glyph name="pen" /><span>Pen</span></button>
        <button type="button" className={cx('sg-btn sg-btn-sm', tool === 'eraser' ? 'sg-btn-secondary' : 'sg-btn-ghost')} aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')}><Glyph name="eraser" /><span>Eraser</span></button>
        <Button variant="ghost" size="sm" iconStart="x" onClick={clear}>Clear</Button>
      </div>
      <canvas
        ref={canvas}
        width={800}
        height={500}
        className="qa-canvas"
        aria-label="Drawing area. You can describe your drawing in words below instead."
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
      />
      <TextField
        label="Or describe it in words"
        optional
        multiline
        rows={3}
        value={value?.text || ''}
        onChange={(e) => {
          const next = { ...(value || {}), text: e.target.value }
          onChange(next.image || next.text.trim() ? next : null)
        }}
      />
    </div>
  )
}

function ConsentInput({ q, value, onChange }) {
  return <Checkbox label={q.label} checked={!!value} onChange={(e) => onChange(e.target.checked)} />
}

function RatingInput({ q, value, onChange }) {
  const name = useId()
  const count = q.count || 5
  return (
    <div className="pg-stack-sm">
      <div className="qa-stars">
        {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
          <label key={n} className={cx('qa-star', value >= n && 'is-on')}>
            <input type="radio" className="qa-vh" name={name} value={n} checked={value === n} onChange={() => onChange(n)} />
            <Icon name="star" size={30} />
            <span className="qa-vh">{plural(n, 'star')}</span>
          </label>
        ))}
      </div>
      <p className="t-body-sm t-muted" aria-hidden="true">{value ? `${value} of ${count}` : 'Choose a rating'}</p>
    </div>
  )
}

function ScaleInput({ q, value, onChange }) {
  const name = useId()
  const endsId = useId()
  const steps = Array.from({ length: q.max - q.min + 1 }, (_, i) => q.min + i)
  return (
    <div>
      <div className="qa-scale" style={{ '--qa-steps': steps.length }}>
        {steps.map((v) => (
          <label key={v} className="qa-scale-opt">
            <input type="radio" className="qa-vh" name={name} value={v} checked={value === v} onChange={() => onChange(v)} aria-describedby={endsId} />
            <span>{v}</span>
          </label>
        ))}
      </div>
      <p id={endsId} className="qa-scale-ends"><span>{q.min} · {q.low}</span><span>{q.max} · {q.high}</span></p>
    </div>
  )
}

const INPUTS = {
  single: ChoiceInput, yesno: ChoiceInput, poll: ChoiceInput, multi: MultiInput,
  short: TextInput, math: TextInput, number: NumberInput, date: DateInput,
  long: LongInput, grammar: GrammarInput, fill: FillInput, match: MatchInput,
  order: OrderInput, ranking: OrderInput, file: FileInput, record: RecordInput, draw: DrawInput,
  consent: ConsentInput, rating: RatingInput, scale: ScaleInput,
}

/* ---------- Review before submit ---------- */

function ReviewScreen({ order, byId, attempt, headingRef, mainRef, error, canSkip, onPick, onSubmit }) {
  const rows = order.map((id, i) => {
    const answered = isAnswered(byId[id], attempt.answers[id])
    return { q: byId[id], i, answered, skipped: !answered && (attempt.skipped || []).includes(id), flagged: attempt.flagged.includes(id) }
  })
  const unanswered = rows.filter((r) => !r.answered)
  const skippedRows = rows.filter((r) => r.skipped)
  const blank = rows.filter((r) => !r.answered && !r.skipped)
  const required = rows.filter((r) => r.q.required && !r.answered)
  const flagged = rows.filter((r) => r.flagged)
  const jump = (list) => (
    <span className="qa-jumps">
      {list.map((r) => <Button key={r.q.id} variant="link" size="sm" onClick={() => onPick(r.i)}>Question {r.i + 1}</Button>)}
    </span>
  )
  return (
    <>
      <div className="qa-main" ref={mainRef}>
        <div className="qa-stage">
          <header className="pg-stack-sm">
            <h1 ref={headingRef} tabIndex={-1} className="t-heading-2">Review your answers</h1>
            <p className="t-muted">
              You’ve answered {rows.length - unanswered.length} of {rows.length} questions. You can still change any answer before you submit.
            </p>
          </header>

          {required.length > 0 && (
            <Notice tone="danger" title={`${plural(required.length, 'required question')} still ${required.length === 1 ? 'needs' : 'need'} an answer`}>
              {canSkip ? 'You can skip a required question while you work through the quiz, but it needs an answer before you submit. ' : 'Answer it before you submit. '}
              {jump(required)}
            </Notice>
          )}
          {skippedRows.length > 0 && (
            <Notice tone="neutral" title={`${plural(skippedRows.length, 'question')} skipped`}>
              You skipped these to come back to later. Skipped questions you leave blank score 0. {jump(skippedRows)}
            </Notice>
          )}
          {blank.length > 0 && (
            <Notice tone="warning" title={`${plural(blank.length, 'question')} not answered`}>
              Questions you leave blank score 0. {jump(blank)}
            </Notice>
          )}
          {flagged.length > 0 && (
            <Notice tone="info" title={`${flagged.length} flagged for review`}>
              Have another look before you submit. {jump(flagged)}
            </Notice>
          )}
          {!unanswered.length && !flagged.length && (
            <Notice tone="success" title="Every question is answered">When you’re ready, submit the quiz to see your result.</Notice>
          )}
          {error && <Notice tone="danger">{error}</Notice>}

          <ol className="qa-review-list">
            {rows.map((r) => (
              <li key={r.q.id} className="qa-review-row">
                <span className="qa-review-n" aria-hidden="true">{r.i + 1}</span>
                <span className="qa-review-text">
                  <span className="qa-review-prompt"><span className="qa-vh">Question {r.i + 1}: </span>{r.q.prompt}</span>
                  <span className="qa-review-meta">
                    <span className="t-body-sm t-muted">{QUESTION_TYPES[r.q.type]}</span>
                    {r.answered ? <Badge tone="success" icon="check">Answered</Badge>
                      : r.skipped ? <Badge tone="neutral"><Glyph name="skip" size={14} className="qa-flip" />Skipped</Badge>
                      : <Badge tone="warning" icon="alert">Not answered</Badge>}
                    {r.q.required && !r.answered && <Badge tone="danger">Required</Badge>}
                    {r.flagged && <Badge tone="info"><Glyph name="flag" size={14} />Flagged</Badge>}
                  </span>
                </span>
                <Button variant="link" size="sm" onClick={() => onPick(r.i)} aria-label={`${r.answered ? 'Change' : 'Answer'} question ${r.i + 1}`}>
                  {r.answered ? 'Change' : 'Answer'}
                </Button>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="qa-actions">
        <div className="qa-actions-side">
          <Button variant="ghost" iconStart="arrow-left" onClick={() => onPick(order.length - 1)}>Back to questions</Button>
        </div>
        <div className="qa-actions-centre" />
        <div className="qa-actions-side is-end">
          <Button iconStart="check" onClick={onSubmit}>Submit quiz</Button>
        </div>
      </div>
    </>
  )
}

/* ---------- Results ---------- */

const VERDICT = {
  correct: { tone: 'success', icon: 'check-circle', label: 'Correct' },
  partial: { tone: 'warning', icon: 'minus', label: 'Partly correct' },
  incorrect: { tone: 'danger', icon: 'x-circle', label: 'Not quite' },
  skipped: { tone: 'neutral', icon: 'minus', label: 'Not answered' },
  manual: { tone: 'info', icon: 'clock', label: 'Waiting to be marked' },
  none: { tone: 'neutral', icon: 'info', label: 'Not scored' },
}
const RESULT_ICON = { passed: 'check-circle', 'needs-review': 'clock', 'not-yet': 'alert' }

function ResultsScreen({ quiz, attempt, history, allowed, canSave, resume, lessonUrl, next, headingRef, mainRef, onRetry }) {
  const s = quiz.settings
  const r = scoreAttempt(quiz, attempt.answers)
  const scored = history.map((h) => scoreAttempt(quiz, h.answers))
  const passedEver = scored.some((x) => x.passed)
  const best = Math.max(...scored.map((x) => x.score))
  const left = allowed === Infinity ? Infinity : Math.max(0, allowed - history.length)
  const canRetry = !!resume || (left > 0 && (s.retake !== 'fail' || !passedEver))
  const reveal = s.reveal === 'always' || (s.reveal === 'after' && left === 0)
  const showFeedback = s.feedback !== 'never'
  const order = attempt.order || quiz.questions.map((q) => q.id)
  const marker = quiz.marker || 'Your practitioner'
  const answerGroups = quiz.sections?.length
    ? quizSections(quiz).map((x) => ({ id: x.id, title: x.title, ids: order.filter((id) => x.ids.includes(id)) }))
    : [{ id: 'all', title: null, ids: order }]

  let message
  if (r.result === 'passed') {
    message = `Well done. ${canSave ? 'This lesson is now marked as complete.' : ''}`
    if (r.waiting) message += ` ${marker} will still read your ${plural(r.waiting, 'answer')} marked by hand and reply in your messages.`
  } else if (r.result === 'needs-review') {
    message = `You have ${r.score}% from the questions marked so far. ${marker} marks your other ${plural(r.waiting, 'answer')} by hand, usually within two working days, and your result updates then. The pass mark is ${s.passMark}%.`
  } else {
    message = `The pass mark is ${s.passMark}%. ${quiz.retryHint || 'Have another look at this fortnight’s lessons, then try again.'}`
    if (!canRetry && canSave) message = `The pass mark is ${s.passMark}%. You’ve used every attempt. Send us a message and we’ll reset it for you.`
  }
  if (!canSave) message += ' This was a preview, so your score isn’t saved.'

  const retryLabel = resume ? 'Continue the quiz' : 'Try again'
  const passedPrimary = r.passed || !s.passingRequired
  const actions = []
  if (passedPrimary && next) actions.push(<Button key="next" href={next.href} iconEnd="arrow-right">Continue to the next lesson</Button>)
  if (!r.passed && canRetry && r.result !== 'needs-review') actions.push(<Button key="retry" iconStart="arrow-left" onClick={onRetry}>{retryLabel}</Button>)
  actions.push(<Button key="back" variant={actions.length ? 'secondary' : 'primary'} href={lessonUrl}>Back to the lesson</Button>)
  if ((r.passed || r.result === 'needs-review') && canRetry) actions.push(<Button key="retry" variant="ghost" onClick={onRetry}>{retryLabel}</Button>)
  if (!canRetry && !passedEver && canSave) actions.push(<Button key="contact" variant="ghost" href="/contact-us">Contact us</Button>)

  return (
    <div className="qa-main" ref={mainRef}>
      <div className="qa-stage qa-results">
        <section className={cx('qa-result', `is-${r.result}`)} aria-labelledby="qa-result-title">
          <p className="sg-eyebrow">
            Attempt {attempt.n}{allowed !== Infinity ? ` of ${allowed}` : ''} · {formatWhen(attempt.submittedAt)}
          </p>
          <div className="qa-result-head">
            <span className="qa-result-icon"><Icon name={RESULT_ICON[r.result]} size={28} /></span>
            <h1 id="qa-result-title" ref={headingRef} tabIndex={-1} className="t-heading-1">{RESULT_LABEL[r.result]}</h1>
          </div>

          <div className="qa-score">
            <p className="qa-score-line">
              <span className="qa-score-value">{r.score}%</span>
              <span className="t-muted">{r.waiting ? 'so far' : 'your score'}</span>
            </p>
            <div className="qa-scorebar" role="img" aria-label={`Score ${r.score}%. Pass mark ${s.passMark}%.`}>
              <span className="qa-scorebar-fill" style={{ inlineSize: `${Math.min(100, r.score)}%` }} />
              <span className="qa-scorebar-mark" style={{ insetInlineStart: `${s.passMark}%` }} />
            </div>
            <p className="t-body-sm t-muted" aria-hidden="true">The line marks the pass mark, {s.passMark}%.</p>
          </div>

          <p>{message}</p>
          {attempt.auto && <Notice tone="info">Time ran out, so your answers were submitted for you.</Notice>}

          <dl className="pg-facts qa-facts">
            <dt>Points</dt><dd>{r.earned} of {r.total}</dd>
            <dt>Correct</dt><dd>{r.counts.correct}</dd>
            {r.counts.partial > 0 && <><dt>Partly correct</dt><dd>{r.counts.partial}</dd></>}
            <dt>Not quite</dt><dd>{r.counts.incorrect}</dd>
            {r.counts.skipped > 0 && <><dt>Not answered</dt><dd>{r.counts.skipped}</dd></>}
            {r.counts.waiting > 0 && <><dt>Waiting to be marked</dt><dd>{r.counts.waiting}</dd></>}
            <dt>Not scored</dt><dd>{r.counts.unscored}</dd>
            {attempt.seconds && <><dt>Time taken</dt><dd>{duration(attempt.seconds)}</dd></>}
            {canSave && <><dt>Best score</dt><dd>{best}%</dd></>}
            <dt>Attempts left</dt><dd>{left === Infinity ? 'Unlimited' : left}</dd>
          </dl>

          <div className="pg-row">{actions}</div>
        </section>

        {(showFeedback || reveal) ? (
          <section className="pg-stack" aria-labelledby="qa-answers-title">
            <div className="pg-stack-sm">
              <h2 id="qa-answers-title" className="t-heading-2">Your answers</h2>
              {!reveal && s.reveal === 'after' && <p className="t-muted">Correct answers are shown after your last attempt.</p>}
            </div>
            {answerGroups.map((grp) => (
              <div key={grp.id} className="pg-stack-sm">
                {grp.title && <h3 className="t-heading-4">{grp.title}</h3>}
                <ol className="qa-answers">
                  {grp.ids.map((id) => {
                    const q = quiz.questions.find((x) => x.id === id)
                    if (!q) return null
                    const g = r.graded.find((x) => x.q.id === id)
                    return <AnswerCard key={id} n={order.indexOf(id) + 1} q={q} grade={g} value={attempt.answers[id]} reveal={reveal} feedback={showFeedback} flagged={attempt.flagged?.includes(id)} skipped={attempt.skipped?.includes(id)} />
                  })}
                </ol>
              </div>
            ))}
          </section>
        ) : (
          <Notice tone="neutral">This quiz doesn’t show answers after you submit.</Notice>
        )}
      </div>
    </div>
  )
}

function AnswerCard({ n, q, grade, value, reveal, feedback, flagged, skipped }) {
  const v = VERDICT[grade.verdict]
  const key = reveal && grade.verdict !== 'correct' && hasKey(q) ? <KeyText q={q} /> : null
  return (
    <li>
      <Card padding="md" className="qa-answer">
        <div className="qa-answer-head">
          <p className="t-body-sm t-muted">Question {n} · {QUESTION_TYPES[q.type]}{flagged ? ' · You flagged this' : ''}{skipped && grade.verdict === 'skipped' ? ' · You skipped this' : ''}</p>
          <Badge tone={v.tone} icon={v.icon}>{v.label}</Badge>
        </div>
        <h3 className="qa-answer-prompt">{promptText(q)}</h3>
        <dl className="qa-answer-rows">
          <dt>Your answer</dt>
          <dd><AnswerText q={q} v={value} /></dd>
          {key && <><dt>Correct answer</dt><dd>{key}</dd></>}
          {grade.max > 0 && <><dt>Points</dt><dd>{grade.verdict === 'manual' ? `Up to ${grade.max}, once marked` : `${grade.pts} of ${grade.max}`}</dd></>}
        </dl>
        {q.type === 'poll' && <PollShares q={q} value={value} />}
        {feedback && q.explain && <p className="qa-explain">{q.explain}</p>}
      </Card>
    </li>
  )
}

function PollShares({ q, value }) {
  return (
    <div className="qa-poll">
      <p className="t-body-sm t-strong">How others answered</p>
      {q.options.map((o) => (
        <ProgressBar key={o.id} value={o.share || 0} label={o.id === value ? `${o.label} (your answer)` : o.label} tone={o.id === value ? 'primary' : 'accent'} />
      ))}
    </div>
  )
}

function FillText({ q, values, showKey }) {
  return (
    <span>
      {fillParse(q.passage).map((seg, k) => (seg.blank === undefined
        ? <span key={k}>{seg.text}</span>
        : <mark key={k} className="qa-mark">{showKey ? seg.answers[0] : (values?.[seg.blank] || '____')}</mark>))}
    </span>
  )
}

function AnswerText({ q, v }) {
  if (!isAnswered(q, v)) return <span className="t-muted">Not answered</span>
  const label = (id) => (q.options || q.items || []).find((o) => o.id === id)?.label || id
  switch (q.type) {
    case 'single': case 'yesno': case 'poll': return label(v)
    case 'multi': return v.map(label).join(', ')
    case 'long': return <RichTextView value={v} className="qa-rich" />
    case 'short': case 'grammar': return <span className="qa-pre">{v}</span>
    case 'math': return <span className="qa-pre qa-math" dir="ltr">{v}</span>
    case 'number': return `${v}${q.unit ? ` ${q.unit}` : ''}`
    case 'date': return formatDay(v)
    case 'fill': return <FillText q={q} values={v} />
    case 'match': return <ul className="qa-pairs">{q.pairs.map((p) => <li key={p.id}>{p.label}: {v[p.id] || 'No match'}</li>)}</ul>
    case 'order': case 'ranking': return <ol className="qa-ol">{v.map((id) => <li key={id}>{label(id)}</li>)}</ol>
    case 'file': return `${v.name}${v.size ? ` · ${v.size}` : ''}`
    case 'record': return v.kind === 'file' ? v.name : `Voice recording · ${clock(v.seconds || 0)}`
    case 'draw': return (
      <span className="pg-stack-sm">
        {v.image && <img src={v.image} alt="Your drawing" className="qa-drawing" />}
        {v.text && <span className="qa-pre">{v.text}</span>}
      </span>
    )
    case 'consent': return 'Ticked'
    case 'rating': return `${v} of ${q.count || 5} stars`
    case 'scale': return `${v} on a scale from ${q.min} (${q.low}) to ${q.max} (${q.high})`
    default: return String(v)
  }
}

// Types with an answer key to reveal (hand-marked and unscored types have none).
const hasKey = (q) => ['single', 'yesno', 'multi', 'fill', 'match', 'order'].includes(q.type)
  || (['short', 'math', 'number', 'date'].includes(q.type) && !!q.key)

function KeyText({ q }) {
  switch (q.type) {
    case 'single': case 'yesno': return q.options.find((o) => o.correct)?.label
    case 'multi': return q.options.filter((o) => o.correct).map((o) => o.label).join(', ')
    case 'short': case 'math': case 'number': case 'date': return q.key || null
    case 'fill': return <FillText q={q} showKey />
    case 'match': return <ul className="qa-pairs">{q.pairs.map((p) => <li key={p.id}>{p.label}: {p.match}</li>)}</ul>
    case 'order': return <ol className="qa-ol">{q.items.map((it) => <li key={it.id}>{it.label}</li>)}</ol>
    default: return null
  }
}
