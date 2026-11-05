import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { cx, Button, Icon, IconButton } from '@/design-system'
import { TYPE_ICON, shownType } from '@/components/player/lesson-types.js'
import { searchCourse, markParts } from '@/components/player/search-index.js'
import './player-tools.css'

const LOCKED = ['drip', 'prereq']
const COLLAPSE_BELOW = { sm: 719, md: 959, lg: 1179 } // max-width, px

function useMedia(query) {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const on = () => setMatches(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return matches
}

// Search this course: an accessible combobox over lesson titles and lesson content.
// Props: product, rowState(lesson, index) and hrefFor(id) from usePlayer, canOpen (visitors see
// non-preview lessons as locked), collapse ('sm' | 'md' | 'lg': the width below which it folds to
// an icon button that opens the field as a sheet across the top of the screen), className.
export default function LessonSearch({ product, rowState, hrefFor, canOpen = true, collapse = 'sm', className }) {
  const navigate = useNavigate()
  const id = useId()
  const listId = `${id}-list`
  const inputRef = useRef(null)
  const toggleRef = useRef(null)
  const listRef = useRef(null)
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(-1)
  const [expanded, setExpanded] = useState(false) // collapsed mode: the sheet is showing
  const collapsed = useMedia(`(max-width: ${COLLAPSE_BELOW[collapse] || COLLAPSE_BELOW.sm}px)`)
  const sheet = collapsed && expanded

  const results = useMemo(() => searchCourse(product, query), [product, query])
  const typed = query.trim().length >= 2
  const open = focused && typed

  // Show the field (the sheet, when collapsed) and focus it.
  const openField = () => {
    flushSync(() => setExpanded(true))
    inputRef.current?.focus()
  }

  // "/" focuses the search, unless the student is typing somewhere.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      const t = e.target
      if (t.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="dialog"]')) return
      e.preventDefault()
      openField()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Keep the active option in view.
  useEffect(() => {
    if (active < 0) return
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [active])

  const change = (v) => { setQuery(v); setActive(-1) }

  const collapseSheet = (refocus) => {
    setExpanded(false)
    if (refocus) toggleRef.current?.focus()
  }

  const choose = (r) => {
    if (!r) return
    change('')
    setFocused(false)
    setExpanded(false)
    inputRef.current?.blur()
    navigate(hrefFor(r.lesson.id))
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!results.length) return
      e.preventDefault()
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((a) => (a === -1 ? (step === 1 ? 0 : results.length - 1) : (a + step + results.length) % results.length))
    } else if (e.key === 'Enter') {
      if (!open || !results.length) return
      e.preventDefault()
      choose(results[active >= 0 ? active : 0])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (query) change('')
      else if (sheet) collapseSheet(true)
      else inputRef.current?.blur()
    }
  }

  const onBlur = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return
    setFocused(false)
    setActive(-1)
    setExpanded(false)
  }

  const activeId = open && active >= 0 ? `${id}-opt-${active}` : undefined
  const status = !typed ? '' : results.length === 0 ? 'No lessons match' : results.length === 1 ? '1 lesson found' : `${results.length} lessons found`

  return (
    <div className={cx('pt-search', collapsed && 'is-collapsed', sheet && 'is-expanded', className)}>
      <IconButton
        ref={toggleRef}
        icon="search"
        label="Search this course"
        className="pt-search-toggle"
        aria-expanded={sheet}
        onClick={openField}
      />

      <div className="pt-search-panel" onBlur={onBlur}>
        <div className="pt-search-field">
          <Icon name="search" size={18} className="pt-search-icon" />
          <input
            ref={inputRef}
            type="search"
            className="pt-search-input"
            placeholder="Search this course"
            aria-label="Search this course"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-keyshortcuts="/"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => change(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={onKeyDown}
          />
          {!query && <kbd className="pt-search-key" aria-hidden="true">/</kbd>}
          {query && (
            <button type="button" className="pt-search-clear" aria-label="Clear search" onClick={() => { change(''); inputRef.current?.focus() }}>
              <Icon name="x" size={16} />
            </button>
          )}
        </div>

        {sheet && (
          <Button variant="ghost" size="sm" className="pt-search-close" onClick={() => { change(''); collapseSheet(true) }}>
            Close
          </Button>
        )}

        <div className={cx('pt-search-pop', open && 'is-open')}>
          <ul id={listId} ref={listRef} role="listbox" aria-label="Lessons in this course" className="pt-results" hidden={!open || !results.length}>
            {results.map((r, i) => {
              const state = rowState ? rowState(r.lesson, r.index) : 'open'
              const locked = LOCKED.includes(state) || (!canOpen && !r.lesson.preview)
              const inTitle = r.field === 'Lesson title'
              return (
                <li
                  key={r.lesson.id}
                  id={`${id}-opt-${i}`}
                  data-i={i}
                  role="option"
                  aria-selected={i === active}
                  className={cx('pt-result', i === active && 'is-active')}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseMove={() => { if (active !== i) setActive(i) }}
                  onClick={() => choose(r)}
                >
                  <span className="pt-result-icon"><Icon name={TYPE_ICON[shownType(r.lesson)] || 'file'} size={18} /></span>
                  <span className="pt-result-text">
                    <span className="pt-result-title"><Marked text={inTitle ? r.snippet : r.lesson.title} match={inTitle ? r.match : null} /></span>
                    <span className="pt-result-meta">
                      {r.chapter}
                      {state === 'done' && <> · Completed</>}
                      {state === 'drip' && r.lesson.drip && <> · Unlocks on {r.lesson.drip}</>}
                      {state === 'prereq' && <> · Complete the previous lesson first</>}
                    </span>
                    {!inTitle && (
                      <span className="pt-result-snippet">
                        <span className="pt-result-field">{r.field}:</span> <Marked text={r.snippet} match={r.match} />
                      </span>
                    )}
                  </span>
                  {locked && <span className="pt-result-lock"><Icon name="lock" size={16} label="Locked" /></span>}
                </li>
              )
            })}
          </ul>
          {open && !results.length && (
            <div className="pt-empty">
              <p className="pt-empty-title">No lessons match “{query.trim()}”</p>
              <p className="pt-empty-hint">Try ‘fibre’ or ‘breathing’</p>
            </div>
          )}
        </div>
        <span className="pt-sr" role="status" aria-live="polite">{focused ? status : ''}</span>
      </div>
    </div>
  )
}

function Marked({ text, match }) {
  return markParts(text, match).map((p, i) => (
    <Fragment key={i}>{p.mark ? <mark className="pt-mark">{p.text}</mark> : p.text}</Fragment>
  ))
}
