import { useEffect, useRef, useState } from 'react'
import { cx, Button, Icon, IconButton, LessonRow, ProgressBar, LogoMark } from '@/design-system'
import { school } from '@/data/school.js'
import { productHref } from '@/lib/products.js'
import { usePlayer } from '@/components/player/usePlayer.jsx'
import { LessonMeta, PreviewNotice, CompletedNotice, ReviewForm } from '@/components/player/parts.jsx'
import { SELF_COMPLETING, shownType } from '@/components/player/lesson-types.js'
import NotFound from '@/pages/NotFound.jsx'
import ThemeToggle from '@/components/ThemeToggle.jsx'
import LessonSearch from '@/components/player/LessonSearch.jsx'
import ProgrammeSwitcher from '@/components/player/ProgrammeSwitcher.jsx'
import { useLessonAnalytics } from '@/lib/analytics'
import CohortBanner from '@/components/course/CohortBanner.jsx'
import { previewQuery, canJoin, nextSession } from '@/components/course/cohort.js'
import { useLessonTools, useWide } from '@/components/lesson-tools/useLessonTools.jsx'
import { ToolsBar, ToolsPanel } from '@/components/lesson-tools/LessonTools.jsx'
import { readInitialTool } from '@/components/lesson-tools/layout.js'
import './player-classroom.css'

const MY_PROGRAMMES = '/student/dashboard/profile/enrollments'

// Option C · Classroom: an app-like full-screen classroom. Top bar, course content on the
// inline-start rail, the lesson in the main column and its actions in a sticky bottom bar.
export default function PlayerClassroom({ product, lessonId }) {
  // Lesson tools: a side panel on wide screens, a drawer below that. ?tool= opens one on load.
  const [initialTool] = useState(readInitialTool)
  const query = previewQuery() // keeps cohort and session preview states from lesson to lesson
  const p = usePlayer(product, lessonId, { query })
  const chapter = p?.lesson.chapter
  // Lesson analytics: visit, active time and completion (src/lib/analytics, docs/lesson-analytics.md).
  useLessonAnalytics(p?.lesson, product, {
    done: !!p && p.isDone(p.lesson.id),
    access: !p ? undefined : p.gated ? 'gated' : p.lock ? 'locked' : p.canOpen ? 'enrolled' : 'preview',
    enabled: !!p?.showHeader,
  })

  const [railOpen, setRailOpen] = useState(true) // desktop: rail shown or collapsed
  const [listOpen, setListOpen] = useState(false) // mobile: "Course content" disclosure
  const [openChapters, setOpenChapters] = useState(() => new Set(chapter ? [chapter] : []))
  const [seenLesson, setSeenLesson] = useState(lessonId)
  const mainRef = useRef(null)
  const stageRef = useRef(null)
  const wide = useWide()
  const tools = useLessonTools({
    product, lesson: p?.lesson, lessons: p?.lessons, hrefFor: p?.hrefFor, stageRef, canOpen: p?.canOpen, viewer: p?.viewer,
  })

  // On a new lesson: open its chapter and fold the mobile list away.
  if (lessonId !== seenLesson) {
    setSeenLesson(lessonId)
    setListOpen(false)
    if (chapter && !openChapters.has(chapter)) setOpenChapters(new Set(openChapters).add(chapter))
  }

  // The main column scrolls on its own on desktop, so start each lesson at its top.
  useEffect(() => { mainRef.current?.scrollTo?.(0, 0) }, [lessonId])

  if (!p) return <NotFound />
  const {
    access, canOpen, lessons, lesson, index, prev, next, isDone, rowState, markDone,
    percent, complete, body, showHeader, hrefFor, rowMeta, run, sessions, session,
  } = p

  const toggleChapter = (title) => setOpenChapters((s) => {
    const n = new Set(s)
    if (n.has(title)) n.delete(title); else n.add(title)
    return n
  })

  const exitHref = canOpen ? MY_PROGRAMMES : productHref(product)
  // A cohort's live session can be marked complete once it has happened.
  const sessionAhead = session && ['scheduled', 'soon', 'live'].includes(session.state)
  const canMark = showHeader && canOpen && !SELF_COMPLETING.includes(lesson.type) && !sessionAhead
  // While a live session is joinable, "Join live session" is the view's one primary action.
  const joinable = canJoin(nextSession(sessions))
  // The side panel needs a wide screen; below 1280px it opens as the drawer.
  const toolsMode = wide ? 'panel' : 'drawer'
  const showTools = showHeader && tools.tools.length > 0

  return (
    <div className={cx('pc-app', !railOpen && 'is-collapsed', showTools && `has-tools-${toolsMode}`)}>
      <header className="pc-top">
        <IconButton
          icon="menu"
          label={railOpen ? 'Hide course content' : 'Show course content'}
          className="pc-toggle"
          aria-expanded={railOpen}
          aria-controls="pc-rail"
          onClick={() => setRailOpen((o) => !o)}
        />
        <a href="/" className="pc-brand">
          <LogoMark size={24} />
          <span className="pc-brand-name">{school.name}</span>
        </a>
        <span className="pc-divider" aria-hidden="true" />
        <ProgrammeSwitcher product={product} className="pc-course" />

        <div className="pc-top-end">
          <LessonSearch product={product} rowState={rowState} hrefFor={hrefFor} canOpen={canOpen} collapse="lg" className="pc-search" />
          {canOpen && (
            <div className="pc-progress">
              <span className="pc-progress-text"><strong>{percent}%</strong> complete</span>
              <div className="pc-progress-bar">
                <ProgressBar value={percent} label="Course progress" showValue={false} />
              </div>
            </div>
          )}
          <ThemeToggle />
          <Button variant="ghost" size="sm" iconStart="logout" href={exitHref} className="pc-exit" aria-label="Exit course">
            <span className="pc-exit-text">Exit course</span>
          </Button>
        </div>
      </header>

      <div className="pc-body">
        <aside id="pc-rail" className={cx('pc-rail', listOpen && 'is-list-open')} aria-label="Course content">
          <button
            type="button"
            className="pc-disclosure"
            aria-expanded={listOpen}
            aria-controls="pc-chapters"
            onClick={() => setListOpen((o) => !o)}
          >
            <span className="pc-disclosure-text">
              <span className="pc-disclosure-title">Course content</span>
              <span className="pc-disclosure-meta">Lesson {index + 1} of {lessons.length}{canOpen && ` · ${percent}% complete`}</span>
            </span>
            <Icon name="chevron-down" size={20} className="pc-chevron" />
          </button>

          <div id="pc-chapters" className="pc-rail-list">
            <div className="pc-rail-head">
              <p className="sg-eyebrow">Course content</p>
              <p className="t-body-sm t-muted">
                {canOpen
                  ? `${product.curriculum.length} ${product.curriculum.length === 1 ? 'chapter' : 'chapters'} · ${lessons.length} lessons`
                  : 'Lessons marked Free preview are open to everyone.'}
              </p>
            </div>

            <nav aria-label="Lessons" className="pc-chapters">
              {product.curriculum.map((ch, ci) => {
                const open = openChapters.has(ch.title)
                const doneCount = ch.lessons.filter((l) => isDone(l.id)).length
                const panelId = `pc-chapter-${ci}`
                return (
                  <section key={ch.title} className={cx('pc-chapter', open && 'is-open')}>
                    <h2 className="pc-chapter-heading">
                      <button
                        type="button"
                        className="pc-chapter-btn"
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => toggleChapter(ch.title)}
                      >
                        <span className="pc-chapter-text">
                          <span className="pc-chapter-title">{ch.title}</span>
                          <span className="pc-chapter-count">
                            {canOpen ? `${doneCount} of ${ch.lessons.length} done` : `${ch.lessons.length} lessons`}
                          </span>
                        </span>
                        <Icon name="chevron-down" size={18} className="pc-chevron" />
                      </button>
                    </h2>
                    <ul id={panelId} className="pc-lessons" hidden={!open}>
                      {ch.lessons.map((l) => {
                        const i = lessons.findIndex((x) => x.id === l.id)
                        return (
                          <li key={l.id}>
                            <LessonRow
                              title={l.title}
                              type={shownType(l)}
                              {...rowMeta(l, i)}
                              state={rowState(l, i)}
                              preview={!canOpen && l.preview}
                              current={l.id === lesson.id}
                              href={hrefFor(l.id)}
                            />
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )
              })}
            </nav>
          </div>
        </aside>

        <div className="pc-main" ref={mainRef}>
          <div className="pc-content">
            {(complete || (!canOpen && lesson.preview) || showHeader || run) && (
              <div className="pc-read pc-intro">
                {run && <CohortBanner product={product} run={run} sessions={sessions} currentLessonId={lesson.id} query={query} />}
                {complete && <CompletedNotice product={product} />}
                {!canOpen && lesson.preview && <PreviewNotice product={product} access={access} />}
                {showHeader && (
                  <header className="pc-head">
                    <p className="sg-eyebrow">{lesson.chapter}</p>
                    <h1 className="t-heading-2">{lesson.title}</h1>
                    <LessonMeta product={product} lesson={lesson} />
                  </header>
                )}
              </div>
            )}

            {showTools && toolsMode === 'drawer' && (
              <div className="pc-read pc-tools"><ToolsBar api={tools} initialTool={initialTool} /></div>
            )}

            <div className="pc-stage" ref={stageRef}>{body}</div>

            {complete && <div className="pc-read"><ReviewForm product={product} /></div>}
          </div>

          <div className="pc-actions">
            <div className="pc-actions-side">
              {prev && (
                <Button variant="ghost" iconStart="arrow-left" href={hrefFor(prev.id)} className="pc-step" aria-label={`Previous lesson: ${prev.title}`}>
                  <span className="pc-step-text">Previous</span>
                  <span className="pc-step-title">{prev.title}</span>
                </Button>
              )}
            </div>

            <div className="pc-actions-centre">
              {canMark && (isDone(lesson.id) ? (
                <div className="pc-done-row">
                  <span className="pc-done"><Icon name="check-circle" size={18} />Completed</span>
                  <Button variant="link" size="sm" onClick={() => markDone(lesson.id, false)}>Undo</Button>
                </div>
              ) : (
                <Button variant={joinable ? 'secondary' : 'primary'} iconStart="check" onClick={() => markDone(lesson.id)}>Mark as complete</Button>
              ))}
            </div>

            <div className="pc-actions-side is-end">
              {next ? (
                <Button variant="secondary" iconEnd="arrow-right" href={hrefFor(next.id)} className="pc-step" aria-label={`Next lesson: ${next.title}`}>
                  <span className="pc-step-text">Next</span>
                  <span className="pc-step-title">{next.title}</span>
                </Button>
              ) : canOpen && (
                <Button variant="secondary" href={MY_PROGRAMMES}>Back to My programmes</Button>
              )}
            </div>
          </div>
        </div>

        {showTools && toolsMode === 'panel' && <ToolsPanel api={tools} initialTool={initialTool} />}
      </div>
    </div>
  )
}
