import { useEffect, useState } from 'react'
import BundleHome from '@/components/course/BundleHome.jsx'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import {
  cx, Section, Card, Avatar, Badge, Button, TextField, EmptyState,
  Stepper, StateNotice, Notice,
} from '@/design-system'
import LibraryPlayer from '@/components/media-library/LibraryPlayer.jsx'
import { LibraryClosed } from '@/components/media-library/LibraryNotices.jsx'
import { libraryClosed, libraryIntro } from '@/components/media-library/schedule.js'
import AccessGate from '@/components/AccessGate.jsx'
import NotFound from '@/pages/NotFound.jsx'
import { useViewer } from '@/app/viewer.jsx'
import {
  getProduct, ownsProduct, accessRequestFor, productHref, ROUTE_FOR, TYPE_LABEL,
} from '@/lib/products.js'
import { contentAccess } from '@/lib/access.js'
import { progress } from '@/data/account.js'
import { getPractitioner } from '@/data/people.js'
import { communityPosts, coachingSteps, unavailableCopy } from '@/data/learn.js'
import EventTicket from '@/components/event/EventTicket.jsx'
import { holdsTicket } from '@/components/event/useRegistration.js'
import './product-access.css'

const INTRO = {
  community: 'Share how your week is going, ask a question or cheer someone on. Our practitioners drop in every week.',
  newsletter: 'A new letter arrives every Sunday morning. Here are the latest issues.',
  coaching: 'You’re in. Here’s what happens next.',
  bundle: 'Everything in this bundle is yours. Open each one below.',
}

// Open pages are content, not a place in the site tree: no breadcrumb trail. Owners get one short link
// back to where they came from (My programmes); gated screens carry their own next steps.
const MY_PROGRAMMES = '/student/dashboard/profile/enrollments'

export default function ProductAccess() {
  const { pathname } = useLocation()
  return <AccessPage key={pathname} />
}

function AccessPage() {
  const { slug } = useParams()
  const { pathname } = useLocation()
  const { viewer } = useViewer()
  const [unlocked, setUnlocked] = useState(false)

  const product = getProduct(slug)
  if (!product || ROUTE_FOR[product.type] !== pathname.split('/')[1]) return <NotFound />

  const access = contentAccess(product, viewer, {
    owned: ownsProduct(product, viewer) || holdsTicket(product, viewer),
    requested: !!accessRequestFor(product, viewer),
  })
  const owned = ownsProduct(product, viewer)
  const state = access.state === 'password' && unlocked ? 'open' : access.state

  // A media library past its expiration date is closed to anyone who hadn't joined.
  if (product.type === 'media-library' && libraryClosed(product) && !owned) {
    return (
      <div className="sg-container pa-gated">
        <LibraryClosed product={product} />
      </div>
    )
  }

  if (state !== 'open') {
    const copy = unavailableCopy[product.availability] || unavailableCopy['sales-ended']
    return (
      <div className="sg-container pa-gated">
        {state === 'unavailable' ? (
          <StateNotice
            title={product.title}
            reason={copy.reason}
            detail={copy.detail}
            actions={<><Button href="/courses">Explore programmes</Button><Button variant="secondary" href={productHref(product)}>See details</Button></>}
          />
        ) : (
          <AccessGate state={state} product={product} viewer={viewer} onUnlock={() => setUnlocked(true)} />
        )}
      </div>
    )
  }

  if (product.type === 'course' || product.type === 'cohort') {
    const first = product.curriculum?.[0]?.lessons[0]
    const lessonId = progress[product.slug]?.next || first?.id
    if (lessonId) return <Navigate replace to={`/course/${product.slug}/learn/${lessonId}`} />
    return (
      <div className="sg-container pa-gated">
        <EmptyState icon="book" title="Lessons are on their way" action={<Button variant="secondary" href={MY_PROGRAMMES}>Back to My programmes</Button>}>
          We’ll email you as soon as the first lesson of {product.title} opens.
        </EmptyState>
      </div>
    )
  }

  const Content = CONTENT[product.type]

  return (
    <>
      <div className="sg-container pg-head">
        <div className="pg-head-inner">
            <p className="sg-eyebrow">{TYPE_LABEL[product.type]}</p>
          <h1 className="t-heading-1">{product.title}</h1>
          {(INTRO[product.type] || (product.type === 'media-library' && libraryIntro(product))) && (
            <p className="t-body-lg t-muted">{INTRO[product.type] || libraryIntro(product)}</p>
          )}
        </div>
      </div>
      <Section tone="sunken">
        {Content ? <Content product={product} viewer={viewer} /> : null}
      </Section>
    </>
  )
}

/* Community home */
// The community lives on EzyCommunity: members who reach this page are sent straight there.
function CommunityRedirect({ product }) {
  useEffect(() => { window.location.assign(product.externalUrl) }, [product.externalUrl])
  return (
    <Notice tone="info" title={`Opening ${product.title}`} action={<Button size="sm" href={product.externalUrl}>Open the community</Button>}>
      The community opens in EzyCommunity. If nothing happens, use the button.
    </Notice>
  )
}

function Community({ product, viewer }) {
  const spaces = product.community?.spaces || []
  const [space, setSpace] = useState('all')
  const [posts, setPosts] = useState(communityPosts)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(null)

  const shown = space === 'all' ? posts : posts.filter((p) => p.space === space)
  const postTo = space === 'all' ? spaces[0] : space

  const submit = (e) => {
    e.preventDefault()
    if (!draft.trim()) { setError('Write something before you post.'); return }
    setError(null)
    setPosts((list) => [{ id: 'new-' + list.length, author: viewer.name || 'You', space: postTo, time: 'Just now', text: draft.trim(), replies: 0 }, ...list])
    setDraft('')
  }

  return (
    <div className="pa-community">
      <nav className="pa-spaces" aria-label="Spaces">
        <p className="pa-spaces-title">Spaces</p>
        <ul>
          {[{ value: 'all', label: 'All posts' }, ...spaces.map((s) => ({ value: s, label: s }))].map((s) => (
            <li key={s.value}>
              <button
                type="button"
                className={cx('pa-space', space === s.value && 'is-current')}
                aria-current={space === s.value ? 'true' : undefined}
                onClick={() => setSpace(s.value)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
        <p className="t-body-sm t-muted">{product.community?.members} members. Be kind.</p>
      </nav>

      <div className="pg-stack">
        <Card padding="lg">
          <form className="pg-stack-sm" onSubmit={submit}>
            <TextField
              label="Write a post"
              multiline
              rows={3}
              placeholder="Share a win, ask a question…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              hint={`Posting in ${postTo}`}
              error={error}
            />
            <div className="pa-post-actions"><Button type="submit">Post</Button></div>
          </form>
        </Card>

        {shown.length === 0 ? (
          <EmptyState icon="users" title="No posts here yet">Start the conversation in {space}. Someone is usually around to reply.</EmptyState>
        ) : shown.map((p) => (
          <Card as="article" key={p.id} padding="lg" className="pa-post">
            <header className="pa-post-head">
              <Avatar name={p.author} size="sm" />
              <div className="pa-post-who">
                <span className="pg-row pa-post-name">
                  <span className="t-strong">{p.author}</span>
                  {p.practitioner && <Badge tone="primary">Practitioner</Badge>}
                </span>
                <span className="t-body-sm t-muted">{p.time} · {p.space}</span>
              </div>
            </header>
            <p>{p.text}</p>
            <p className="t-body-sm t-muted">{p.replies === 0 ? 'No replies yet' : p.replies === 1 ? '1 reply' : `${p.replies} replies`}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* Media library: src/components/media-library/LibraryPlayer.jsx */

/* Newsletter: it has its own pages (src/pages/newsletter), so the old content address goes there. */
function Newsletter({ product }) {
  return <Navigate to={productHref(product)} replace />
}

/* 1:1 coaching */
function Coaching({ product }) {
  const c = product.coaching || {}
  return (
    <div className="pg-split">
      <Card padding="lg" className="pg-stack">
        <h2 className="t-heading-3">Your next steps</h2>
        <Stepper orientation="vertical" current={0} steps={coachingSteps} />
        <div className="pg-row">
          <Button href="/appointment/consultation" iconStart="calendar">Book your next session</Button>
        </div>
      </Card>
      <aside className="pg-split-aside">
        <Card tone="sage" padding="lg" className="pg-stack-sm">
          <h2 className="t-heading-4">Your coaching</h2>
          <dl className="pg-facts">
            <dt>Sessions</dt><dd>{c.sessions}</dd>
            <dt>Length</dt><dd>{c.length}</dd>
            <dt>Format</dt><dd>{c.format}</dd>
            <dt>How often</dt><dd>{c.cadence}</dd>
            <dt>With</dt><dd>{getPractitioner(product.practitioner).name}</dd>
          </dl>
        </Card>
      </aside>
    </div>
  )
}

/* Bundle: overall progress, each course, Progressive mode and certificates (src/components/course/BundleHome.jsx) */
function Bundle({ product, viewer }) {
  return <BundleHome product={product} viewer={viewer} />
}

const CONTENT = {
  community: (props) => (props.product.externalUrl ? <CommunityRedirect {...props} /> : <Community {...props} />),
  'media-library': LibraryPlayer,
  event: EventTicket,
  newsletter: Newsletter,
  coaching: Coaching,
  bundle: Bundle,
}
