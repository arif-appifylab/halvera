import { useParams } from 'react-router-dom'
import { Avatar, Badge, Breadcrumbs, Button, Card, ProductCard, Section } from '@/design-system'
import AccessGate from '@/components/AccessGate.jsx'
import NotFound from '@/pages/NotFound.jsx'
import { PostCard, PostMedia } from '@/pages/Blog.jsx'
import { getPost, relatedPosts, categoryLabel } from '@/data/posts.js'
import { getPractitioner } from '@/data/people.js'
import { school } from '@/data/school.js'
import { getProduct, cardProps } from '@/lib/products.js'
import { useViewer } from '@/app/viewer.jsx'
import './blog.css'

// Plans that open members-only posts (Website → Blog → post access).
const MEMBER_PLANS = ['essentials', 'supported', 'founding']
const PREVIEW_BLOCKS = 2

function Block({ block }) {
  switch (block.type) {
    case 'h2': return <h2>{block.text}</h2>
    case 'ul': return <ul>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>
    case 'quote': return (
      <blockquote>
        <p>{block.text}</p>
        {block.cite && <footer className="blogp-cite">{block.cite}</footer>}
      </blockquote>
    )
    default: return <p>{block.text}</p>
  }
}

export default function BlogPost() {
  const { slug } = useParams()
  const { viewer } = useViewer()
  const post = getPost(slug)
  if (!post) return <NotFound />

  const author = getPractitioner(post.author)
  const product = post.relatedProduct ? getProduct(post.relatedProduct) : null
  const membersOnly = post.access === 'members'
  const locked = membersOnly && !viewer.plan
  const blocks = locked ? post.body.slice(0, PREVIEW_BLOCKS) : post.body
  const firstName = author.name.replace(/^Dr\s+/, '').split(' ')[0]

  return (
    <>
      <div className="sg-container blogp">
        <div className="pg-split">
          <article className="blogp-main">
            <header className="pg-stack-sm blogp-head">
              <Breadcrumbs items={[{ label: 'Blog', href: '/blog' }, { label: post.title }]} />
              <div className="blog-card-badges">
                <Badge>{categoryLabel(post.category)}</Badge>
                {membersOnly && <Badge tone="accent" icon="lock">Members</Badge>}
              </div>
              <h1 className="t-heading-1">{post.title}</h1>
              <div className="blog-byline">
                <Avatar src={author.photo} name={author.name} size="md" />
                <div>
                  <p className="t-strong">{author.name}</p>
                  <p className="t-body-sm t-muted">{post.date} · {post.readTime}</p>
                </div>
              </div>
            </header>

            <PostMedia post={post} className="blogp-media" describe eager />

            <div className={'pg-prose blogp-prose' + (locked ? ' is-preview' : '')}>
              {blocks.map((block, i) => <Block key={i} block={block} />)}
            </div>

            {locked && (
              <div className="blogp-gate">
                {viewer.role === 'visitor' ? (
                  <AccessGate inPage state="signin" product={{ title: post.title }} viewer={viewer} />
                ) : (
                  <AccessGate inPage state="membership" product={{ title: post.title, plans: MEMBER_PLANS, prices: [] }} viewer={viewer} />
                )}
              </div>
            )}

          </article>

          <aside className="pg-split-aside" aria-label="About this article">
            <Card className="pg-stack-sm">
              <p className="sg-eyebrow">Written by</p>
              <div className="blog-byline">
                <Avatar src={author.photo} name={author.name} size="lg" />
                <div>
                  <p className="t-heading-4">{author.name}</p>
                  <p className="t-body-sm t-muted">{author.role}</p>
                </div>
              </div>
              <p className="t-body-sm">{author.bio}</p>
              <a href={author.href} className="t-body-sm blogp-link">More about {firstName}</a>
            </Card>

            {product && (
              <div className="pg-stack-sm">
                <p className="t-heading-4">Go further</p>
                <ProductCard {...cardProps(product, viewer)} />
              </div>
            )}

            <Card tone="sage" className="pg-stack-sm">
              <p className="t-heading-4">Not sure where to start?</p>
              <p className="t-body-sm">
                Talk it through with one of our practitioners. We’ll listen, look at the whole picture and suggest a first step that suits you.
              </p>
              <div>
                <Button variant="secondary" href={school.consultation.href}>{school.consultation.label}</Button>
              </div>
            </Card>
          </aside>
        </div>
      </div>

      <Section tone="sunken" title="Keep reading">
        <div className="pg-grid">
          {relatedPosts(post, 3).map((p) => <PostCard key={p.slug} post={p} />)}
        </div>
      </Section>
    </>
  )
}
