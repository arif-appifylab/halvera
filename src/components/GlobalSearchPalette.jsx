// The search palette dialog opened by GlobalSearch (src/components/GlobalSearch.jsx). Loaded on first
// open, so the search index stays out of the main bundle. Combobox (the input) + listbox (the results).
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/design-system'
import { searchSite, groupResults, highlight, kindInfo, searchHref, SUGGESTIONS } from '@/lib/site-search.js'
import './global-search.css'

const PER_GROUP = 4
const MAX_RESULTS = 12

// Text with the query's words wrapped in <mark>.
export function Highlight({ text, query }) {
  return highlight(text, query).map((part, i) => (part.match ? <mark key={i} className="gs-mark">{part.text}</mark> : part.text))
}

export default function Palette({ onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const dialogRef = useRef(null)
  const listRef = useRef(null)
  const baseId = useId()
  const listId = `${baseId}-list`
  const titleId = `${baseId}-title`

  const trimmed = query.trim()
  const { groups, options, total } = useMemo(() => {
    const all = searchSite(trimmed)
    // Keep each group short, and the whole list to a glance; /search shows the rest.
    const g = groupResults(all).map((grp) => ({ ...grp, items: grp.items.slice(0, PER_GROUP) }))
    const trimmedGroups = []
    let start = 0
    for (const grp of g) {
      const items = grp.items.slice(0, Math.max(0, MAX_RESULTS - start)).map((r, j) => ({ ...r, index: start + j }))
      if (items.length) trimmedGroups.push({ ...grp, items })
      start += items.length
    }
    const opts = trimmedGroups.flatMap((grp) => grp.items)
    if (trimmed && all.length) opts.push({ id: 'see-all', kind: 'see-all', href: searchHref(trimmed) })
    return { groups: trimmedGroups, options: opts, total: all.length }
  }, [trimmed])

  const current = Math.min(active, Math.max(0, options.length - 1))
  const optionId = (i) => `${baseId}-opt-${i}`

  useEffect(() => { inputRef.current?.focus() }, [])

  // Lock the page behind the dialog.
  useEffect(() => {
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow }
  }, [])

  // Keep the active option in view.
  useEffect(() => {
    document.getElementById(optionId(current))?.scrollIntoView({ block: 'nearest' })
  })

  const go = (opt) => {
    if (!opt) return
    navigate(opt.href)
    onClose()
  }

  const onInputKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((current + 1) % Math.max(1, options.length)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((current - 1 + options.length) % Math.max(1, options.length)) }
    else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); setActive(0) }
    else if (e.key === 'End' && e.ctrlKey) { e.preventDefault(); setActive(options.length - 1) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (options.length) go(options[current])
      else if (trimmed) go({ href: searchHref(trimmed) })
    }
  }

  // Escape closes; Tab stays inside the dialog.
  const onDialogKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
    else if (e.key === 'Tab') {
      const focusables = [...dialogRef.current.querySelectorAll('input, button:not([disabled]), a[href]')]
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }

  const expanded = trimmed.length > 0 && options.length > 0

  return (
    <div className="gs-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} className="gs-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onDialogKey}>
        <h2 id={titleId} className="sg-sr">Search the site</h2>
        <div className="gs-field">
          <Icon name="search" size={20} />
          <input
            ref={inputRef}
            className="gs-input"
            type="text"
            role="combobox"
            aria-label="Search programmes, articles, the library and more"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-activedescendant={expanded ? optionId(current) : undefined}
            placeholder="Search programmes, articles, the library…"
            autoComplete="off"
            spellCheck="false"
            enterKeyHint="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0) }}
            onKeyDown={onInputKey}
          />
          <button type="button" className="gs-esc" onClick={onClose} aria-label="Close search">Esc</button>
        </div>

        <div className="gs-body">
          <p className="sg-sr" aria-live="polite">
            {trimmed ? (total ? `${total} ${total === 1 ? 'result' : 'results'}` : 'No results') : ''}
          </p>

          {!trimmed && (
            <div className="gs-hint">
              <p className="gs-hint-title">Try searching for</p>
              <ul className="gs-suggest">
                {SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button type="button" className="gs-chip" onClick={() => { setQuery(s); setActive(0); inputRef.current?.focus() }}>{s}</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul ref={listRef} id={listId} role="listbox" aria-label="Search results" className="gs-list" hidden={!expanded}>
            {groups.map((g) => (
              <li key={g.kind} role="presentation" className="gs-group">
                <p id={`${baseId}-${g.kind}`} className="gs-group-title" role="presentation">{g.label}</p>
                <ul role="group" aria-labelledby={`${baseId}-${g.kind}`}>
                  {g.items.map((r) => {
                    const i = r.index
                    return (
                      <li
                        key={r.id}
                        id={optionId(i)}
                        role="option"
                        aria-selected={i === current}
                        className="gs-option"
                        onMouseMove={() => i !== current && setActive(i)}
                        onClick={() => go(r)}
                      >
                        <span className="gs-option-icon" aria-hidden="true"><Icon name={kindInfo(r.kind).icon} size={18} /></span>
                        <span className="gs-option-text">
                          <span className="gs-option-title"><Highlight text={r.title} query={trimmed} /></span>
                          {(r.meta || r.description) && <span className="gs-option-meta">{r.meta || r.description}</span>}
                        </span>
                        <Icon name="arrow-right" size={16} />
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
            {trimmed && total > 0 && (
              <li role="presentation" className="gs-group gs-group-all">
                <ul role="group" aria-label="More">
                  <li
                    id={optionId(options.length - 1)}
                    role="option"
                    aria-selected={current === options.length - 1}
                    className="gs-option gs-option-all"
                    onMouseMove={() => current !== options.length - 1 && setActive(options.length - 1)}
                    onClick={() => go(options[options.length - 1])}
                  >
                    <span className="gs-option-icon" aria-hidden="true"><Icon name="search" size={18} /></span>
                    <span className="gs-option-text">
                      <span className="gs-option-title">See all results for “{trimmed}”</span>
                    </span>
                    <Icon name="arrow-right" size={16} />
                  </li>
                </ul>
              </li>
            )}
          </ul>

          {trimmed && total === 0 && (
            <div className="gs-empty">
              <p className="gs-empty-title">Nothing found for “{trimmed}”</p>
              <p className="gs-empty-text">Check the spelling or try a broader word, like “sleep” or “gut”.</p>
            </div>
          )}
        </div>

        <div className="gs-foot" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> to move</span>
          <span><kbd>Enter</kbd> to open</span>
          <span><kbd>Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  )
}
