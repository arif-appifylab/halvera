// The asset library: /asset-library/:slug (all files), …/category/:categoryId and …/folder/:folderId.
// Categories → folders → files, each free, included in a membership or paid (see src/data/library.js).
// Layout follows the EzyCourse admin's Library: categories in a sidebar, then sort, view and type
// filters, then a FOLDERS and a FILES section. Locked files open the unlock dialog.
import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  cx, Badge, Breadcrumbs, Button, Card, EmptyState, Icon, Notice, PriceTag, RadioCard, Select, SegmentedToggle, Skeleton, Tabs, TextField,
} from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { useCart } from '@/app/cart.jsx'
import { getPlan } from '@/data/plans.js'
import PlanPicker from '@/components/PlanPicker.jsx'
import { AccessChip, FileCard, FolderCard } from '@/components/library/LibraryCards.jsx'
import { LibIcon } from '@/components/library/TypeArt.jsx'
import { UnlockModal } from '@/components/library/UnlockOptions.jsx'
import {
  getLibrary, getLibraryItem, listCategories, foldersIn, filesIn, libraryHref, libraryAccess, unlockOptions, librarySummary,
  accessChip, checkoutHref, cartItemFor, isSoloPrice, needsSiteAccessFor, sizeBytes, TYPE_FILTERS,
} from '@/lib/library.js'
import { siteAccess } from '@/lib/access.js'
import NotFound from '@/pages/NotFound.jsx'
import './library.css'

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'size', label: 'Size' },
]
const VIEWS = [{ value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' }]
const VIEW_KEY = 'halvera-library-view'
const KIND_WORD = { category: 'category', folder: 'folder' }

const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`

function useStoredView() {
  const [view, setView] = useState(() => {
    try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid' } catch { return 'grid' }
  })
  const save = (v) => {
    setView(v)
    try { localStorage.setItem(VIEW_KEY, v) } catch { /* storage unavailable */ }
  }
  return [view, save]
}

// The first visit shows the loading state briefly, as if the library were fetched.
let seen = false
function useFirstLoad() {
  const [loading, setLoading] = useState(!seen)
  useEffect(() => {
    if (!loading) return undefined
    const t = setTimeout(() => { seen = true; setLoading(false) }, 450)
    return () => clearTimeout(t)
  }, [loading])
  return loading
}

const SORTERS = {
  newest: (a, b) => b.file.date.localeCompare(a.file.date) || a.title.localeCompare(b.title),
  oldest: (a, b) => a.file.date.localeCompare(b.file.date) || a.title.localeCompare(b.title),
  name: (a, b) => a.title.localeCompare(b.title),
  size: (a, b) => sizeBytes(b.file.size) - sizeBytes(a.file.size) || a.title.localeCompare(b.title),
}

const matches = (item, q) => !q || `${item.title} ${item.description || ''}`.toLowerCase().includes(q)

function focusContent() {
  const el = document.getElementById('lib-content')
  if (!el) return
  el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
}

/* Sidebar: All files, then each category with its count and access. */
function Sidebar({ current, viewer }) {
  const all = librarySummary()
  return (
    <nav className="lib-side" aria-label="Library categories">
      <p className="lib-side-title">Library</p>
      <ul className="lib-side-list">
        <li>
          <a className="lib-side-link" href={libraryHref()} aria-current={!current ? 'page' : undefined}>
            <LibIcon name="folder" size={18} />
            <span className="lib-side-name">All files</span>
            <span className="lib-side-count">{all.files}</span>
          </a>
        </li>
        {listCategories().map((c) => {
          const chip = accessChip(c.ref, viewer)
          const here = current?.ref === c.ref || current?.parent === c.ref
          return (
            <li key={c.ref}>
              <a className="lib-side-link" href={c.href} aria-current={current?.ref === c.ref ? 'page' : here ? 'true' : undefined}>
                <LibIcon name="folder" size={18} />
                <span className="lib-side-name">{c.title}</span>
                {c.access === 'members' && chip.label === 'Members' && (
                  <span className="lib-side-flag is-members" title="Included in membership"><Icon name="leaf" size={14} /><span className="sg-sr">Included in membership</span></span>
                )}
                {c.access === 'paid' && (
                  <span className={cx('lib-side-flag', chip.label === 'Owned' && 'is-owned')}>
                    <Icon name={chip.icon || 'lock'} size={14} />
                    {chip.label === 'Owned' ? <span className="sg-sr">Owned</span> : c.prices[0].price.amount}
                  </span>
                )}
                <span className="lib-side-count"><span className="sg-sr">, </span>{c.files}<span className="sg-sr"> files</span></span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/* The access and price block for the selected category or folder. */
function ScopeHero({ item, viewer, onUnlock }) {
  const cart = useCart()
  const access = libraryAccess(item.ref, viewer)
  const [priceId, setPriceId] = useState(item.prices[0]?.id)
  const price = item.prices.find((p) => p.id === priceId) || item.prices[0]
  const word = KIND_WORD[item.kind]
  const more = unlockOptions(item.ref, viewer).filter((o) => o.ref !== item.ref)
  const gate = needsSiteAccessFor(item.ref, viewer)

  let title
  let body
  let action = null
  if (access.state === 'site-access-ended') {
    title = 'Your site access has ended'
    body = <p>You bought this {word}. It opens again as soon as you renew, and nothing you bought is lost.</p>
    action = <Button href="/site-access">Renew site access</Button>
  } else if (access.open) {
    title = access.via === 'free' ? 'Free for everyone' : access.via === 'membership' ? 'Included in your membership' : `This ${word} is yours`
    body = (
      <p>
        {access.via === 'free' ? `Open or download any file in this ${word}.`
          : access.via === 'membership' ? `Everything here comes with your ${getPlan(viewer.plan)?.name || ''} membership.`
            : access.ownedVia === item.ref ? `You bought this ${word}, so every file in it is open to you.`
              : `It came with ${getLibraryItem(access.ownedVia)?.title}, so every file in it is open to you.`}
      </p>
    )
    action = <Button variant="secondary" iconEnd="arrow-right" onClick={focusContent}>Open</Button>
  } else if (item.prices.length) {
    title = `Unlock every file in this ${word}`
    body = (
      <>
        {item.prices.length > 1 ? (
          <fieldset className="lib-hero-prices">
            <legend className="sg-sr">Choose how to pay</legend>
            {item.prices.map((p) => (
              <RadioCard
                key={p.id}
                name={`lib-price-${item.ref}`}
                value={p.id}
                checked={p.id === price.id}
                onChange={() => setPriceId(p.id)}
                title={p.kind === 'one-time' ? 'One-time payment' : p.kind === 'subscription' ? 'Monthly subscription' : 'Installments'}
                description={p.kind === 'one-time' ? `Yours to keep, with every ${plural(item.files, 'file')}` : p.kind === 'subscription' ? (p.price.note || 'Cancel any time') : `${p.label}, ${p.price.total} in total`}
                meta={<PriceTag amount={p.price.amount} interval={p.price.interval} installments={p.price.installments} size="sm" />}
              />
            ))}
          </fieldset>
        ) : (
          <PriceTag {...price.price} />
        )}
        {isSoloPrice(price) && <p className="t-body-sm t-muted">Bought on its own, so it goes straight to checkout.</p>}
        {gate && <p className="lib-gate t-body-sm t-muted">Needs Site access · added at checkout ({siteAccess.prices[0].price.amount} / {siteAccess.prices[0].interval}).</p>}
      </>
    )
    action = (
      <>
        <Button href={checkoutHref(item.ref, price.id)}>Get the {word}</Button>
        {!isSoloPrice(price) && <Button variant="ghost" iconStart="cart" onClick={() => cart.add(cartItemFor(item.ref, price.id))}>Add to cart</Button>}
        {more.length > 0 && <Button variant="link" onClick={() => onUnlock(item.ref)}>More ways to unlock</Button>}
      </>
    )
  } else if (item.access === 'members') {
    title = 'Included in a membership'
    body = <PlanPicker product={{ title: item.title, plans: item.plans }} forRef={`library:${item.ref}`} compact />
  } else {
    const parent = getLibraryItem(item.parent)
    title = `Comes with ${parent?.title}`
    body = <p>This {word} isn’t sold on its own. Get the whole category to open it, with everything else inside.</p>
    action = <Button onClick={() => onUnlock(item.ref)}>See ways to unlock</Button>
  }

  return (
    <Card tone={access.open ? 'sunken' : 'sage'} padding="lg" className="lib-hero" aria-labelledby="lib-hero-title">
      <div className="lib-hero-text">
        <div className="pg-row">
          <AccessChip itemRef={item.ref} viewer={viewer} />
          <span className="t-body-sm t-muted">{item.detail}</span>
        </div>
        <h2 id="lib-hero-title" className="t-heading-3">{title}</h2>
      </div>
      <div className="lib-hero-body">{body}</div>
      {action && <div className="lib-hero-actions">{action}</div>}
    </Card>
  )
}

function LoadingState() {
  return (
    <div className="lib-main" aria-busy="true" aria-label="Loading the library">
      <Skeleton height={46} radius="var(--radius-md)" />
      <Skeleton width="70%" height={36} radius="var(--radius-pill)" />
      <div className="lib-folders">
        {[0, 1, 2].map((i) => <Skeleton key={i} height={76} radius="var(--radius-lg)" />)}
      </div>
      <div className="lib-files">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="pg-stack-sm"><Skeleton height={140} radius="var(--radius-lg)" /><Skeleton width="80%" /><Skeleton width="50%" height={12} /></div>
        ))}
      </div>
    </div>
  )
}

export default function Library() {
  const { slug, categoryId, folderId } = useParams()
  const [params] = useSearchParams()
  const { viewer } = useViewer()
  const [view, setView] = useStoredView()
  const [type, setType] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')
  const [unlock, setUnlock] = useState(null)
  const firstLoad = useFirstLoad()

  const lib = getLibrary(slug)
  const scopeRef = folderId ? `folder:${folderId}` : categoryId ? `category:${categoryId}` : null
  const scope = scopeRef ? getLibraryItem(scopeRef) : null
  const state = params.get('state')
  const q = query.trim().toLowerCase()
  const filtering = type !== 'all' || Boolean(q)

  const { shownFolders, shownFiles } = useMemo(() => {
    if (!lib || (scopeRef && !scope)) return { shownFolders: [], shownFiles: [] }
    let fs = scope?.kind === 'folder' ? [] : foldersIn(scope?.id)
    // A category lists its loose files; searching or filtering looks inside its folders too.
    let list = scope?.kind === 'category' && !filtering ? filesIn(scope.ref) : filesIn(scope?.ref, { deep: true })
    if (type !== 'all') { fs = []; list = list.filter((f) => f.file.type === type) }
    if (q) { fs = fs.filter((f) => matches(f, q)); list = list.filter((f) => matches(f, q)) }
    if (sort === 'name') fs = [...fs].sort((a, b) => a.title.localeCompare(b.title))
    return { shownFolders: fs, shownFiles: [...list].sort(SORTERS[sort]) }
  }, [lib, scope, scopeRef, type, q, sort, filtering])

  if (!lib || (scopeRef && !scope) || (folderId && scope?.kind !== 'folder')) return <NotFound />

  const category = scope?.kind === 'category' ? scope : scope?.parent ? getLibraryItem(scope.parent) : null
  const crumbs = [{ label: 'Library', href: libraryHref() }]
  if (category) crumbs.push({ label: category.title, href: category.href })
  if (scope?.kind === 'folder') crumbs.push({ label: scope.title, href: scope.href })
  const loading = firstLoad || state === 'loading'
  const emptyLibrary = state === 'empty'
  const clear = () => { setType('all'); setQuery('') }
  const count = shownFiles.length

  return (
    <div className="lib">
      <header className="pg-head lib-head">
        <div className="sg-container">
          <div className="pg-head-inner">
            {scopeRef && <Breadcrumbs items={crumbs} />}
            {scope && <p className="sg-eyebrow">{scope.kind === 'folder' ? category.title : 'Category'}</p>}
            <h1 className="t-heading-1">{scope ? scope.title : lib.title}</h1>
            <p className="t-body-lg t-muted">{scope ? scope.description : lib.description}</p>
            {!scope && <p className="t-body-sm t-muted">{librarySummary().label}</p>}
          </div>
        </div>
      </header>

      <div className="sg-container lib-layout">
        <Sidebar current={scope} viewer={viewer} />

        {state === 'error' ? (
          <div className="lib-main">
            <Notice tone="danger" title="We couldn’t load the library" action={<Button size="sm" variant="secondary" href={libraryHref(scopeRef)}>Try again</Button>}>
              This is on our side. Your files and purchases are safe.
            </Notice>
          </div>
        ) : loading ? <LoadingState /> : emptyLibrary ? (
          <div className="lib-main">
            <EmptyState icon="book" title="Nothing in the library yet" action={<Button variant="secondary" href="/courses">Explore programmes</Button>}>
              We’re adding recipes, audio and guides. Check back soon.
            </EmptyState>
          </div>
        ) : (
          <div className="lib-main">
            {scope && <ScopeHero key={scope.ref} item={scope} viewer={viewer} onUnlock={setUnlock} />}

            <div className="lib-toolbar" role="search">
              <TextField
                className="lib-search"
                label={`Search ${scope ? `this ${KIND_WORD[scope.kind]}` : 'the library'}`}
                type="search"
                iconStart="search"
                placeholder="Try “soup” or “sleep”"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Select className="lib-sort" label="Sort by" options={SORTS} value={sort} onChange={(e) => setSort(e.target.value)} />
              <div className="lib-view">
                <span className="lib-view-label" aria-hidden="true">View</span>
                <SegmentedToggle label="View" options={VIEWS} value={view} onChange={setView} />
              </div>
            </div>

            <div className="lib-types">
              <Tabs variant="pill" label="File type" tabs={TYPE_FILTERS} value={type} onChange={setType} />
            </div>

            <div id="lib-content" className="lib-content" tabIndex={-1}>
              {filtering && (
                <div className="lib-status">
                  <p aria-live="polite">{plural(count, 'file')}{shownFolders.length ? `, ${plural(shownFolders.length, 'folder')}` : ''}</p>
                  <Button variant="link" onClick={clear}>Clear filters</Button>
                </div>
              )}

              {shownFolders.length === 0 && count === 0 ? (
                filtering ? (
                  <EmptyState icon="search" title="Nothing matches" action={<Button variant="secondary" onClick={clear}>Clear filters</Button>}>
                    Try another word or file type, or clear the filters to see everything here.
                  </EmptyState>
                ) : (
                  <EmptyState icon="file" title={`This ${scope ? KIND_WORD[scope.kind] : 'library'} is empty`}>
                    New files appear here as soon as we add them.
                  </EmptyState>
                )
              ) : (
                <>
                  {shownFolders.length > 0 && (
                    <section className="lib-section" aria-labelledby="lib-folders-title">
                      <h2 id="lib-folders-title" className="lib-section-title">Folders</h2>
                      <ul className={cx('lib-folders', view === 'list' && 'is-list')}>
                        {shownFolders.map((f) => <li key={f.ref}><FolderCard folder={f} viewer={viewer} layout={view} /></li>)}
                      </ul>
                    </section>
                  )}
                  {count > 0 && (
                    <section className="lib-section" aria-labelledby="lib-files-title">
                      <h2 id="lib-files-title" className="lib-section-title">{scope?.kind === 'category' && !filtering ? 'Files in this category' : 'Files'}</h2>
                      <ul className={cx('lib-files', view === 'list' && 'is-list')}>
                        {shownFiles.map((f) => <li key={f.ref}><FileCard file={f} viewer={viewer} layout={view} onLocked={setUnlock} /></li>)}
                      </ul>
                    </section>
                  )}
                </>
              )}
            </div>

            {!scope && viewer.siteAccess !== 'active' && siteAccess.enabled && (
              <p className="lib-gate t-body-sm t-muted">
                <Badge icon="info">Site access</Badge> Paid files need Site access, added at checkout. Free and member files don’t. <a href="/site-access">What is site access?</a>
              </p>
            )}
          </div>
        )}
      </div>

      <UnlockModal itemRef={unlock} onClose={() => setUnlock(null)} />
    </div>
  )
}
