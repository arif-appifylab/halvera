import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Avatar, Badge, Button, Card, Checkbox, EmptyState, Icon, Notice, Pagination, Section, Skeleton, Tabs, TextField,
} from '@/design-system'
import { posts, postCategories, categoryLabel, postHref } from '@/data/posts.js'
import { getPractitioner } from '@/data/people.js'
import { altFor } from '@/data/media-credits.js'
import './blog.css'

const PER_PAGE = 6
const TABS = [{ value: 'all', label: 'All' }, ...postCategories]
const CATEGORY_ICON = { 'gut-health': 'leaf', 'mens-health': 'heart', sleep: 'clock', 'mindful-eating': 'sparkle', recipes: 'book' }

// The post's cover image, or a category icon when the post has none. Cards and the featured post
// sit next to the post title, so the image is decorative there; the post page passes `describe`.
export function PostMedia({ post, className = '', describe = false, eager = false }) {
  if (post.image) {
    return (
      <img
        className={'pg-media blog-media blog-media-img ' + className}
        src={post.image}
        alt={describe ? altFor(post.image) : ''}
        width="1200"
        height="675"
        loading={eager ? undefined : 'lazy'}
        decoding="async"
      />
    )
  }
  return (
    <span className={'pg-media blog-media ' + className} aria-hidden="true">
      <Icon name={CATEGORY_ICON[post.category] || 'leaf'} size={32} />
    </span>
  )
}

export function PostCard({ post }) {
  const author = getPractitioner(post.author)
  return (
    <Card as="article" interactive className="blog-card">
      <PostMedia post={post} />
      <div className="blog-card-badges">
        <Badge>{categoryLabel(post.category)}</Badge>
        {post.access === 'members' && <Badge tone="accent" icon="lock">Members</Badge>}
      </div>
      <h3 className="t-heading-3 blog-card-title"><a href={postHref(post)} className="blog-stretch">{post.title}</a></h3>
      <p className="t-body-sm t-muted">{post.excerpt}</p>
      <p className="t-caption t-muted blog-card-meta">
        <span>{author.name}</span>
        <span aria-hidden="true">·</span>
        <span>{post.readTime}</span>
      </p>
    </Card>
  )
}

function FeaturedPost({ post }) {
  const author = getPractitioner(post.author)
  return (
    <Card as="article" padding="lg" className="blog-featured">
      <PostMedia post={post} className="blog-featured-media" />
      <div className="pg-stack-sm blog-featured-body">
        <div className="blog-card-badges">
          <Badge tone="primary">Featured</Badge>
          <Badge>{categoryLabel(post.category)}</Badge>
        </div>
        <h2 className="t-heading-2"><a href={postHref(post)} className="blog-title-link">{post.title}</a></h2>
        <p className="t-body-lg t-muted">{post.excerpt}</p>
        <div className="blog-byline">
          <Avatar src={author.photo} name={author.name} size="md" />
          <div>
            <p className="t-strong">{author.name}</p>
            <p className="t-body-sm t-muted">{post.date} · {post.readTime}</p>
          </div>
        </div>
        <div className="blog-featured-action">
          <Button variant="secondary" href={postHref(post)} iconEnd="arrow-right">Read the article</Button>
        </div>
      </div>
    </Card>
  )
}

function SkeletonGrid() {
  return (
    <div className="pg-grid" aria-busy="true" aria-label="Loading articles">
      {Array.from({ length: PER_PAGE }, (_, i) => (
        <Card key={i} className="blog-card">
          <Skeleton height="auto" radius="var(--radius-xl)" className="blog-skel-media" />
          <Skeleton width={96} height={22} radius="var(--radius-pill)" />
          <Skeleton width="85%" height={24} />
          <Skeleton width="100%" height={14} />
          <Skeleton width="70%" height={14} />
        </Card>
      ))}
    </div>
  )
}

function NewsletterBand() {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter an email address like name@example.com.'
    if (!consent) next.consent = 'Tick the box so we can email you.'
    setErrors(next)
    if (!Object.keys(next).length) setSent(true)
  }

  return (
    <Section tone="clay" width="narrow" eyebrow="Newsletter" title="Get new posts by email" intro="One calm email when a new article goes up, usually twice a month. Recipes, sleep tips and what we are learning in clinic.">
      {sent ? (
        <Notice tone="success" title="Check your inbox">
          We sent a link to {email.trim()}. Open it to confirm your subscription and your first email will follow.
        </Notice>
      ) : (
        <form className="blog-nl" onSubmit={submit} noValidate>
          <div className="blog-nl-row">
            <TextField
              label="Email address" type="email" autoComplete="email" placeholder="you@example.com" iconStart="mail"
              value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} className="blog-nl-field"
            />
            <Button type="submit">Subscribe</Button>
          </div>
          <Checkbox
            label="Send me new posts and occasional news from Halvera"
            description="Unsubscribe at any time. We never share your email."
            checked={consent} onChange={(e) => setConsent(e.target.checked)} error={errors.consent}
          />
        </form>
      )}
    </Section>
  )
}

export default function Blog() {
  const [params] = useSearchParams()
  const failed = params.get('state') === 'error'
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)
  const listTop = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  // Brief loading state while the list "refetches" for a new tab or search.
  const refresh = () => {
    setLoading(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setLoading(false), 400)
  }

  const featured = posts.find((p) => p.featured)
  const q = query.trim().toLowerCase()
  const filtering = tab !== 'all' || q !== ''

  const results = useMemo(() => posts.filter((p) => {
    if (tab !== 'all' && p.category !== tab) return false
    if (!q) return true
    return [p.title, p.excerpt, categoryLabel(p.category), getPractitioner(p.author).name].join(' ').toLowerCase().includes(q)
  }), [tab, q])

  // The featured post leads the unfiltered view, so it isn't repeated in the grid.
  const list = filtering ? results : results.filter((p) => p !== featured)
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE))
  const current = Math.min(page, pages)
  const shown = list.slice((current - 1) * PER_PAGE, current * PER_PAGE)

  const changeTab = (value) => { setTab(value); setPage(1); refresh() }
  const changeQuery = (value) => { setQuery(value); setPage(1); refresh() }
  const clearFilters = () => { setTab('all'); setQuery(''); setPage(1); refresh() }
  const changePage = (n) => {
    setPage(n)
    listTop.current?.scrollIntoView({ block: 'start' })
  }

  const emptyText = q
    ? `Nothing${tab !== 'all' ? ` in ${categoryLabel(tab)}` : ''} matches “${query.trim()}”. Try another word, or browse every article.`
    : 'There are no articles here yet. Browse every article instead.'

  return (
    <>
      <header className="pg-head">
        <div className="sg-container">
          <div className="pg-head-inner">
            <p className="sg-eyebrow">Blog</p>
            <h1 className="t-display-lg">Notes from the clinic</h1>
            <p className="t-body-lg t-muted">
              Practical, gentle writing on gut health, men’s health, sleep and eating well, from our practitioners. No quick fixes, just ideas you can try this week.
            </p>
          </div>
        </div>
      </header>

      <Section className="blog-list-section">
        <div className="pg-stack-lg">
          {failed ? (
            <Notice tone="danger" title="We couldn’t load the articles" action={<Button variant="secondary" size="sm" href="/blog">Try again</Button>}>
              Something went wrong on our side. Try again in a moment.
            </Notice>
          ) : (
            <>
              {featured && !filtering && <FeaturedPost post={featured} />}

              <div className="blog-controls" ref={listTop}>
                <Tabs variant="pill" label="Article categories" tabs={TABS} value={tab} onChange={changeTab} />
                <TextField
                  type="search" iconStart="search" placeholder="Search articles" aria-label="Search articles"
                  value={query} onChange={(e) => changeQuery(e.target.value)} className="blog-search"
                />
              </div>

              <p className="blog-sr" role="status">
                {loading ? 'Loading articles' : `${list.length} ${list.length === 1 ? 'article' : 'articles'} found`}
              </p>
              <div>
                {loading ? <SkeletonGrid /> : shown.length === 0 ? (
                  <EmptyState icon="search" title="No articles found" action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}>
                    {emptyText}
                  </EmptyState>
                ) : (
                  <div className="pg-grid">
                    {shown.map((post) => <PostCard key={post.slug} post={post} />)}
                  </div>
                )}
              </div>

              {!loading && pages > 1 && (
                <div className="blog-pagination">
                  <Pagination page={current} pages={pages} onChange={changePage} />
                </div>
              )}
            </>
          )}
        </div>
      </Section>

      <NewsletterBand />
    </>
  )
}
