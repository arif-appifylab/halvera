import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TextField, Button, EmptyState, Notice, Skeleton, Icon } from '@/design-system'
import { searchSite, groupResults, kindInfo, SUGGESTIONS } from '@/lib/site-search.js'
import { Highlight } from '@/components/GlobalSearchPalette.jsx'
import './search.css'

// /search?q=…&kind=… — the full results for the header search. The query and the kind filter live in
// the URL, so results can be shared and the header palette's "See all results" lands here.

const SETTLE_MS = 250
const PER_GROUP = 5

export default function Search() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const kindParam = params.get('kind') || ''
  const inputRef = useRef(null)

  const setParam = (name, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setParams(next, { replace: true })
  }

  // A short pause while typing, so results don't flicker on every key.
  const [settled, setSettled] = useState(q)
  useEffect(() => {
    if (settled === q) return undefined
    const t = setTimeout(() => setSettled(q), SETTLE_MS)
    return () => clearTimeout(t)
  }, [q, settled])
  const loading = settled !== q
  const query = settled.trim()

  const { results, error } = useMemo(() => {
    try { return { results: searchSite(query), error: null } } catch (err) { return { results: [], error: err } }
  }, [query])

  const groups = groupResults(results)
  // A kind filter only counts if that kind has results for this query.
  const kind = groups.some((g) => g.kind === kindParam) ? kindParam : ''
  const shown = kind ? groups.filter((g) => g.kind === kind) : groups
  const shownCount = shown.reduce((n, g) => n + g.items.length, 0)

  const runSuggestion = (s) => {
    setParams(new URLSearchParams({ q: s }), { replace: true })
    inputRef.current?.focus()
  }

  return (
    <div className="srch">
      <header className="pg-head">
        <div className="sg-container">
          <div className="pg-head-inner">
            <h1 className="t-display-lg">Search</h1>
            <p className="t-body-lg t-muted">Programmes, lessons, the library, articles, events and more, in one place.</p>
          </div>
        </div>
      </header>

      <section className="srch-body">
        <div className="sg-container pg-stack">
          <form role="search" className="srch-form" onSubmit={(e) => { e.preventDefault(); setSettled(q) }}>
            <TextField
              ref={inputRef}
              className="srch-field"
              label="Search the site"
              type="search"
              iconStart="search"
              placeholder="Try “sleep”, “soup” or “energy”"
              value={q}
              autoFocus={!q}
              onChange={(e) => setParam('q', e.target.value)}
            />
            <Button type="submit">Search</Button>
          </form>

          {query && !error && (
            <div className="srch-status">
              <p className="srch-count" aria-live="polite">
                {loading ? 'Searching…' : results.length
                  ? `${kind ? shownCount : results.length} ${(kind ? shownCount : results.length) === 1 ? 'result' : 'results'} for “${query}”${kind ? ` in ${kindInfo(kind).label.toLowerCase()}` : ''}`
                  : `No results for “${query}”`}
              </p>
              {!loading && groups.length > 1 && (
                <div className="srch-chips" role="group" aria-label="Show results from">
                  <button type="button" className="srch-chip" aria-pressed={!kind} onClick={() => setParam('kind', '')}>All</button>
                  {groups.map((g) => (
                    <button key={g.kind} type="button" className="srch-chip" aria-pressed={kind === g.kind} onClick={() => setParam('kind', g.kind)}>
                      <Icon name={g.icon} size={16} />
                      {g.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="srch-results">
            {error ? (
              <Notice tone="danger" title="We couldn’t search just now" action={<Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Try again</Button>}>
                Refresh the page, or come back in a few minutes.
              </Notice>
            ) : !q.trim() ? (
              <EmptyState icon="search" title="What are you looking for?" action={<Suggestions onPick={runSuggestion} />}>
                Search every programme, lesson, library file, article and event. Or start with one of these.
              </EmptyState>
            ) : loading ? (
              <div className="srch-loading" aria-busy="true" aria-label="Loading results">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="srch-skel">
                    <Skeleton width={40} height={40} radius="var(--radius-md)" />
                    <div className="srch-skel-text">
                      <Skeleton width="45%" height={20} />
                      <Skeleton width="80%" />
                    </div>
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <EmptyState icon="search" title={`Nothing found for “${query}”`} action={<Suggestions onPick={runSuggestion} />}>
                Check the spelling, try a broader word, or start with one of these.
              </EmptyState>
            ) : (
              <div className="srch-groups">
                {shown.map((g) => (
                  <ResultGroup key={g.kind} group={g} query={query} limit={kind ? Infinity : PER_GROUP} onShowAll={() => setParam('kind', g.kind)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function ResultGroup({ group, query, limit, onShowAll }) {
  const items = group.items.slice(0, limit)
  const headingId = `srch-${group.kind}`
  return (
    <section className="srch-group" aria-labelledby={headingId}>
      <h2 id={headingId} className="srch-group-title">
        <Icon name={group.icon} size={20} />
        {group.label}
      </h2>
      <ul className="srch-list">
        {items.map((r) => (
          <li key={r.id}>
            <a className="srch-item" href={r.href}>
              <span className="srch-item-icon" aria-hidden="true"><Icon name={kindInfo(r.kind).icon} size={20} /></span>
              <span className="srch-item-text">
                <span className="srch-item-title"><Highlight text={r.title} query={query} /></span>
                {r.description && <span className="srch-item-desc"><Highlight text={r.description} query={query} /></span>}
                {r.meta && <span className="srch-item-meta">{r.meta}</span>}
              </span>
              <Icon name="arrow-right" size={18} />
            </a>
          </li>
        ))}
      </ul>
      {group.items.length > items.length && (
        <Button variant="link" onClick={onShowAll}>Show all {group.label.toLowerCase()}</Button>
      )}
    </section>
  )
}

function Suggestions({ onPick }) {
  return (
    <ul className="srch-suggest" aria-label="Suggested searches">
      {SUGGESTIONS.map((s) => (
        <li key={s}><button type="button" className="srch-chip" onClick={() => onPick(s)}>{s}</button></li>
      ))}
    </ul>
  )
}
