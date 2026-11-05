// Student dashboard → My library (/student/dashboard/profile/enrollments): everything the student
// has, one item each, from src/lib/student.js. Search, type chips (only the types they have, with
// counts), status, where it came from and sort, all kept in the URL, in one compact toolbar. A
// bundle is one path card with its courses inside. Notes have their own page (/student/dashboard/notes),
// opened from Home; the old ?view=notes link goes there.
// Preview states: ?state=loading | error | empty.
import { useMemo } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import {
  Badge, Button, Card, EmptyState, Icon, Notice, ProgressBar, Skeleton, StatusBadge,
} from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { LIBRARY_TYPES, SOURCES, STATUSES, libraryItems, byLastOpened, fullDate } from '@/lib/student.js'
import './dashboard.css'
import './library.css'

const SORTS = [
  { value: 'recent', label: 'Last opened' },
  { value: 'added', label: 'Recently added' },
  { value: 'title', label: 'A to Z' },
  { value: 'ending', label: 'Access ending soonest' },
]
// Filters appear once there's enough to filter.
const FILTER_FROM = 7
const ms = (iso) => (iso ? new Date(iso).getTime() : 0)

const sorters = {
  recent: byLastOpened,
  added: (a, b) => ms(b.addedAt) - ms(a.addedAt),
  title: (a, b) => a.title.localeCompare(b.title),
  ending: (a, b) => (ms(a.accessUntil) || Infinity) - (ms(b.accessUntil) || Infinity),
}

const typeLabel = (group) => LIBRARY_TYPES.find((t) => t.value === group)?.label.replace(/s$/, '') || ''

function StatusTag({ item }) {
  if (item.status === 'completed') return <StatusBadge status="Completed" />
  if (item.status === 'locked') return <Badge icon="lock">Locked</Badge>
  if (item.status === 'upcoming') return <Badge tone="accent" icon="clock">Coming up</Badge>
  if (item.request) return <StatusBadge status={item.request.status} />
  if (item.order) return <StatusBadge status="Pending">Payment pending</StatusBadge>
  return null
}

function actionFor(item) {
  if (item.request) return { label: item.request.status === 'Link sent' ? 'Complete your place' : 'View details', href: item.href, variant: item.request.status === 'Link sent' ? 'primary' : 'ghost' }
  if (item.order) return { label: 'Payment details', href: item.href, variant: 'secondary' }
  if (item.status === 'locked') return { label: 'Renew site access', href: '/site-access', variant: 'secondary' }
  if (item.status === 'upcoming') return { label: 'View details', href: item.href, variant: 'ghost' }
  if (item.percent == null) return { label: 'Open', href: item.href, variant: 'secondary' }
  if (item.status === 'completed') return { label: 'Open', href: item.href, variant: 'ghost' }
  return { label: item.percent > 0 ? 'Continue' : 'Start', href: item.href, variant: 'secondary' }
}

// A bundle's courses, in path order, with why a course is still locked.
function PathCourses({ item }) {
  return (
    <details className="lib-path">
      <summary>Show the {item.courses.length} courses{item.files?.length ? ' and library files' : ''}</summary>
      <ol className="lib-path-list">
        {item.courses.map((c, i) => (
          <li key={c.product.slug} className={c.locked ? 'is-locked' : ''}>
            <span className="lib-path-num" aria-hidden="true">{c.done ? <Icon name="check" size={14} /> : i + 1}</span>
            <div className="lib-path-main">
              {c.locked ? <span className="t-strong">{c.product.title}</span> : <a className="t-strong" href={c.href}>{c.product.title}</a>}
              <span className="t-body-sm t-muted">
                {c.locked ? `Opens when ${c.previous.product.title} is complete` : c.done ? 'Complete' : `${c.percent}% complete`}
                {c.cert ? ' · certificate issued' : ''}
              </span>
            </div>
            {c.locked ? <Icon name="lock" size={16} /> : <Button size="sm" variant="ghost" href={c.href}>{c.done ? 'Open' : c.percent > 0 ? 'Continue' : 'Start'}</Button>}
          </li>
        ))}
        {item.files?.map((f) => (
          <li key={f.ref}>
            <span className="lib-path-num" aria-hidden="true"><Icon name="file" size={14} /></span>
            <div className="lib-path-main">
              <a className="t-strong" href={f.href}>{f.title}</a>
              <span className="t-body-sm t-muted">{f.detail}</span>
            </div>
            <Button size="sm" variant="ghost" href={f.href}>Open</Button>
          </li>
        ))}
      </ol>
      <p className="t-caption t-muted">Courses open in order: finish one to open the next. A certificate for the whole path comes when you finish them all.</p>
    </details>
  )
}

function ItemRow({ item }) {
  const action = actionFor(item)
  const plain = item.status === 'locked' || item.request || item.order || item.status === 'upcoming'
  return (
    <li className={'lib-item' + (plain ? ' is-muted' : '')}>
      <div className="lib-thumb" aria-hidden="true">{item.image ? <img src={item.image} alt="" loading="lazy" /> : <Icon name="file" size={24} />}</div>
      <div className="lib-main">
        <div className="db-row-tags">
          <Badge>{item.kindLabel || typeLabel(item.group)}</Badge>
          {item.source === 'plan' && <Badge tone="primary" icon="leaf">From membership</Badge>}
          {item.source === 'bundle' && <Badge>From a bundle</Badge>}
          <StatusTag item={item} />
        </div>
        {plain ? <span className="db-row-title">{item.title}</span> : <a className="db-row-title" href={item.href}>{item.title}</a>}
        {item.line && <span className="db-row-meta">{item.line}</span>}
        {item.percent != null && !plain && (
          <ProgressBar value={item.percent} label={item.status === 'completed' ? 'Complete' : `${item.percent}% complete`} showValue={false} />
        )}
        <span className="lib-facts t-caption t-muted">
          {[item.access, item.lastOpenedAt && `Last opened ${fullDate(item.lastOpenedAt)}`].filter(Boolean).join(' · ')}
        </span>
        {item.courses && <PathCourses item={item} />}
      </div>
      <div className="lib-end">
        {item.cert && <Button size="sm" variant="ghost" iconStart="download" href="/files/sample-certificate.pdf" download>Certificate</Button>}
        <Button size="sm" variant={action.variant} href={action.href}>{action.label}</Button>
      </div>
    </li>
  )
}

function ListSkeleton() {
  return (
    <div className="db-page" aria-busy="true" aria-label="Loading your library">
      <Skeleton width="220px" height={32} />
      <Skeleton height={44} radius="var(--radius-md)" />
      <Card padding="lg">
        <div className="db-skel">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="db-skel-row"><Skeleton height={56} /><Skeleton height={8} /><Skeleton height={34} radius="var(--radius-pill)" /></div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default function Library() {
  const { viewer } = useViewer()
  const [params, setParams] = useSearchParams()
  const state = params.get('state')

  const all = useMemo(() => (state === 'empty' ? [] : libraryItems(viewer)), [viewer, state])
  if (params.get('view') === 'notes') return <Navigate to="/student/dashboard/notes" replace />
  if (state === 'loading') return <ListSkeleton />

  const q = params.get('q') || ''
  const type = params.get('type') || 'all'
  const status = params.get('status') || 'all'
  const source = params.get('source') || 'all'
  const sort = params.get('sort') || 'recent'
  const set = (key, value, fallback) => {
    const next = new URLSearchParams(params)
    if (!value || value === fallback) next.delete(key); else next.set(key, value)
    setParams(next, { replace: true })
  }

  const counts = Object.fromEntries(LIBRARY_TYPES.map((t) => [t.value, all.filter((i) => i.group === t.value).length]))
  const types = LIBRARY_TYPES.filter((t) => counts[t.value])
  const statuses = STATUSES.filter((s) => all.some((i) => i.status === s.value))
  const sources = SOURCES.filter((s) => all.some((i) => i.source === s.value))
  const filtering = all.length >= FILTER_FROM

  const needle = q.trim().toLowerCase()
  const shown = all
    .filter((i) => (needle ? i.search.toLowerCase().includes(needle) : true))
    .filter((i) => type === 'all' || i.group === type)
    .filter((i) => status === 'all' || i.status === status)
    .filter((i) => source === 'all' || i.source === source)
    .sort(sorters[sort] || byLastOpened)
  // "Needs you" sits on top unless the student is filtering.
  const pinned = !needle && type === 'all' && status === 'all' && source === 'all' ? shown.filter((i) => i.status === 'action') : []
  const rest = shown.filter((i) => !pinned.includes(i))
  const anyFilter = needle || type !== 'all' || status !== 'all' || source !== 'all'

  return (
    <div className="db-page">
      <header className="db-head">
        <h1 className="t-heading-3">My library</h1>
        <p className="t-muted">Everything you have, in one place{all.length ? `: ${all.length} ${all.length === 1 ? 'item' : 'items'}` : ''}.</p>
      </header>

      {state === 'error' ? (
        <Notice tone="danger" title="We couldn’t load your library" action={<Button size="sm" variant="secondary" href="/student/dashboard/profile/enrollments">Try again</Button>}>
          This is on our side. Nothing you’ve done is lost.
        </Notice>
      ) : !all.length ? (
        <EmptyState icon="book" title="Your library is empty" action={<Button variant="secondary" href="/courses">Explore programmes</Button>}>
          Programmes, audio, files and newsletters you join show here, so you can pick up where you left off.
        </EmptyState>
      ) : (
        <>
          {filtering && (
            <div className="lib-filters" role="search" aria-label="Filter your library">
              <div className="lib-toolbar">
                <label className="lib-search">
                  <Icon name="search" size={16} />
                  <span className="sg-sr">Search your library</span>
                  <input type="search" value={q} placeholder="Search your library" onChange={(e) => set('q', e.target.value, '')} />
                </label>
                <label className="lib-select">
                  <span className="sg-sr">Status</span>
                  <select value={status} onChange={(e) => set('status', e.target.value, 'all')}>
                    <option value="all">Any status</option>
                    {statuses.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="lib-select">
                  <span className="sg-sr">Where it came from</span>
                  <select value={source} onChange={(e) => set('source', e.target.value, 'all')}>
                    <option value="all">From anywhere</option>
                    {sources.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="lib-select">
                  <span className="sg-sr">Sort by</span>
                  <select value={sort} onChange={(e) => set('sort', e.target.value, 'recent')}>
                    {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="lib-chips" role="group" aria-label="Type">
                <button type="button" className="lib-chip" aria-pressed={type === 'all'} onClick={() => set('type', 'all', 'all')}>
                  All <span className="lib-chip-count">{all.length}</span>
                </button>
                {types.map((t) => (
                  <button key={t.value} type="button" className="lib-chip" aria-pressed={type === t.value} onClick={() => set('type', t.value, 'all')}>
                    {t.label} <span className="lib-chip-count">{counts[t.value]}</span>
                  </button>
                ))}
                {anyFilter && <button type="button" className="lib-clear" onClick={() => setParams({}, { replace: true })}>Clear</button>}
              </div>
            </div>
          )}

          {pinned.length > 0 && (
            <Card as="section" padding="lg" tone="sage" className="db-panel" aria-labelledby="lib-needs">
              <h2 id="lib-needs" className="db-panel-title">Waiting on you</h2>
              <ul className="lib-list">{pinned.map((i) => <ItemRow key={i.key} item={i} />)}</ul>
            </Card>
          )}

          <div aria-live="polite" className="sg-sr">{shown.length} {shown.length === 1 ? 'item' : 'items'} shown</div>
          {rest.length ? (
            <Card as="section" padding="lg" aria-label="Your items">
              <ul className="lib-list">{rest.map((i) => <ItemRow key={i.key} item={i} />)}</ul>
            </Card>
          ) : !pinned.length && (
            <EmptyState icon="search" title="Nothing matches" action={anyFilter ? <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>Clear filters</Button> : null}>
              Try another word, or clear the filters to see everything.
            </EmptyState>
          )}
        </>
      )}
    </div>
  )
}
