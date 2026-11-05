import { Section, Tabs, Badge } from '@/design-system'
import { useState } from 'react'
import AccessGate from '@/components/AccessGate.jsx'
import { getProduct } from '@/lib/products.js'
import { siteAccess } from '@/lib/access.js'
import { useViewer } from '@/app/viewer.jsx'
import './theme-states.css'

// Theme review page: every page, every product state and every access gate in one place.
// Not linked from the school's navigation.

const groups = [
  {
    title: 'Marketing pages',
    links: [
      ['Home', '/'], ['Health topics', '/conditions'], ['Condition: Gut health', '/conditions/gut-health'],
      ['About us', '/about-us'], ['Contact us', '/contact-us'], ['Blog', '/blog'],
      ['Blog post · members only', '/blog/midlife-sleep'], ['Blog · error state', '/blog?state=error'],
      ['Terms of use', '/terms-of-use'], ['Privacy policy', '/privacy-policy'], ['Refund policy', '/refund-policy'],
      ['404', '/this-page-does-not-exist'],
    ],
  },
  {
    title: 'Catalogue and memberships',
    links: [['Programmes', '/courses'], ['All products', '/all-products'], ['Memberships', '/memberships'], ['Site access (access gate)', '/site-access']],
  },
  {
    title: 'Product pages: every type and state',
    links: [
      ['Course · sale price + instalments', '/course/gut-health-reset'],
      ['Cohort · seats left, enrolment closes', '/course/mens-health-circle'],
      ['Course · free', '/course/mindful-eating-basics'],
      ['Course · pre-order', '/course/better-sleep-21-days'],
      ['Course · enrolment closed', '/course/mens-health-foundations'],
      ['Course · sales ended', '/course/stress-less-programme'],
      ['Bundle', '/bundle/calm-gut-bundle'],
      ['Coaching · private, request access', '/coaching/one-to-one-coaching'],
      ['Community · membership only', '/community/healing-circle-community'],
      ['Media library · membership only', '/media-library/rest-and-restore-audio'],
      ['Media library · password protected', '/media-library/retreat-recordings'],
      ['Asset library · all files', '/asset-library/halvera-library'],
      ['Event · excluded from site access', '/event/spring-gut-workshop'],
      ['Event · sold out', '/event/winter-retreat'],
      ['Newsletter · subscription with trial', '/newsletter/sunday-letter'],
    ],
  },
  {
    title: 'Content behind the gate',
    links: [
      ['Course player', '/course/gut-health-reset/learn/timing'],
      ['Lesson · free preview', '/course/gut-health-reset/learn/welcome'],
      ['Lesson · drip locked', '/course/gut-health-reset/learn/fibre'],
      ['Lesson · quiz', '/course/gut-health-reset/learn/quiz-1'],
      ['Lesson type · video', '/course/gut-health-reset/learn/pace'],
      ['Lesson type · reading (text)', '/course/gut-health-reset/learn/how-it-works'],
      ['Lesson type · slides', '/course/gut-health-reset/learn/gut-basics'],
      ['Lesson type · PDF', '/course/gut-health-reset/learn/tracker'],
      ['Lesson type · audio', '/course/gut-health-reset/learn/breathing'],
      ['Lesson type · survey', '/course/gut-health-reset/learn/intake'],
      ['Lesson type · assignment (graded)', '/course/gut-health-reset/learn/rhythm-map'],
      ['Lesson type · download', '/course/gut-health-reset/learn/starter-kit'],
      ['Lesson type · live replay', '/course/gut-health-reset/learn/dropin'],
      ['Lesson type · embedded tool', '/course/gut-health-reset/learn/meal-planner'],
      ['Lesson type · embed code: video board', '/course/gut-health-reset/learn/check-in-answers'],
      ['Lesson type · embed code: intro video, then video board', '/course/gut-health-reset/learn/label-answers'],
      ['Lesson type · SCORM module', '/course/gut-health-reset/learn/food-diary'],
      ['Lesson type · multi-part', '/course/gut-health-reset/learn/fibre-steps'],
      ['Lesson type · AI practice coach', '/course/gut-health-reset/learn/coach'],
      ['Lesson type · ebook', '/course/gut-health-reset/learn/handbook'],
      ['Course · completed, certificate', '/course/mindful-eating-basics/learn/d2'],
      ['Community', '/community/healing-circle-community/open'],
      ['Audio library', '/media-library/rest-and-restore-audio/open'],
      ['Password-protected library', '/media-library/retreat-recordings/open'],
      ['Library · paid category (one-time, monthly, installments)', '/asset-library/halvera-library/category/recipes'],
      ['Library · members category', '/asset-library/halvera-library/category/breathwork'],
      ['Library · free category', '/asset-library/halvera-library/category/guides'],
      ['Library · folder sold on its own', '/asset-library/halvera-library/folder/weekly-meal-plans'],
      ['Library · owned folder', '/asset-library/halvera-library/folder/soups-and-stews'],
      ['Library · loading', '/asset-library/halvera-library?state=loading'],
      ['Library · error', '/asset-library/halvera-library?state=error'],
      ['Library file · PDF', '/asset-library/halvera-library/file/symptom-tracker'],
      ['Library file · slides', '/asset-library/halvera-library/file/gut-basics'],
      ['Library file · video', '/asset-library/halvera-library/file/prepping-vegetables'],
      ['Library file · audio', '/asset-library/halvera-library/file/box-breathing'],
      ['Library file · image', '/asset-library/halvera-library/file/kitchen-photo'],
      ['Library file · link', '/asset-library/halvera-library/file/nhs-ibs'],
      ['Library file · locked, sold on its own', '/asset-library/halvera-library/file/ten-breakfasts'],
      ['Library file · locked, category only', '/asset-library/halvera-library/file/qa-october'],
    ],
  },
  {
    title: 'Latest additions',
    links: [
      ['Global search', '/search?q=sleep'],
      ['Cart page', '/cart'],
      ['Newsletter home', '/newsletter/sunday-letter'],
      ['Newsletter · paid post (paywall)', '/newsletter/sunday-letter/soup-season-evening-wind-down?as=visitor'],
      ['Newsletter · paid subscriber', '/newsletter/sunday-letter/soup-season-evening-wind-down?as=student&tier=paid'],
      ['Lesson tools · discussion open', '/course/gut-health-reset/learn/timing?tool=discussion&as=student'],
      ['Audio lesson', '/course/gut-health-reset/learn/breathing?as=student'],
      ['Ebook flipbook', '/course/gut-health-reset/learn/handbook?as=student'],
      ['Quiz · one at a time (skip)', '/course/gut-health-reset/learn/quiz-1/quiz?as=student'],
      ['Quiz · section by section (IELTS style)', '/course/gut-health-reset/learn/ielts-practice/quiz?as=student'],
      ['Quiz · all on one page', '/course/gut-health-reset/learn/check-in-all/quiz?as=student'],
      ['Event · per-date pricing', '/event/wednesday-breathwork'],
      ['Dashboard · event tickets in Bookings', '/student/dashboard/bookings?as=student&type=event&view=list'],
      ['Membership only · Essentials only', '/media-library/morning-reset-audio'],
      ['Sign up with site access', '/signup'],
      ['Abandoned checkout link (unknown)', '/checkout/recover/co_unknown'],
    ],
  },
  {
    title: 'Courses, cohorts and bundles (as a student)',
    links: [
      ['Course player', '/course/gut-health-reset/learn/timing?as=student'],
      ['Prerequisite lock', '/course/gut-health-reset/learn/rhythm-map?as=student'],
      ['Interactive video', '/course/gut-health-reset/learn/timing-interactive?as=student'],
      ['Certificate and review', '/course/mindful-eating-basics/learn/d2?as=student'],
      ['Cohort · this week', '/course/mens-health-circle/learn/w3-video?as=student'],
      ['Cohort · live session soon', '/course/mens-health-circle/learn/s4?as=student&session=soon'],
      ['Cohort · live now', '/course/mens-health-circle/learn/w3-video?as=student&session=live'],
      ['Cohort · replay', '/course/mens-health-circle/learn/s3?as=student'],
      ['Cohort · locked week', '/course/mens-health-circle/learn/w5-video?as=student'],
      ['Cohort sales page', '/course/mens-health-circle'],
      ['Cohort · full', '/course/mens-health-circle?cohort=full'],
      ['Checkout · choose a cohort', '/checkout/mens-health-circle'],
      ['Bundle home', '/bundle/calm-gut-bundle/open?as=student'],
      ['Bundle · complete', '/bundle/calm-gut-bundle/open?as=student&bundle=complete'],
      ['Bundle · locked course', '/course/calm-gut-kitchen/learn/k1?as=student'],
    ],
  },
  {
    title: 'Asset library',
    links: [
      ['Library', '/asset-library/halvera-library'],
      ['Paid category (one-time, monthly, instalments)', '/asset-library/halvera-library/category/recipes'],
      ['Members category', '/asset-library/halvera-library/category/breathwork'],
      ['Free category', '/asset-library/halvera-library/category/guides'],
      ['Folder sold on its own', '/asset-library/halvera-library/folder/weekly-meal-plans'],
      ['File · PDF', '/asset-library/halvera-library/file/symptom-tracker'],
      ['Checkout · library category', '/checkout/library:category:recipes?price=once'],
      ['Library · loading', '/asset-library/halvera-library?state=loading'],
      ['Library · empty', '/asset-library/halvera-library?state=empty'],
    ],
  },
  {
    title: 'Audio and video libraries',
    links: [
      ['Video library', '/media-library/gentle-movement-classes'],
      ['Video library · open', '/media-library/gentle-movement-classes/open?as=student'],
      ['Podcast', '/media-library/calm-gut-podcast'],
      ['Podcast · open', '/media-library/calm-gut-podcast/open?as=student'],
      ['Unlocks days after joining', '/media-library/calm-in-ten-days/open?as=student'],
      ['Same dates, expiring', '/media-library/mens-health-evenings/open?as=member'],
      ['Audio · membership', '/media-library/rest-and-restore-audio/open?as=member'],
      ['Password protected', '/media-library/retreat-recordings/open'],
      ['Closed library', '/media-library/summer-breathwork'],
    ],
  },
  {
    title: 'Events',
    links: [
      ['In person · places left', '/event/spring-gut-workshop'],
      ['Ticket', '/event/spring-gut-workshop/open?as=student'],
      ['Virtual', '/event/gut-brain-webinar'],
      ['Live now', '/event/hormone-qa-live/open?as=student'],
      ['Free · guest registration · hidden venue', '/event/midlife-sleep-evening-bath'],
      ['Multi-day · agenda and speakers', '/event/nourish-weekend'],
      ['Recurring · subscription', '/event/wednesday-breathwork'],
      ['Members only', '/event/members-checkin'],
      ['Members only · event places', '/event/members-checkin?as=member'],
      ['Full · waitlist', '/event/winter-retreat?as=student'],
      ['Registration closed', '/event/heart-healthy-cooking-workshop'],
      ['Ended · replay', '/event/autumn-immunity-talk/open?as=student'],
      ['Ended · no recording', '/event/sleep-reset-london'],
      ['Cancelled', '/event/mindful-morning-bath'],
    ],
  },
  {
    title: 'Booking: every appointment type',
    links: [
      ['1:1 · calendar view', '/appointment/consultation'],
      ['1:1 · week view', '/appointment/consultation?view=week'],
      ['Other time zone', '/appointment/consultation?tz=America/New_York'],
      ['Day limit reached', '/appointment/consultation?state=day-limit'],
      ['Paid · Zoom', '/appointment/initial-consultation'],
      ['In person · clinic address', '/appointment/clinic-consultation'],
      ['In person · venue hidden until booked', '/appointment/walk-and-talk'],
      ['Catalogue · Appointments tab', '/all-products?type=appointment'],
      ['Membership allowance', '/appointment/follow-up?step=payment&as=member'],
      ['Group slot', '/appointment/breathwork-group'],
      ['Round robin', '/appointment/practitioner-intro'],
      ['Magic slot', '/appointment/magic-follow-up'],
      ['Meetup poll · free', '/appointment/midlife-circle-poll'],
      ['Meetup poll · paid (charged if your time wins)', '/appointment/cooking-class-poll'],
      ['Members only', '/appointment/member-check-in'],
    ],
  },
  {
    title: 'Booking, checkout and account',
    links: [
      ['Free consultation', '/appointment/consultation'], ['Paid consultation', '/appointment/initial-consultation'],
      ['Follow-up (membership allowance)', '/appointment/follow-up'], ['Group breathwork', '/appointment/breathwork-group'],
      ['Booking · no times left', '/appointment/consultation?state=no-times'],
      ['Checkout · cart', '/checkout/cart'], ['Checkout · course + site access', '/checkout/gut-health-reset?price=once'],
      ['Checkout · instalments', '/checkout/gut-health-reset?price=plan'], ['Checkout · membership', '/checkout/plan:supported?price=monthly'], ['Checkout · membership for a product', '/checkout/plan:supported?price=monthly&for=rest-and-restore-audio'],
      ['Checkout · site access alone', '/checkout/site-access?price=yearly'], ['Checkout · event (no site access)', '/checkout/spring-gut-workshop'],
      ['Checkout · gift', '/checkout/gut-health-reset?price=once&gift=1'], ['Checkout · failed payment', '/checkout/gut-health-reset?state=failed'],
      ['Checkout · expired link', '/checkout/gut-health-reset?state=expired'],
      ['Log in', '/login'], ['Sign up', '/signup'], ['Verify email', '/verify-email'], ['Forgot password', '/forgot-password'],
      ['Verify a certificate', '/verify?id=CERT-7F2K-91QA'],
    ],
  },
  {
    title: 'Student dashboard (sign in from the preview bar)',
    links: [
      ['Home', '/student/dashboard?as=student'], ['Home · member', '/student/dashboard?as=member'],
      ['My library', '/student/dashboard/profile/enrollments?as=member'], ['Notes (from Home)', '/student/dashboard/notes?as=member'], ['Home · free trial (no membership)', '/student/dashboard?as=student'],
      ['My library · filtered (paths)', '/student/dashboard/profile/enrollments?as=member&type=bundle'],
      ['Membership · two memberships', '/student/dashboard/memberships?as=member'], ['Membership · Gut Health Club (standalone)', '/student/dashboard/memberships?as=member&plan=s5'],
      ['Membership · change plan (downgrade or billing)', '/student/dashboard/memberships?as=member&change=1'],
      ['Membership · upgrade (shown as Essentials)', '/student/dashboard/memberships?as=member&tier=essentials&change=1'],
      ['Membership · cancel', '/student/dashboard/memberships?as=member&cancel=1'],
      ['Membership · payment overdue', '/student/dashboard/memberships?as=member&state=past-due'],
      ['Bookings · calendar', '/student/dashboard/bookings?as=member'], ['Bookings · list', '/student/dashboard/bookings?as=member&view=list'],
      ['Profile', '/student/dashboard/profile?as=member'], ['Profile · PDF options', '/student/dashboard/profile?as=member&pdf=1'],
      ['Payments', '/student/dashboard/profile/payments?as=member'], ['Payments · waiting for a bank transfer', '/student/dashboard/profile/payments?as=student&tab=pending'],
      ['Payments · cancel membership', '/student/dashboard/profile/payments?as=member&tab=subscriptions&cancel=s1'],
      ['Settings', '/student/dashboard/settings?as=student'],
      ['My library · empty', '/student/dashboard/profile/enrollments?as=student&state=empty'],
      ['Bookings · loading', '/student/dashboard/bookings?as=student&state=loading'],
      ['Payments · error', '/student/dashboard/profile/payments?as=student&state=error'],
    ],
  },
]

const gates = [
  { state: 'signin', product: 'gut-health-reset', note: 'Visitor opens content' },
  { state: 'verify', product: 'gut-health-reset', note: 'Email not confirmed yet' },
  { state: 'purchase', product: 'gut-health-reset', note: 'Signed in, not enrolled' },
  { state: 'site-access-ended', product: 'gut-health-reset', note: 'Access gate: access ended, purchases locked' },
  { state: 'membership', product: 'rest-and-restore-audio', note: 'Membership-only product' },
  { state: 'upgrade', product: 'rest-and-restore-audio', note: 'Plan doesn’t include it' },
  { state: 'private', product: 'one-to-one-coaching', note: 'Private: request access' },
  { state: 'pending', product: 'one-to-one-coaching', note: 'Request sent, awaiting approval' },
  { state: 'password', product: 'retreat-recordings', note: 'Password-protected library' },
  { state: 'pre-order', product: 'better-sleep-21-days', note: 'Pre-ordered, not open yet' },
  { state: 'drip', product: 'gut-health-reset', note: 'Lesson drip', unlockDate: 'Mon 27 Oct' },
  { state: 'prereq', product: 'gut-health-reset', note: 'Prerequisite lesson', previousLesson: { title: 'Meal timing that suits your day', href: '/course/gut-health-reset/learn/timing' } },
]

export default function ThemeStates() {
  const { viewer } = useViewer()
  const [tab, setTab] = useState('pages')

  return (
    <>
      <header className="sg-container pg-head">
        <div className="pg-head-inner">
          <p className="sg-eyebrow">Theme review</p>
          <h1 className="t-heading-1">Every page and state</h1>
          <p className="t-body-lg t-muted">Use the preview bar (bottom corner) to view the site as a visitor, student or member, and to switch email confirmation.</p>
          <p className="t-body-sm t-muted">
            Site access (the access gate) is {siteAccess.enabled ? 'on' : 'off'}. It’s off by default; turn on “Require site access to buy” in the preview bar to see the site access pages, checkout lines and locks.
          </p>
        </div>
      </header>
      <Section>
        <Tabs
          label="Review"
          value={tab}
          onChange={setTab}
          tabs={[{ value: 'pages', label: 'Pages' }, { value: 'gates', label: 'Access gate states' }]}
        />
        {tab === 'pages' ? (
          <div className="ts-groups">
            {groups.map((g) => (
              <section key={g.title} className="ts-group">
                <h2 className="t-heading-4">{g.title}</h2>
                <ul>
                  {g.links.map(([label, href]) => <li key={href}><a href={href}>{label}</a></li>)}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="ts-gates">
            {gates.map((g) => (
              <figure key={g.state} className="ts-gate">
                <figcaption><Badge>{g.state}</Badge><span>{g.note}</span></figcaption>
                <AccessGate
                  compact
                  state={g.state}
                  product={getProduct(g.product)}
                  viewer={g.state === 'upgrade' ? { ...viewer, plan: 'essentials' } : viewer}
                  unlockDate={g.unlockDate}
                  previousLesson={g.previousLesson}
                />
              </figure>
            ))}
          </div>
        )}
      </Section>
    </>
  )
}
