// /newsletter/:slug/:postSlug — one letter in the web archive. Free posts are open to everyone;
// gated posts show everything before the checkout break, then the gate for the reader's state.
// Preview: ?as=visitor|student|member and ?tier=none|free|trial|paid|supporter|paused|ended|unsubscribed.
import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { Avatar, Badge, Button, Card, Icon, Notice, TextField } from '@/design-system'
import AccessGate from '@/components/AccessGate.jsx'
import { PlanPickerModal } from '@/components/PlanPicker.jsx'
import NotFound from '@/pages/NotFound.jsx'
import { useViewer } from '@/app/viewer.jsx'
import { getProduct } from '@/lib/products.js'
import { getPractitioner } from '@/data/people.js'
import { getNewsletter, getNewsletterPost, postsFor } from '@/data/newsletter.js'
import { BADGE, canComment, canRead, isPaidPost, readerFor, withTier } from './reader.js'
import { PreviewSwitch, SubscribeForm, TierPicker } from './parts.jsx'
import './newsletter.css'

function Block({ block }) {
  switch (block.type) {
    case 'h2': return <h2>{block.text}</h2>
    case 'ul': return <ul>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>
    case 'quote': return <blockquote><p>{block.text}</p></blockquote>
    default: return <p>{block.text}</p>
  }
}

export default function NewsletterPost() {
  const { pathname } = useLocation()
  return <Post key={pathname} />
}

function Post() {
  const { slug, postSlug } = useParams()
  const { search } = useLocation()
  const { viewer, signedIn } = useViewer()
  const [resumed, setResumed] = useState(false)

  const newsletter = getNewsletter(slug)
  const product = getProduct(slug)
  // The old content address (/newsletter/:slug/open) is the newsletter home now.
  if (postSlug === 'open' && newsletter) return <Navigate to={`/newsletter/${slug}${search}`} replace />
  const post = newsletter && getNewsletterPost(slug, postSlug)
  if (!newsletter || !product || !post) return <NotFound />

  const base = readerFor(newsletter, product, viewer, search)
  const reader = resumed && base.status === 'paused' ? { ...base, status: 'paid', paid: true } : base
  const author = getPractitioner(post.author)
  const open = canRead(post, reader)
  const blocks = open || post.breakAt == null ? post.body : post.body.slice(0, post.breakAt)
  const badge = BADGE[post.access]
  const home = withTier(`/newsletter/${slug}`, search)

  const list = postsFor(slug)
  const at = list.indexOf(post)
  const newer = list[at - 1]
  const older = list[at + 1]

  return (
    <>
      <div className="sg-container nlp-post">
        <article className="nlp-article" aria-labelledby="nlp-title">
          <header className="pg-stack-sm">
            <a className="nlp-back" href={home}><Icon name="arrow-left" size={18} />{newsletter.name}</a>
            <div className="nlp-item-badges">
              <Badge tone={badge.tone} icon={open ? undefined : 'lock'}>{badge.label}</Badge>
              <span className="t-body-sm t-muted">Issue {post.issue}</span>
            </div>
            <h1 id="nlp-title" className="t-heading-1">{post.title}</h1>
            <div className="nlp-byline">
              <Avatar src={author.photo} name={author.name} size="md" />
              <div>
                <p className="t-strong">{author.name}</p>
                <p className="t-body-sm t-muted">{post.date} · {post.readTime}</p>
              </div>
            </div>
          </header>

          <div className={'pg-prose nlp-prose' + (open ? '' : ' is-preview')}>
            {blocks.map((b, i) => <Block key={i} block={b} />)}
          </div>

          {!open && (
            <Gate
              post={post} newsletter={newsletter} product={product} reader={reader} viewer={viewer}
              onResume={() => setResumed(true)}
            />
          )}
          {resumed && <Notice tone="success" title="Your paid subscription is back on">The rest of this letter is open below.</Notice>}

          <Actions post={post} reader={reader} open={open} />

          <Comments post={post} newsletter={newsletter} reader={reader} open={open} home={home} authorName={author.name} />

          <nav className="nlp-pager" aria-label="More letters">
            {newer ? (
              <a className="nlp-pager-link" href={withTier(`/newsletter/${slug}/${newer.slug}`, search)}>
                <span className="t-body-sm t-muted"><Icon name="arrow-left" size={16} />Newer</span>
                <span className="t-strong">{newer.title}</span>
              </a>
            ) : <span />}
            {older && (
              <a className="nlp-pager-link is-end" href={withTier(`/newsletter/${slug}/${older.slug}`, search)}>
                <span className="t-body-sm t-muted">Older<Icon name="arrow-right" size={16} /></span>
                <span className="t-strong">{older.title}</span>
              </a>
            )}
          </nav>

        </article>
        <PreviewSwitch signedIn={signedIn} />
      </div>
    </>
  )
}

/* The checkout break: what each reader sees in place of the rest of the post. */
function Gate({ post, newsletter, product, reader, viewer, onResume }) {
  const [plansOpen, setPlansOpen] = useState(false)
  const forRef = `newsletter:${newsletter.slug}:${post.slug}`
  const fresh = ['visitor', 'none', 'unsubscribed'].includes(reader.status)
  const plans = newsletter.membershipPlans
  const memberProduct = { title: post.title, plans, prices: [] }

  if (post.access === 'members') {
    const state = viewer.plan ? 'upgrade' : 'membership'
    return <div className="nlp-gate-wrap"><AccessGate state={state} product={memberProduct} viewer={viewer} forRef={forRef} compact /></div>
  }

  let title, body, content, more
  if (post.access === 'subscribers') {
    title = reader.status === 'unsubscribed' ? 'Subscribe again to keep reading' : 'Subscribe free to keep reading'
    body = `The rest of this letter is for subscribers. It’s free: ${newsletter.name} arrives ${newsletter.cadence.replace(/^Every/, 'every')}.`
    content = <SubscribeForm newsletter={newsletter} reader={reader} label={reader.status === 'unsubscribed' ? 'Subscribe again' : 'Subscribe free'} />
  } else if (post.access === 'supporter') {
    title = 'This letter is for founding supporters'
    body = reader.paid
      ? 'You’re on the paid edition. Become a founding supporter to read the supporters’ letters, along with everything you have now.'
      : 'Founding supporters get every paid post plus a quarterly letter from behind the scenes.'
    content = <TierPicker product={product} newsletter={newsletter} reader={reader} tier="supporter" forRef={forRef} legend="Your new tier" />
  } else if (reader.status === 'paused') {
    title = `Your paid subscription is paused until ${newsletter.dates.pausedUntil}`
    body = 'Resume it now to read the rest of this letter and the whole archive. We charge from today.'
    content = (
      <div className="pg-row">
        <Button onClick={onResume}>Resume my subscription</Button>
        <Button variant="ghost" href="/student/dashboard/profile/payments">Manage subscription</Button>
      </div>
    )
  } else {
    title = reader.status === 'ended' ? `Your paid subscription ended on ${newsletter.dates.ended}`
      : reader.status === 'free' ? 'Upgrade to read the rest' : 'Keep reading with the paid edition'
    body = reader.status === 'ended' ? 'Restart it to read the rest of this letter. Every paid post opens again straight after checkout.'
      : reader.status === 'free' ? 'You’re on the free letter. Upgrade and the rest of this letter, and every paid post in the archive, opens straight after checkout.'
      : 'The rest of this letter is for paid subscribers. Pick a tier and it opens straight after checkout, along with the whole archive.'
    content = <TierPicker product={product} newsletter={newsletter} reader={reader} forRef={forRef} legend="Choose a paid tier" />
    if (fresh) {
      more = (
        <div className="nlp-gate-free">
          <p className="t-heading-4">Not ready yet? Get the free letter</p>
          <SubscribeForm newsletter={newsletter} reader={reader} variant="secondary" label={reader.status === 'unsubscribed' ? 'Subscribe again' : 'Subscribe free'} compact />
        </div>
      )
    }
  }

  return (
    <Card tone="sage" padding="lg" className="nlp-gate" role="region" aria-labelledby="nlp-gate-title">
      <div className="pg-stack-sm">
        <span className="nlp-gate-icon" aria-hidden="true"><Icon name="lock" size={22} /></span>
        <h2 id="nlp-gate-title" className="t-heading-3">{title}</h2>
        <p className="t-body-sm">{body}</p>
      </div>
      {content}
      {post.access === 'paid' && plans.length > 0 && !reader.plan && (
        <p className="t-body-sm t-muted nlp-center">
          Also included in a membership.{' '}
          <button type="button" className="nlp-link nlp-linkbtn" onClick={() => setPlansOpen(true)}>See memberships</button>
        </p>
      )}
      {more}
      {!reader.known && (
        <p className="t-body-sm t-muted nlp-center">
          Already subscribed? <a className="nlp-link" href={'/login?next=' + encodeURIComponent(window.location.pathname)}>Log in</a>
        </p>
      )}
      <PlanPickerModal open={plansOpen} onClose={() => setPlansOpen(false)} product={memberProduct} forRef={forRef} />
    </Card>
  )
}

/* Like and share. */
function Actions({ post, reader, open }) {
  const [liked, setLiked] = useState(false)
  const [copied, setCopied] = useState(null)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const count = post.likes + (liked ? 1 : 0)
  const share = async () => {
    const url = window.location.origin + window.location.pathname
    try { await navigator.clipboard.writeText(url); setCopied('Link copied') } catch { setCopied('Copy the address from your browser bar to share it') }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(null), 3000)
  }
  return (
    <div className="nlp-actions">
      {reader.known && open ? (
        <button type="button" className={'nlp-like' + (liked ? ' is-on' : '')} aria-pressed={liked} onClick={() => setLiked(!liked)}>
          <Icon name="heart" size={18} /><span>{count} {count === 1 ? 'like' : 'likes'}</span>
        </button>
      ) : (
        <span className="nlp-like is-static"><Icon name="heart" size={18} /><span>{count} likes</span></span>
      )}
      <Button variant="ghost" size="sm" iconStart="globe" onClick={share}>Copy link</Button>
      <span className="t-body-sm t-muted" role="status">{copied}</span>
    </div>
  )
}

/* Comments. Paid posts: only readers with access can comment. */
function Comments({ post, newsletter, reader, open, home, authorName }) {
  const [items, setItems] = useState(post.comments)
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  if (!newsletter.comments.on) return null
  const allowed = canComment(post, reader, newsletter)
  const paidPost = isPaidPost(post)
  const visible = open || !paidPost

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) { setError('Write a comment first.'); return }
    setItems([...items, { id: 'new' + items.length, name: reader.name, when: 'Just now', text: text.trim() }])
    setText('')
    setError(null)
  }

  let note = null
  if (!allowed) {
    if (paidPost) {
      const who = post.access === 'members' ? 'Members' : post.access === 'supporter' ? 'Founding supporters' : 'Paid subscribers'
      note = (
        <Notice tone="neutral" title={`${who} can join the conversation`}>
          {post.access === 'members' ? 'Join a membership that includes the paid edition to read the comments and add your own.'
            : reader.status === 'paused' ? 'Resume your paid subscription to read the comments and add your own.'
            : reader.known ? 'Upgrade to read the comments and add your own.' : 'Subscribe to the paid edition to read the comments and add your own.'}
        </Notice>
      )
    } else if (!reader.known) {
      note = (
        <Notice tone="neutral" title="Subscribers can join the conversation" action={<Button variant="secondary" size="sm" href={'/login?next=' + encodeURIComponent(window.location.pathname)}>Log in to comment</Button>}>
          Log in, or subscribe free from the <a className="nlp-link" href={home}>newsletter page</a>.
        </Notice>
      )
    } else {
      note = <Notice tone="neutral" title="Subscribers can join the conversation">Subscribe free from the <a className="nlp-link" href={home}>newsletter page</a> to comment.</Notice>
    }
  }

  return (
    <section className="nlp-comments" aria-labelledby="nlp-comments-title">
      <h2 id="nlp-comments-title" className="t-heading-3">
        {items.length === 0 ? 'Comments' : items.length === 1 ? '1 comment' : `${items.length} comments`}
      </h2>
      {note}
      {allowed && (
        <form className="nlp-form" onSubmit={submit} noValidate>
          <TextField label="Add a comment" multiline rows={3} value={text} onChange={(e) => setText(e.target.value)} error={error} hint="Be kind. Comments are visible to other subscribers." />
          <div><Button type="submit" variant={open ? 'primary' : 'secondary'}>Post comment</Button></div>
        </form>
      )}
      {visible && (items.length === 0 ? (
        <p className="t-body-sm t-muted">{allowed ? 'No comments yet. Start the conversation.' : 'No comments yet.'}</p>
      ) : (
        <ul className="nlp-comment-list">
          {items.map((c) => (
            <li key={c.id} className="nlp-comment">
              <Avatar name={c.author ? authorName : c.name} size="sm" />
              <div className="pg-stack-sm nlp-comment-body">
                <p className="nlp-comment-head">
                  <span className="t-strong">{c.author ? authorName : c.name}</span>
                  {c.author && <Badge tone="primary">Author</Badge>}
                  <span className="t-body-sm t-muted">{c.when}</span>
                </p>
                <p>{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      ))}
    </section>
  )
}
