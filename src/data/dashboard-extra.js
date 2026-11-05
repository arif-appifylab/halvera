// Extra account data for the dashboard: booked appointments, payment details, settings.
// Builds on src/data/account.js; status words are the platform's exact ones (StatusBadge).
// Dates are relative to today, like the rest of the account.
import { day } from './account.js'

// Registrants can cancel or reschedule up to this many hours before (Scheduling → Appointments).
export const changeWindowHours = 4

// Preview any list state with ?state=loading | error | empty (theme preview only).
export const demoState = (search) => new URLSearchParams(search).get('state')

// ---------------------------------------------------------------- Appointments

const MIN = 60000
const plus = (iso, minutes) => new Date(new Date(iso).getTime() + minutes * MIN).toISOString()
// The group breathwork starts about 3 hours after the page opens, so it always shows the
// "less than 4 hours to go" rule (no changes) with the join link coming up.
const soon = () => {
  const t = Date.now() + 3 * 3600000
  return new Date(Math.ceil(t / (15 * MIN)) * 15 * MIN).toISOString()
}
const breathwork = soon()

// Booked appointments. price: what was paid ('Free', or a formatted amount); members pay for the
// follow-up with their plan's consultation (allowance), everyone else pays the price.
// booked: when it was booked (its order in Payments). Times show in the visitor's time zone.
export const bookedAppointments = [
  {
    id: 'u1', slug: 'breathwork-group', title: 'Group breathwork', host: 'Samir Haddad',
    startsAt: breathwork, endsAt: plus(breathwork, 45), booked: day(-2, '18:40'), order: 'HH-10488',
    location: 'Halvera video room', locationIcon: 'video', joinHref: '#join-u1', status: 'Confirmed', amount: 15,
  },
  {
    id: 'u2', slug: 'follow-up', title: 'Follow-up', host: 'Dr Chidi Okafor',
    startsAt: day(5, '10:30'), endsAt: day(5, '11:15'), booked: day(-6, '09:10'), order: 'HH-10431',
    location: 'Zoom', locationIcon: 'video', joinHref: '#join-u2', status: 'Confirmed', amount: 65, allowance: true,
    cancelNote: 'You get a full refund to your Visa ending 4242 within 5–10 days.',
    allowanceCancelNote: 'Your consultation goes back into this month’s allowance.',
  },
  {
    id: 'u3', slug: 'clinic-consultation', title: 'In-clinic consultation', host: 'Dr Chidi Okafor',
    startsAt: day(14, '09:00'), endsAt: day(14, '10:00'), booked: day(-1, '16:25'), order: 'HH-10499',
    location: 'In person · 14 Linden Row, Bristol BS1 4QA', locationIcon: 'map-pin', status: 'Pending', amount: 110,
    statusNote: 'Chidi confirms new clients within a day. We’ll email you.',
    cancelNote: 'You get a full refund to your Visa ending 4242 within 5–10 days.',
  },
  {
    id: 'p1', slug: 'consultation', title: 'Free 20-minute consultation', host: 'Dr Chidi Okafor',
    startsAt: day(-60, '14:00'), endsAt: day(-60, '14:20'), booked: day(-62, '19:00'),
    location: 'Google Meet', locationIcon: 'video', status: 'Completed', amount: 0,
  },
  {
    id: 'p2', slug: 'walk-and-talk', title: 'Walk-and-talk coaching', host: 'Samir Haddad',
    startsAt: day(-39, '08:00'), endsAt: day(-39, '09:00'), booked: day(-44, '20:10'), order: 'HH-10271',
    location: 'In person in Bristol', locationIcon: 'map-pin', status: 'Completed', amount: 50,
  },
  {
    id: 'p3', slug: 'follow-up', title: 'Follow-up', host: 'Dr Chidi Okafor',
    startsAt: day(-30, '11:00'), endsAt: day(-30, '11:45'), booked: day(-33, '12:30'), order: 'HH-10330',
    location: 'Zoom', locationIcon: 'video', status: 'Cancelled', statusNote: 'You cancelled · refunded', amount: 65, refunded: day(-31, '09:00'),
  },
]

// Every appointment: the catalogue's Appointments tab. Each appointment has its own booking page.
export const bookHref = '/all-products?type=appointment'
export const appointmentHref = (slug) => `/appointment/${slug}`

// ---------------------------------------------------------------- Payments

export const paymentMethod = { brand: 'Visa', last4: '4242', expires: '08/28', usedFor: 'Used for your subscriptions and payment plan' }

// Bank transfer details shown on a pending order (Sell → Manual payments).
export const bankDetails = { name: 'Halvera Ltd', sortCode: '04-00-04', account: '12345678', iban: 'GB33 BUKB 2020 1555 5555 55' }

// Cancel flow (Sell → Memberships → Cancel flow): reasons, then an offer where the school set one.
// Pausing is only offered here, inside cancelling; there's no pause button on its own.
export const cancelReasons = [
  { value: 'cost', label: 'It costs more than I can spend right now' },
  { value: 'time', label: 'I’m not using it enough' },
  { value: 'done', label: 'I got what I came for' },
  { value: 'break', label: 'I’m taking a break' },
  { value: 'other', label: 'Something else' },
]

// Offers by subscription id. Prices come formatted, like everywhere else.
export const cancelOffers = {
  s1: [
    {
      id: 'pause',
      title: 'Pause for a month instead',
      text: 'Nothing is charged next month. Your programmes and progress wait for you, and billing starts again the month after.',
      action: 'Pause for a month',
      result: { status: 'Paused', detail: 'Paused for one month', message: 'Your membership is paused for one month.' },
    },
    {
      id: 'discount',
      title: '50% off your next 2 months',
      text: '$24.50 / month for your next 2 months, then $49 / month. Everything stays as it is.',
      action: 'Take 50% off',
      result: { status: 'Active', detail: '50% off your next 2 months · $24.50 a month', message: 'Done. Your next 2 months are 50% off.' },
    },
  ],
  s4: [
    {
      id: 'discount',
      title: '50% off your next 2 months',
      text: '$2.50 / month for your first 2 months after the trial, then $5 / month.',
      action: 'Take 50% off',
      result: { status: 'Trialing', detail: 'Then 50% off for your first 2 months', message: 'Done. Your first 2 months are 50% off.' },
    },
  ],
}

// What ends when each subscription is cancelled.
export const cancelEffects = {
  s1: ['Programmes included in your membership lock', 'Your monthly consultation allowance stops', 'Anything you bought on its own stays yours'],
  s2: ['You can’t buy new programmes after that date', 'Programmes you bought lock until you renew'],
  s4: ['Paid editions of the Sunday Letter stop', 'The free edition keeps arriving'],
  s6: ['Steady Energy locks when the subscription ends', 'Your progress and notes are kept if you come back'],
}

// ---------------------------------------------------------------- Settings

// Notifications the student can turn on or off, from the admin's student notification list
// (Settings → Notifications), grouped the same way. Channels: email and in-app, where the admin
// sends both. Community notifications start off for new members ("Members turn them on in their
// profile"); Adnan has turned some on. Account, purchase and billing emails always arrive.
export const notificationGroups = [
  {
    id: 'learning', title: 'Your learning',
    items: [
      { id: 'drip', label: 'New content unlocked', description: 'When a dripped lesson or episode opens.', email: true, inapp: true },
      { id: 'cohort', label: 'Cohort starting soon', description: 'A day before your cohort starts.', email: true, inapp: true },
      { id: 'graded', label: 'Quiz or assignment marked', description: 'When a practitioner marks your work.', email: true, inapp: true },
      { id: 'lessonreply', label: 'Reply in a lesson discussion', description: 'When someone replies to your question in a lesson.', email: true, inapp: true },
      { id: 'certificate', label: 'Certificate issued', description: 'With the certificate attached.', email: true, inapp: true },
      { id: 'badge', label: 'New badge level', description: 'When you reach the next badge level.', email: false, inapp: true },
    ],
  },
  {
    // The community app's own list (EzyCommunity → Settings → Notification → New activity). Reactions,
    // polls and new members are in-app only (no email option).
    id: 'community', title: 'Community', note: 'Activity in The Healing Circle.',
    items: [
      { id: 'feedComment', label: 'Comments on my posts', description: 'When someone comments on your post.', email: true, inapp: true },
      { id: 'commentReply', label: 'Replies to my comments', description: 'When someone replies to your comment.', email: true, inapp: true },
      { id: 'mention', label: 'Mentions', description: 'When someone mentions you.', email: true, inapp: true },
      { id: 'feedReaction', label: 'Reactions on my posts', description: 'When someone reacts to your post.', email: null, inapp: true },
      { id: 'commentReaction', label: 'Reactions on my comments', description: 'When someone reacts to your comment.', email: null, inapp: true },
      { id: 'poll', label: 'Polls', description: 'Poll activity.', email: null, inapp: true },
      { id: 'newMemberJoin', label: 'New members join', description: 'When new members join the community.', email: null, inapp: true },
      { id: 'channelNewPost', label: 'New posts in channels', description: 'When someone posts in channels you follow. Each channel’s own setting overrides this.', email: true, inapp: true },
      { id: 'reviewActivity', label: 'Review activity', description: 'Flagged content, posts waiting for review, and approval of your posts.', email: true, inapp: true },
    ],
  },
  {
    id: 'events', title: 'Appointments and events',
    items: [
      { id: 'apptremind', label: 'Appointment reminders', description: '24 hours and 1 hour before a session.', email: true, inapp: true },
      { id: 'eventremind', label: 'Event reminders', description: '24 hours and 1 hour before an event.', email: true, inapp: true },
      { id: 'eventlive', label: 'Event starting now', description: 'When an event you’re registered for goes live.', email: false, inapp: true },
      { id: 'recording', label: 'Recording available', description: 'When an event’s recording is published.', email: true, inapp: true },
    ],
  },
]

// Marketing email topics, as the school sets them up (Settings → Notifications → Marketing emails →
// topics). Each is on by default; "Unsubscribe from all marketing" turns them all off.
export const marketingTopics = [
  { id: 'general', label: 'General marketing', description: 'News, offers and announcements.', on: true },
  { id: 'product', label: 'Product information', description: 'New courses, products and updates to ones you own.', on: true },
  { id: 'event', label: 'Event information', description: 'Webinars, live sessions and events.', on: true },
  { id: 'responsive', label: 'Responsive marketing', description: 'Emails based on what you do, such as an unfinished checkout.', on: true },
  { id: 'notifications', label: 'Notifications', description: 'Optional reminders and updates sent by marketing email.', on: true },
]

// Always sent (transactional): shown so the student knows what they can't turn off.
export const alwaysSent = [
  'Receipts, invoices and refunds',
  'Sign-in codes, password and email changes, new device sign-ins',
  'Payment problems, renewals, trial and card-expiry reminders',
  'Booking and ticket confirmations, changes and cancellations',
]

// Two-step setup: the authenticator secret (shown as a QR code and as a key) and a one-time backup code.
export const twoStep = { key: 'JBSW Y3DP EHPK 3PXP', backupCode: '637140' }

export const devices = [
  { id: 'd1', name: 'MacBook Air · Chrome', where: 'Bristol, UK', lastActive: 'Active now', current: true },
  { id: 'd2', name: 'iPhone 15 · Safari', where: 'Bristol, UK', lastActive: 'Last active Tue 14 Oct' },
]
export const maxDevices = 3

export const languageOptions = [
  { code: 'en', title: 'English', description: 'Left to right' },
  { code: 'ar', title: 'العربية', description: 'Arabic · the layout mirrors, right to left' },
  { code: 'bn', title: 'বাংলা', description: 'Bengali · left to right' },
]
