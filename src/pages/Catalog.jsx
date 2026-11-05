import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Tabs, TextField, Select, ProductCard, Skeleton, EmptyState, Pagination, Notice,
  Section, Button, Icon,
} from '@/design-system'
import { listCatalog, cardProps, CATALOG_TABS, TYPE_LABEL, isFree } from '@/lib/products.js'
import { siteAccess } from '@/lib/access.js'
import { conditions } from '@/data/conditions.js'
import { school } from '@/data/school.js'
import { useViewer } from '@/app/viewer.jsx'
import './catalog.css'

// /courses (courses and cohorts) and /all-products (every type the school sells) share this page.
// Filters live in the URL (?q, ?type, ?category, ?price, ?sort) so other pages, like the 404 search, can link here.
// Each filter does one job: the type tabs pick the kind of product (courses, events, the library…), Category
// picks what it helps with (a condition), Price picks free / paid / membership. An older ?topic= link still works.

const PAGE_SIZE = 9
const SETTLE_MS = 400

const SCOPES = {
  courses: {
    crumb: 'Programmes', eyebrow: 'Courses and live groups', title: 'Programmes',
    intro: 'Self-paced courses and small live groups for gut health, men’s health, sleep and stress.',
    types: ['course', 'cohort'], noun: ['programme', 'programmes'],
  },
  all: {
    crumb: 'All products', eyebrow: 'Shop', title: 'All products',
    intro: `Programmes, workshops, coaching, guided audio and downloads from ${school.name}.`,
    types: null, noun: ['product', 'products'],
  },
}

const CATEGORIES = [{ value: 'any', label: 'All categories' }, ...conditions.map((c) => ({ value: c.slug, label: c.title }))]
const PRICES = [
  { value: 'any', label: 'Any price' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
  { value: 'membership', label: 'Included in a membership' },
]
const SORTS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
]

// Catalogue-only facts the product data doesn't carry: when each product went on sale, and a popularity
// figure for products without a student count (members, subscribers, registrations).
const LISTING = {
  'gut-health-reset': { added: '2024-06-03' },
  'mens-health-circle': { added: '2025-08-18' },
  'calm-gut-bundle': { added: '2025-03-14', popularity: 310 },
  'one-to-one-coaching': { added: '2023-09-01', popularity: 60 },
  'healing-circle-community': { added: '2024-09-01', popularity: 640 },
  'rest-and-restore-audio': { added: '2025-05-02', popularity: 450 },
  'retreat-recordings': { added: '2026-05-30', popularity: 20 },
  'halvera-library': { added: '2025-01-20', popularity: 880 },
  'spring-gut-workshop': { added: '2026-09-20', popularity: 11 },
  'winter-retreat': { added: '2026-08-12', popularity: 14 },
  'sunday-letter': { added: '2023-11-05', popularity: 520 },
  'mindful-eating-basics': { added: '2024-02-10' },
  'better-sleep-21-days': { added: '2026-10-01', popularity: 70 },
  'mens-health-foundations': { added: '2024-04-22', popularity: 380 },
  'stress-less-programme': { added: '2023-10-10', popularity: 290 },
  consultation: { added: '2023-09-01', popularity: 760 },
  'initial-consultation': { added: '2023-09-01', popularity: 240 },
  'follow-up': { added: '2023-09-01', popularity: 180 },
  'breathwork-group': { added: '2025-02-11', popularity: 130 },
  'practitioner-intro': { added: '2024-05-06', popularity: 210 },
  'clinic-consultation': { added: '2026-09-01', popularity: 40 },
  'walk-and-talk': { added: '2026-09-15', popularity: 35 },
  'member-check-in': { added: '2025-01-10', popularity: 90 },
}

const UNAVAILABLE = ['sold-out', 'sales-ended', 'enrolment-closed']
const categoryTitle = (slug) => conditions.find((c) => c.slug === slug)?.title || ''
const popularity = (p) => p.students ?? LISTING[p.slug]?.popularity ?? 0
const added = (p) => LISTING[p.slug]?.added || ''
// Membership-only products have no price of their own, so they sort after everything with one.
const defaultAmount = (p) => (p.prices[0] ? p.prices[0].amount : Infinity)

const matchesPrice = (p, price) => {
  if (price === 'free') return isFree(p)
  if (price === 'paid') return p.visibility !== 'membership' && p.prices.length > 0 && !isFree(p)
  if (price === 'membership') return p.visibility === 'membership'
  return true
}

const matchesQuery = (p, q) => {
  if (!q) return true
  const text = [p.title, p.summary, TYPE_LABEL[p.type], categoryTitle(p.category)].join(' ').toLowerCase()
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((word) => text.includes(word))
}

function sortProducts(list, sort) {
  const out = [...list]
  if (sort === 'newest') return out.sort((a, b) => added(b).localeCompare(added(a)))
  if (sort === 'price-asc') return out.sort((a, b) => defaultAmount(a) - defaultAmount(b))
  // Most popular: products people can still buy first, then the ones that are closed for now.
  return out.sort((a, b) =>
    (UNAVAILABLE.includes(a.availability) - UNAVAILABLE.includes(b.availability)) || popularity(b) - popularity(a))
}

const pick = (value, options, fallback) => (options.some((o) => o.value === value) ? value : fallback)

export default function Catalog({ scope = 'courses' }) {
  // Keyed so moving between /courses and /all-products starts fresh.
  return <CatalogPage key={scope} scope={SCOPES[scope] ? scope : 'courses'} />
}

function CatalogPage({ scope }) {
  const config = SCOPES[scope]
  const { viewer } = useViewer()
  const [params, setParams] = useSearchParams()
  const gridRef = useRef(null)

  const q = params.get('q') || ''
  const type = scope === 'all' ? pick(params.get('type'), CATALOG_TABS, 'all') : 'all'
  const category = pick(params.get('category') || params.get('topic'), CATEGORIES, 'any')
  const price = pick(params.get('price'), PRICES, 'any')
  const sort = pick(params.get('sort'), SORTS, 'popular')

  const setParam = (name, value, fallback) => {
    const next = new URLSearchParams(params)
    if (name === 'category') next.delete('topic')
    if (!value || value === fallback) next.delete(name)
    else next.set(name, value)
    setParams(next, { replace: true })
  }

  const clearFilters = () => {
    const next = new URLSearchParams()
    if (sort !== 'popular') next.set('sort', sort)
    setParams(next, { replace: true })
  }

  // Short loading state while filters settle; typing keeps it waiting until you pause.
  const filterKey = [type, q.trim(), category, price, sort].join('|')
  const [settledKey, setSettledKey] = useState(filterKey)
  useEffect(() => {
    if (settledKey === filterKey) return undefined
    const timer = setTimeout(() => setSettledKey(filterKey), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [filterKey, settledKey])
  const loading = settledKey !== filterKey

  // The page number resets whenever the filters change.
  const [paging, setPaging] = useState({ key: filterKey, page: 1 })
  const page = paging.key === filterKey ? paging.page : 1

  const { results, error } = useMemo(() => {
    try {
      const tabTypes = CATALOG_TABS.find((t) => t.value === type)?.types
      const list = listCatalog().filter((p) =>
        p.visibility !== 'hidden'
        && (!config.types || config.types.includes(p.type))
        && (!tabTypes || tabTypes.includes(p.type))
        && (category === 'any' || p.category === category)
        && matchesPrice(p, price)
        && matchesQuery(p, q.trim()))
      return { results: sortProducts(list, sort), error: null }
    } catch (err) {
      return { results: [], error: err }
    }
  }, [config, type, category, price, q, sort])

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const current = Math.min(page, pages)
  const visible = results.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const goToPage = (n) => {
    setPaging({ key: filterKey, page: n })
    gridRef.current?.scrollIntoView({ block: 'start' })
  }

  // Chips for filters that are switched on. A filter left at its "any" value has no chip.
  const chips = [
    q.trim() && { key: 'q', label: `“${q.trim()}”`, clear: () => setParam('q', '') },
    category !== 'any' && { key: 'category', label: categoryTitle(category), clear: () => setParam('category', 'any', 'any') },
    price !== 'any' && { key: 'price', label: PRICES.find((o) => o.value === price).label, clear: () => setParam('price', 'any', 'any') },
  ].filter(Boolean)
  const filtered = chips.length > 0 || type !== 'all'
  const noun = config.noun[results.length === 1 ? 0 : 1]

  const showGate = siteAccess.enabled && viewer.siteAccess !== 'active'

  return (
    <div className="cat">
      <header className="pg-head">
        <div className="sg-container">
          <div className="pg-head-inner">
            <p className="sg-eyebrow">{config.eyebrow}</p>
            <h1 className="t-display-lg">{config.title}</h1>
            <p className="t-body-lg t-muted">{config.intro}</p>
          </div>
        </div>
      </header>

      <section className="cat-body">
        <div className="sg-container pg-stack">
          {scope === 'all' && (
            <div className="cat-tabs">
              <Tabs
                variant="pill"
                label="Product type"
                tabs={CATALOG_TABS.map(({ value, label }) => ({ value, label }))}
                value={type}
                onChange={(v) => setParam('type', v, 'all')}
              />
            </div>
          )}

          <form className="cat-filters" role="search" onSubmit={(e) => e.preventDefault()}>
            <TextField
              className="cat-search"
              label={scope === 'all' ? 'Search products' : 'Search programmes'}
              type="search"
              iconStart="search"
              placeholder="Try “recipes” or “breathwork”"
              value={q}
              onChange={(e) => setParam('q', e.target.value)}
            />
            <Select label="Category" options={CATEGORIES} value={category} onChange={(e) => setParam('category', e.target.value, 'any')} />
            <Select label="Price" options={PRICES} value={price} onChange={(e) => setParam('price', e.target.value, 'any')} />
            <Select label="Sort by" options={SORTS} value={sort} onChange={(e) => setParam('sort', e.target.value, 'popular')} />
          </form>

          {filtered && (
            <div className="cat-status">
              <p className="cat-count" aria-live="polite">
                {loading ? 'Finding matches…' : `${results.length} ${noun}`}
              </p>
              {chips.length > 0 && (
                <ul className="cat-chips" aria-label="Active filters">
                  {chips.map((c) => (
                    <li key={c.key}>
                      <button type="button" className="cat-chip" onClick={c.clear} aria-label={`Remove filter: ${c.label}`}>
                        {c.label}
                        <Icon name="x" size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="link" onClick={clearFilters}>Clear filters</Button>
            </div>
          )}

          {showGate && (
            <Notice tone="info" action={<Button variant="link" href="/site-access">What is site access?</Button>}>
              Buying from {school.name} needs Site access ($49 / year). It’s added at checkout. Free programmes and events don’t need it.
            </Notice>
          )}

          <div ref={gridRef} className="cat-results">
            {error ? (
              <Notice tone="danger" title={`We couldn’t load ${config.noun[1]} just now`} action={<Button variant="secondary" size="sm" onClick={() => window.location.reload()}>Try again</Button>}>
                Nothing has changed with your account. Refresh the page, or come back in a few minutes.
              </Notice>
            ) : loading ? (
              <div className="pg-grid" aria-busy="true" aria-label={`Loading ${config.noun[1]}`}>
                {Array.from({ length: Math.min(6, Math.max(3, visible.length)) }, (_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : results.length === 0 ? (
              <EmptyState
                icon="search"
                title="Nothing matches those filters"
                action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
              >
                Try a different category or price, or clear the filters to see every {config.noun[0]}.
              </EmptyState>
            ) : (
              <div className="pg-grid">
                {visible.map((p) => <ProductCard key={p.slug} {...cardProps(p, viewer)} />)}
              </div>
            )}
          </div>

          {!loading && !error && results.length > PAGE_SIZE && (
            <div className="cat-pages">
              <Pagination page={current} pages={pages} onChange={goToPage} />
            </div>
          )}
        </div>
      </section>

      {scope === 'courses' && (
        <Section tone="sage" width="narrow" align="center" title="Not sure where to start?"
          intro="Book a consultation and we’ll help you choose a programme that fits where you are right now.">
          <div className="cat-help">
            <Button variant="secondary" href={school.consultation.href}>{school.consultation.label}</Button>
          </div>
        </Section>
      )}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="cat-skel">
      <Skeleton className="cat-skel-media" height={null} radius="0" />
      <div className="cat-skel-body">
        <Skeleton width="70%" height={24} />
        <Skeleton width="100%" />
        <Skeleton width="85%" />
        <Skeleton width="40%" height={14} />
        <div className="cat-skel-foot">
          <Skeleton width={72} height={24} />
          <Skeleton width={110} height={14} />
        </div>
      </div>
    </div>
  )
}
