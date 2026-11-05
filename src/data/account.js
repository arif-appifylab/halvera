// The signed-in student's account: one record that every dashboard page, the product pages and
// the profile PDF read, so the numbers always agree. In EzyCourse this comes from the student
// endpoints (my courses, ongoing, certificates, orders, subscriptions, memberships).
//
// Every date is relative to today (London wall-clock), like the events in src/data/events.js,
// so the story stays true whenever the preview is opened. Orders are not typed in here: they are
// built from `purchases` (plus event tickets and booked appointments) in src/lib/student.js.
// The "student" and "member" preview viewers are the same person; the member also has the
// Supported plan (src/app/viewer.jsx), which adds the membership, its orders and its allowances.
import { localDate, wallTime } from '@/components/product/time.js'
import { getPlan } from './plans.js'
import { badgeSet, levels, activities, leaderboardRows, levelFor } from './gamification.js'

const TZ = 'Europe/London'
// An ISO moment `days` from today (negative for the past), London wall-clock.
export const day = (days, hhmm = '12:00') => wallTime(days, hhmm, TZ)
const ago = (n, hhmm) => day(-n, hhmm)
// "Yesterday", "Today", or "Sat 4 Oct" for a last-opened moment.
const opened = (n) => (n === 0 ? 'Today' : n === 1 ? 'Yesterday' : localDate(ago(n)))

// Signed up for the free Mindful Eating Basics, 62 days ago.
export const memberSince = ago(62)

// ---------------------------------------------------------------- What they own

// Products bought (or joined free) directly. Bundled courses come with their bundle, and
// membership items come with the plan (src/lib/products.js ownsProduct).
export const owned = ['mindful-eating-basics', 'better-sleep-21-days', 'stress-less-programme', 'sunday-letter', 'mens-health-circle', 'calm-gut-bundle', 'gentle-movement-classes', 'calm-in-ten-days', 'steady-energy']

// Library items bought on their own (refs from src/data/library.js). The bundle adds category:recipes.
export const ownedLibrary = ['folder:soups-and-stews', 'folder:weekly-meal-plans', 'file:ten-breakfasts', 'file:prepping-vegetables', 'file:box-breathing']

// Private products they asked to join (Sell → Approvals): Pending, then Link sent once approved.
export const accessRequests = [{ slug: 'one-to-one-coaching', status: 'Pending', sent: localDate(ago(10)), sentAt: ago(10) }]

// Each owned item: when it was added, how, and until when. source: bought | free | bundle | plan | gift.
// accessUntil: an ISO date, or null for lifetime ("While your membership is active" for plan items).
export const enrolments = {
  'mindful-eating-basics': { added: ago(62), source: 'free', completed: ago(50) },
  'folder:soups-and-stews': { added: ago(56), source: 'bought' },
  'folder:weekly-meal-plans': { added: ago(21), source: 'bought' },
  'file:ten-breakfasts': { added: ago(58), source: 'bought' },
  'file:prepping-vegetables': { added: ago(58), source: 'bought' },
  'file:box-breathing': { added: ago(58), source: 'bought' },
  'mens-health-circle': { added: ago(37), source: 'bought', accessUntil: '2027-09-29' },
  'gentle-movement-classes': { added: ago(29), source: 'bought' },
  'calm-gut-bundle': { added: ago(21), source: 'bought' },
  'stress-less-programme': { added: ago(16), source: 'bought' },
  'calm-in-ten-days': { added: ago(16), source: 'bought' },
  'sunday-letter': { added: ago(11), source: 'bought' },
  'better-sleep-21-days': { added: ago(5), source: 'bought' },
  'steady-energy': { added: ago(4), source: 'bought', subscription: 's6' },
}

// Lesson progress per course. lastOpened is shown as written.
export const progress = {
  'gut-health-reset': { percent: 42, done: ['welcome', 'how-it-works', 'gut-basics', 'tracker', 'intake', 'pace', 'rhythm-map', 'dropin'], next: 'timing', lastOpened: opened(1), lastOpenedAt: ago(1) },
  'mindful-eating-basics': { percent: 100, done: ['d1', 'd2'], next: null, lastOpened: opened(50), lastOpenedAt: ago(50) },
  'better-sleep-21-days': { percent: 0, done: [], next: null, lastOpened: null },
  'stress-less-programme': { percent: 15, done: [], next: 'w1', lastOpened: opened(9), lastOpenedAt: ago(9) },
  'mens-health-circle': { percent: 33, done: ['intro', 'energy-diary', 'w1-video', 's1', 'w2-video', 's2'], next: 'w3-video', lastOpened: opened(4), lastOpenedAt: ago(4) },
  'calm-gut-kitchen': { percent: 0, done: [], next: null, lastOpened: null },
  'steady-energy': { percent: 25, done: ['se-oct-1'], next: 'se-oct-2', lastOpened: opened(1), lastOpenedAt: ago(1) },
}

// Audio and video libraries: episodes played (the player keeps the exact positions).
export const mediaProgress = {
  'gentle-movement-classes': { played: 5, lastOpened: opened(2), lastOpenedAt: ago(2) },
  'calm-in-ten-days': { played: 4, lastOpened: opened(0), lastOpenedAt: ago(0, '07:40') },
  'rest-and-restore-audio': { played: 3, lastOpened: opened(3), lastOpenedAt: ago(3), plan: true },
}

// Which cohort (product.cohort.runs) the student joined, per cohort product.
export const cohortEnrolments = { 'mens-health-circle': 'sep-2026' }

// Assignment submissions (Submissions gradebook). Quiz attempts live with each quiz
// (quizHistory in src/data/quizzes.js), so the profile and the player always agree.
// status: Submitted (waiting for marking) | Marked. feedback shows once the marker sends it.
export const assignmentSubmissions = [
  {
    slug: 'gut-health-reset', lessonId: 'rhythm-map', submittedAt: ago(6, '20:15'), markedAt: ago(3, '10:40'), status: 'Marked', score: 90, attempt: 1,
    marker: 'Dr Chidi Okafor',
    feedback: 'A clear map, and a realistic first change. Try moving Tuesday’s lunch away from the desk before changing dinner.',
  },
]

// ---------------------------------------------------------------- Purchases

// One-time purchases; each becomes an order (newest first in Payments). Amounts come from the
// product's price, except library bundles of files, which list theirs.
//   method: card | bank | paypal · status: Paid | Failed | Pending | Partially refunded | Refunded
export const purchases = [
  { id: 'HH-10044', at: ago(58, '09:12'), cart: true, lines: [{ ref: 'file:ten-breakfasts' }, { ref: 'file:prepping-vegetables' }, { ref: 'file:box-breathing' }, { ref: 'file:lentil-squash-stew' }], status: 'Partially refunded', refund: { amount: 4, at: ago(56), for: 'Red lentil and squash stew (it’s in the Soups and stews folder you bought)' } },
  { id: 'HH-10102', at: ago(56, '20:40'), lines: [{ ref: 'folder:soups-and-stews' }], status: 'Paid' },
  { id: 'HH-10156', at: ago(50, '18:05'), lines: [{ ref: 'folder:weekly-meal-plans' }], status: 'Failed', note: 'Your bank declined the card. Nothing was charged.' },
  { id: 'HH-10180', at: ago(47, '08:30'), lines: [{ ref: 'site-access', priceId: 'yearly' }], status: 'Paid' },
  { id: 'HH-10302', at: ago(37, '21:15'), lines: [{ slug: 'mens-health-circle', priceId: 'plan', note: 'September 2026 cohort · payment 1 of 3' }], status: 'Paid' },
  // A cart: a library of classes and a workshop ticket, bought together.
  { id: 'HH-10320', at: ago(29, '12:02'), cart: true, lines: [{ slug: 'gentle-movement-classes' }, { slug: 'spring-gut-workshop', priceId: 'ticket', note: 'Ticket HH-E-40211' }], status: 'Paid' },
  // The bundle with the checkout's order bump (Sell → Offers → Order bump: "Add Weekly meal plans for $9")
  // and the thank-you page's one-click upsell, which the admin adds as a line to the same order.
  {
    id: 'HH-10341', at: ago(21, '19:48'), coupon: { code: 'WELCOME10', amount: 10 }, status: 'Paid',
    lines: [
      { slug: 'calm-gut-bundle' },
      { ref: 'folder:weekly-meal-plans', amount: 9, role: 'Order bump', note: 'Added at checkout · usually $15' },
      { title: '1:1 follow-up', amount: 65, role: 'Upsell', note: 'Added after checkout in one click · book within 3 months', credit: 'follow-up' },
    ],
  },
  // A cart with a code: SPRING25 takes 25% off the programme (a product discount), paid with PayPal.
  { id: 'HH-10350', at: ago(16, '07:55'), cart: true, lines: [{ slug: 'stress-less-programme' }, { slug: 'calm-in-ten-days' }], coupon: { code: 'SPRING25', amount: 17.25 }, method: 'paypal', status: 'Paid' },
  { id: 'HH-10402', at: ago(7, '21:15'), lines: [{ slug: 'mens-health-circle', priceId: 'plan', note: 'September 2026 cohort · payment 2 of 3' }], status: 'Paid' },
  { id: 'HH-10482', at: ago(5, '13:20'), lines: [{ slug: 'better-sleep-21-days' }], status: 'Paid', note: 'Pre-order · opens on release' },
  // A bank transfer still to send (Sell → Manual payments).
  { id: 'HH-10511', at: ago(2, '10:05'), lines: [{ ref: 'category:videos' }], method: 'bank', status: 'Pending', reference: 'HH-10511' },
]

// Memberships (the "member" preview only; the "student" has none). A student can hold several:
// one plan per group plus standalone plans. Each has its own billing date and charges (each charge
// is an order). Adnan joined Essentials with a 7-day trial, upgraded to Supported part-way through
// a month (charged the difference for the days left), and later joined the standalone Gut Health Club.
export const memberships = [
  {
    id: 's1', planId: 'supported', priceId: 'monthly', status: 'Active', since: ago(30), joined: ago(55), nextAt: day(12, '06:00'),
    charges: [
      { id: 'HH-10262', at: ago(30, '18:02'), amount: 18, label: 'Upgrade from Essentials · the difference for 18 days' },
      { id: 'HH-10344', at: ago(18, '06:00'), amount: 49, label: 'Monthly' },
    ],
    history: [
      { at: ago(55), text: 'Joined Essentials with a 7-day free trial' },
      { at: ago(48), text: 'First Essentials payment, $19' },
      { at: ago(30), text: 'Upgraded to Supported. Paid $18 for the rest of that month' },
    ],
  },
  {
    id: 's5', planId: 'gut-health-club', priceId: 'monthly', status: 'Active', since: ago(20), joined: ago(20), nextAt: day(10, '07:30'),
    charges: [{ id: 'HH-10336', at: ago(20, '07:30'), amount: 12, label: 'Monthly' }],
    history: [{ at: ago(20), text: 'Joined Gut Health Club' }],
  },
]
// Ended memberships: the plan and its charges stay in the history.
export const pastMemberships = [
  { id: 's0', planId: 'essentials', priceId: 'monthly', joined: ago(55), ended: ago(30), how: 'Upgraded to Supported', charges: [{ id: 'HH-10158', at: ago(48, '06:00'), amount: 19, label: 'Monthly' }] },
]

// Subscriptions and payment plans (Payments → Subscriptions). Memberships come first (members only).
// nextAt is ISO.
export const subscriptions = [
  ...memberships.map((m) => {
    const price = getPlan(m.planId).prices[m.priceId]
    return { id: m.id, kind: 'membership', planId: m.planId, name: `${getPlan(m.planId).name} membership`, price: `${price.price.amount} / ${price.price.interval}`, amount: price.amount, status: m.status, memberOnly: true, started: m.since, nextAt: m.nextAt }
  }),
  { id: 's2', kind: 'site-access', name: 'Site access', price: '$49 / year', amount: 49, status: 'Active', started: ago(47), nextAt: day(318, '08:30') },
  { id: 's3', kind: 'plan', name: 'Men’s Health Circle · 3 payments', slug: 'mens-health-circle', price: '$99 / month', amount: 99, status: 'Active', paid: 2, count: 3, nextAt: day(23, '21:15') },
  { id: 's4', kind: 'newsletter', name: 'The Sunday Letter', slug: 'sunday-letter', tier: 'Paid monthly', price: '$5 / month', amount: 5, status: 'Trialing', started: ago(11), nextAt: day(3, '09:00') },
  // A course on a monthly subscription, in its 14-day free trial.
  { id: 's6', kind: 'course', name: 'Steady Energy', slug: 'steady-energy', price: '$15 / month', amount: 15, interval: 'month', status: 'Trialing', started: ago(4), nextAt: day(10, '08:00') },
]
// Older readers use `next` as text.
for (const s of subscriptions) {
  s.next = localDate(s.nextAt)
  if (s.status === 'Trialing') s.detail = `Trial ends ${s.next}`
  if (s.kind === 'plan') s.detail = `${s.paid} of ${s.count} paid · ${s.count - s.paid} left`
}

// Appointments the Supported plan includes, each with its own booking limit per billing period
// (Memberships → Contents → the appointment → "Booking limit: Users book up to N sessions each
// billing period. Unused sessions do not carry over."). The upcoming follow-up uses this month's one.
export const appointmentAllowances = [
  { slug: 'follow-up', perPeriod: 1, used: 1 },
  { slug: 'member-check-in', perPeriod: 1, used: 0 },
]
// All of them together, for one-line summaries.
export const allowance = {
  label: 'Included sessions this month',
  used: appointmentAllowances.reduce((n, a) => n + a.used, 0),
  total: appointmentAllowances.reduce((n, a) => n + a.perPeriod, 0),
  resets: localDate(subscriptions[0].nextAt), resetsAt: subscriptions[0].nextAt,
}

// ---------------------------------------------------------------- Certificates and achievements

export const certificates = [
  { id: 'CERT-7F2K-91QA', course: 'Mindful Eating Basics', slug: 'mindful-eating-basics', issued: localDate(ago(50)), issuedAt: ago(50), expires: null },
]

// Gamification (src/data/gamification.js): points, the badge level they've reached, when each
// level was reached, and the leaderboard. 320 points: enrolled in 8 programmes (40), completed 1 (50),
// 5 events (125), 6 live sessions (60), joined the community (5), reactions and profile (40).
const points = 320
const reached = levelFor(points)
const next = levels.find((l) => l.points > points) || null
export const gamification = {
  enabled: true,
  set: badgeSet,
  points,
  level: reached?.level || 0,
  levelName: reached?.name || 'No level yet',
  badge: reached,
  nextLevel: next ? { name: next.name, at: next.points, level: next.level } : null,
  levels: levels.map((l, i) => ({ ...l, earned: points >= l.points ? localDate(ago([60, 55, 40, 12][i] ?? 1)) : null })),
  activities,
  leaderboard: leaderboardRows.map(([name, pts, you], i) => ({ rank: i + 1, name, points: pts, you: Boolean(you), badge: levelFor(pts) })),
}

// ---------------------------------------------------------------- Profile

// Contacts › Fields that the student can see. edit: 'user' (User can view and edit) or
// 'admin' (User can view, admin edits). Admin-only fields never reach the storefront.
export const profileFields = [
  { id: 'phone', label: 'Phone', type: 'tel', value: '+44 7700 900123', edit: 'user', optional: true },
  { id: 'country', label: 'Country', type: 'country', value: 'United Kingdom', edit: 'user' },
  { id: 'goals', label: 'What would you like help with?', type: 'multi', value: ['Digestion', 'Sleep', 'Stress'], options: ['Digestion', 'Sleep', 'Stress', 'Energy', 'Eating habits', 'Men’s health'], edit: 'user', optional: true },
  { id: 'referred', label: 'How you found us', type: 'text', value: 'A friend', edit: 'admin' },
]


// ---------------------------------------------------------------- Lesson notes

// Notes the student wrote in lessons ({ [course]: { [lessonId]: [note] } }). The player keeps new
// ones in this browser (src/components/lesson-tools/state.js); My library → Notes lists them all.
export const lessonNotes = {
  'gut-health-reset': {
    'gut-basics': [{ id: 'n1', text: 'Stress and digestion share the same nerve. Slow breathing before meals helps.', time: null, at: new Date(ago(20, '20:05')).getTime() }],
    tracker: [{ id: 'n2', text: 'Track for two weeks before changing anything. Note sleep too.', time: null, at: new Date(ago(18, '21:30')).getTime() }],
    pace: [{ id: 'n3', text: 'Eat sitting down, put the fork down between bites.', time: null, at: new Date(ago(1, '19:10')).getTime() }],
  },
  'mens-health-circle': {
    'energy-diary': [{ id: 'n4', text: 'Energy dips at 3pm on days I skip lunch.', time: null, at: new Date(ago(10, '18:40')).getTime() }],
  },
}
