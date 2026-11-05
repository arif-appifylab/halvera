// The bundle home for owners (/bundle/:slug/open): overall progress across its courses, each
// course with its own progress and Continue, Progressive mode locks, the library category it
// includes, and the bundle and component certificates.
import { Badge, Button, Card, EmptyState, Icon, ProductCard, ProgressBar, StatusBadge } from '@/design-system'
import { bundleLibraryCards } from '@/lib/library.js'
import { bundleProgress, isBundlePreview } from './bundle.js'
import './course.css'

const CERT_PDF = '/files/sample-certificate.pdf'
const SAMPLE_CERT = 'CERT-B4ND-7Q2M' // shown in the "all complete" preview

function CourseCard({ course, step, total, primary, componentCertificates }) {
  const { product, percent, locked, done, started, previous, cert, lessons } = course
  const status = done ? <StatusBadge status="Completed" />
    : locked ? <Badge icon="lock">Locked</Badge>
      : started ? <Badge tone="primary">In progress</Badge>
        : <Badge>Not started</Badge>
  const label = done ? 'Review' : started ? 'Continue' : 'Start'
  return (
    <li>
      <Card padding="md" className={'cr-course' + (locked ? ' is-locked' : '')}>
        <div className="cr-course-media" aria-hidden="true">
          {product.image ? <img src={product.image} alt="" width="320" height="180" loading="lazy" decoding="async" /> : <Icon name="book" size={32} />}
        </div>
        <div className="cr-course-body">
          <div className="pg-row">
            <span className="t-caption t-muted">Course {step} of {total}</span>
            {status}
          </div>
          <h3 className="t-heading-3">{locked ? product.title : <a href={course.href}>{product.title}</a>}</h3>
          <p className="t-body-sm t-muted">{product.summary}</p>
          {locked ? (
            <p className="cr-course-lock t-body-sm"><Icon name="lock" size={16} />Complete {previous.product.title} to unlock</p>
          ) : (
            <ProgressBar value={percent} label={done ? `All ${lessons} lessons done` : `${percent}% complete · ${lessons} lessons`} showValue={false} />
          )}
          <div className="pg-row">
            {!locked && <Button size="sm" variant={primary ? 'primary' : 'secondary'} href={course.href} iconEnd={primary ? 'arrow-right' : undefined}>{label}<span className="sg-sr"> {product.title}</span></Button>}
            {done && componentCertificates && product.certificate && (cert || isBundlePreview()) && (
              <Button size="sm" variant="ghost" iconStart="download" href={CERT_PDF} download>Course certificate</Button>
            )}
          </div>
        </div>
      </Card>
    </li>
  )
}

export default function BundleHome({ product, viewer }) {
  const { courses, percent, complete, doneCount, current } = bundleProgress(product)
  const library = bundleLibraryCards(product, viewer)
  if (!courses.length && !library.length) {
    return <EmptyState icon="book" title="Nothing in this bundle yet">We’ll email you as soon as it’s ready.</EmptyState>
  }

  return (
    <div className="cr-bundle">
      {courses.length > 0 && (
        <Card padding="lg" className="cr-bundle-summary" aria-labelledby="cr-bundle-progress">
          <div className="pg-row-between">
            <h2 id="cr-bundle-progress" className="t-heading-3">Your progress</h2>
            {complete && <StatusBadge status="Completed" />}
          </div>
          <ProgressBar value={percent} label={`${percent}% of the bundle complete`} />
          <p className="t-body-sm t-muted">
            {doneCount} of {courses.length} courses complete
            {product.progressive && ' · Courses open in order, so you finish one before the next'}
          </p>
          {product.certificate && (complete ? (
            <div className="cr-cert">
              <Icon name="check-circle" size={22} />
              <div className="cr-cert-text">
                <p className="t-strong">Your bundle certificate is ready</p>
                <p className="t-body-sm t-muted">
                  Certificate ID <span className="sg-code">{SAMPLE_CERT}</span>. Anyone can check it on our <a href={`/verify?id=${SAMPLE_CERT}`}>verification page</a>.
                </p>
              </div>
              <Button iconStart="download" href={CERT_PDF} download>Download bundle certificate</Button>
            </div>
          ) : (
            <p className="cr-cert-hint t-body-sm">
              <Icon name="sparkle" size={16} />
              Finish every course to get your bundle certificate{product.componentCertificates ? '. Each course also gives its own certificate.' : '.'}
            </p>
          ))}
        </Card>
      )}

      {courses.length > 0 && (
        <section aria-labelledby="cr-bundle-courses" className="pg-stack">
          <h2 id="cr-bundle-courses" className="t-heading-3">Courses</h2>
          <ol className="cr-courses">
            {courses.map((c, i) => (
              <CourseCard
                key={c.product.slug} course={c} step={i + 1} total={courses.length}
                primary={!complete && current?.product.slug === c.product.slug}
                componentCertificates={product.componentCertificates}
              />
            ))}
          </ol>
        </section>
      )}

      {library.length > 0 && (
        <section aria-labelledby="cr-bundle-library" className="pg-stack">
          <h2 id="cr-bundle-library" className="t-heading-3">Also in this bundle</h2>
          <div className="pg-grid">
            {library.map(({ key, ...card }) => <ProductCard key={key} {...card} />)}
          </div>
        </section>
      )}
    </div>
  )
}
