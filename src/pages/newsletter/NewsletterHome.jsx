// /newsletter/:slug — the newsletter's home: who writes it, the tiers, your subscription and the archive.
// Preview: ?as=visitor|student|member and ?tier=none|free|trial|paid|supporter|paused|ended|unsubscribed,
// ?state=error for the archive's error state.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import {
  Avatar, Badge, Button, Card, EmptyState, Icon, Notice, Pagination, PriceTag, Section, Skeleton, Tabs, TextField,
} from '@/design-system'
import NotFound from '@/pages/NotFound.jsx'
import { useViewer } from '@/app/viewer.jsx'
import { getProduct } from '@/lib/products.js'
import { getPractitioner } from '@/data/people.js'
import { altFor } from '@/data/media-credits.js'
import { getNewsletter, postsFor } from '@/data/newsletter.js'
import { getPlan } from '@/data/plans.js'
import { BADGE, canRead, checkoutHref, readerFor, upgradeLabel, withTier } from './reader.js'
import { PreviewSwitch, SubscribeForm, SubscriptionStatus } from './parts.jsx'
import './newsletter.css'

const PER_PAGE = 6
const FILTERS = [{ value: 'all', label: 'All' }, { value: 'free', label: 'Free' }, { value: 'paid', label: 'Paid' }]
const LOCK_LABEL = { subscribers: 'Subscribe to read', paid: 'Preview only', supporter: 'Supporters only', members: 'Members only' }
// Readers who've had a trial don't see the trial note.
const priceFor = (p, reader) => (p.trialDays && reader.trialUsed ? { ...p.price, note: undefined } : p.price)
const isFreePost = (p) => p.access === 'public' || p.access === 'subscribers'

export default function NewsletterHome() {
  const { pathname } = useLocation()
  return <Home key={pathname} />
}

function Home() {
  const { slug } = useParams()
  const { search } = useLocation()
  const { viewer, signedIn } = useViewer()
  const [resumed, setResumed] = useState(false)
  const [joined, setJoined] = useState(false)

  const newsletter = getNewsletter(slug)
  const product = getProduct(slug)
  if (!newsletter || !product || product.type !== 'newsletter') return <NotFound />

  const base = readerFor(newsletter, product, viewer, search)
  const reader = resumed && base.status === 'paused' ? { ...base, status: 'paid', paid: true } : base
  const author = getPractitioner(newsletter.author)

  return (
    <>
      <header className="pg-head nlp-head">
        <div className="sg-container nlp-head-grid">
          <div className="pg-stack-sm">
            <p className="sg-eyebrow">Newsletter</p>
            <h1 className="t-display-lg">{newsletter.name}</h1>
            <p className="t-body-lg t-muted">{newsletter.tagline}</p>
            <ul className="nlp-facts" aria-label="About this newsletter">
              <li><Icon name="mail" size={18} />{newsletter.cadence}</li>
              <li><Icon name="users" size={18} />{newsletter.subscribers}</li>
              <li><Icon name="book" size={18} />{product.newsletter.issues} letters · {newsletter.since}</li>
            </ul>
            <div className="nlp-byline">
              <Avatar src={author.photo} name={author.name} size="md" />
              <div>
                <p className="t-strong">Written by {author.name}</p>
                <p className="t-body-sm t-muted">{author.role}</p>
              </div>
            </div>
            {(reader.known || reader.plan) && reader.status !== 'none' && (
              <SubscriptionStatus newsletter={newsletter} product={product} reader={reader} onResume={() => setResumed(true)} primary />
            )}
            {resumed && <Notice tone="success" title="Your paid subscription is back on">Paid posts are open again. Your next payment is on {newsletter.dates.renews}.</Notice>}
            {reader.plan && !reader.paid && (
              joined ? (
                <Notice tone="success" title="Check your inbox to confirm">We sent a link to {reader.email}. Your membership opens the posts; the email needs your confirmation.</Notice>
              ) : (
                <div><Button variant="secondary" size="sm" iconStart="mail" onClick={() => setJoined(true)}>Get the paid edition by email too</Button></div>
              )
            )}
          </div>
          <img className="nlp-head-img" src={product.image} alt={altFor(product.image)} width="640" height="800" />
        </div>
      </header>

      <Tiers newsletter={newsletter} product={product} reader={reader} />

      <Archive newsletter={newsletter} reader={reader} search={search} />

      <div className="sg-container nlp-preview-wrap">
        <PreviewSwitch signedIn={signedIn} />
      </div>
    </>
  )
}

/* Tiers: Free · Paid monthly · Paid yearly · Founding supporter */
function Tiers({ newsletter, product, reader }) {
  const tierOf = (id) => newsletter.tiers.find((t) => t.id === id)
  const free = tierOf('free')
  const cards = [
    { key: 'free', tier: free, price: null },
    ...product.prices.filter((p) => p.tier).map((p) => ({ key: p.id, tier: tierOf(p.tier), price: p })),
  ]
  const canSubscribe = ['visitor', 'none', 'unsubscribed'].includes(reader.status)
  // One primary per view: Subscribe for new readers, the monthly upgrade for free and lapsed readers.
  const primaryUpgrade = !canSubscribe && ['free', 'ended'].includes(reader.status) && !reader.plan ? 'monthly' : null
  const current = reader.status === 'supporter' ? 'supporter' : ['trial', 'paid'].includes(reader.status) ? 'monthly' : null

  const action = ({ key, price }) => {
    if (!price) {
      if (canSubscribe) {
        return <SubscribeForm newsletter={newsletter} reader={reader} label={reader.status === 'unsubscribed' ? 'Subscribe again' : 'Subscribe free'} compact />
      }
      return reader.subscribed
        ? <p className="nlp-current"><Icon name="check-circle" size={18} />{reader.paid ? 'Included in your tier' : 'Your tier'}</p>
        : null
    }
    if (key === current) return <p className="nlp-current"><Icon name="check-circle" size={18} />{reader.status === 'trial' ? 'Your tier · on trial' : 'Your tier'}</p>
    if (reader.supporter && price.tier === 'paid') return <p className="nlp-current"><Icon name="check-circle" size={18} />Included in your tier</p>
    if (reader.plan && price.tier === 'paid') return <p className="nlp-current"><Icon name="users" size={18} />Included in your {reader.plan.name} membership</p>
    const label = current && price.tier === 'paid' ? `Switch to ${price.interval === 'year' ? 'yearly' : 'monthly'}`
      : upgradeLabel(price, reader, 'Upgrade')
    return (
      <Button block variant={key === primaryUpgrade ? 'primary' : 'secondary'} href={checkoutHref(product, price.id, `newsletter:${newsletter.slug}`)}>
        {label}
      </Button>
    )
  }

  return (
    <Section tone="sage" eyebrow="Subscribe" title="Choose how you read" intro="Start with the free letter. Upgrade for the full letter, the whole archive and the comments. Change or cancel any time.">
      <div className="nlp-tiers">
        {cards.map((card) => (
          <Card key={card.key} as="article" padding="lg" className={'nlp-tier' + (card.key === 'yearly' ? ' is-featured' : '')}>
            <div className="nlp-tier-head">
              <h3 className="t-heading-3">{card.price ? card.price.label : card.tier.name}</h3>
              {card.key === 'yearly' && <Badge tone="accent">Best value</Badge>}
            </div>
            <PriceTag {...(card.price ? priceFor(card.price, reader) : { amount: 0 })} />
            <p className="t-body-sm t-muted">{card.tier.description}</p>
            <ul className="pg-ticks nlp-perks">
              {card.tier.perks.map((perk) => (
                <li key={perk}><Icon name="check" size={18} /><span className="t-body-sm">{perk}</span></li>
              ))}
            </ul>
            <div className="nlp-tier-action">{action(card)}</div>
          </Card>
        ))}
      </div>
      {newsletter.membershipPlans.length > 0 && !reader.plan && (
        <p className="t-body-sm t-muted nlp-member-line">
          The paid edition is also included in the {newsletter.membershipPlans.map((id) => getPlan(id)?.name).filter(Boolean).join(' and ')} memberships. <a className="nlp-link" href="/memberships">Compare memberships</a>
        </p>
      )}
    </Section>
  )
}

/* Archive: filter, search, pagination, loading, empty and error states. */
function Archive({ newsletter, reader, search }) {
  const [params] = useSearchParams()
  const failed = params.get('state') === 'error'
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(params.get('state') === 'loading')
  const timer = useRef(null)
  const top = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const refresh = () => {
    setLoading(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setLoading(false), 350)
  }

  const q = query.trim().toLowerCase()
  const results = useMemo(() => postsFor(newsletter.slug).filter((p) => {
    if (filter === 'free' && !isFreePost(p)) return false
    if (filter === 'paid' && isFreePost(p)) return false
    return !q || [p.title, p.excerpt, `issue ${p.issue}`].join(' ').toLowerCase().includes(q)
  }), [newsletter.slug, filter, q])
  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE))
  const current = Math.min(page, pages)
  const shown = results.slice((current - 1) * PER_PAGE, current * PER_PAGE)

  const changeFilter = (v) => { setFilter(v); setPage(1); refresh() }
  const changeQuery = (v) => { setQuery(v); setPage(1); refresh() }
  const clear = () => { setFilter('all'); setQuery(''); setPage(1); refresh() }
  const changePage = (n) => { setPage(n); top.current?.scrollIntoView({ block: 'start' }) }

  return (
    <Section title="The archive" intro="Every letter we’ve sent, newest first. Free letters are open to everyone; paid letters open up to the break.">
      {failed ? (
        <Notice tone="danger" title="We couldn’t load the archive" action={<Button variant="secondary" size="sm" href={`/newsletter/${newsletter.slug}`}>Try again</Button>}>
          Something went wrong on our side. Try again in a moment.
        </Notice>
      ) : (
        <div className="pg-stack">
          <div className="nlp-controls" ref={top}>
            <Tabs variant="pill" label="Filter letters" tabs={FILTERS} value={filter} onChange={changeFilter} />
            <TextField
              type="search" iconStart="search" placeholder="Search the archive" aria-label="Search the archive"
              value={query} onChange={(e) => changeQuery(e.target.value)} className="nlp-search"
            />
          </div>
          <p className="nlp-sr" role="status">
            {loading ? 'Loading letters' : `${results.length} ${results.length === 1 ? 'letter' : 'letters'} found`}
          </p>
          {loading ? (
            <ul className="nlp-list" aria-busy="true" aria-label="Loading letters">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="nlp-item">
                  <Skeleton width={120} height={14} />
                  <Skeleton width="70%" height={26} />
                  <Skeleton width="100%" height={14} />
                </li>
              ))}
            </ul>
          ) : shown.length === 0 ? (
            <EmptyState icon="search" title="No letters found" action={<Button variant="secondary" onClick={clear}>Clear filters</Button>}>
              {q ? `Nothing matches “${query.trim()}”. Try another word, or browse every letter.` : 'There are no letters here yet.'}
            </EmptyState>
          ) : (
            <ul className="nlp-list">
              {shown.map((post) => <ArchiveItem key={post.slug} post={post} reader={reader} search={search} />)}
            </ul>
          )}
          {!loading && pages > 1 && (
            <div className="nlp-pagination"><Pagination page={current} pages={pages} onChange={changePage} /></div>
          )}
        </div>
      )}
    </Section>
  )
}

function ArchiveItem({ post, reader, search }) {
  const badge = BADGE[post.access]
  const locked = !canRead(post, reader)
  return (
    <li className="nlp-item">
      <p className="t-body-sm t-muted nlp-item-meta">
        <span>{post.date}</span><span aria-hidden="true">·</span><span>Issue {post.issue}</span><span aria-hidden="true">·</span><span>{post.readTime}</span>
      </p>
      <h3 className="t-heading-3 nlp-item-title">
        <a className="nlp-stretch" href={withTier(`/newsletter/${post.newsletter}/${post.slug}`, search)}>{post.title}</a>
      </h3>
      <p className="t-body-sm t-muted">{post.excerpt}</p>
      <div className="nlp-item-badges">
        <Badge tone={badge.tone}>{badge.label}</Badge>
        {locked && <span className="nlp-lock"><Icon name="lock" size={16} />{LOCK_LABEL[post.access]}</span>}
      </div>
    </li>
  )
}
