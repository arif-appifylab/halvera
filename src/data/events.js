// Event products (type 'event'), spread into src/data/products.js. Each one shows a setting from
// the admin's Scheduling → Events screen. The `event` object mirrors those settings:
//
//   format        'virtual' | 'in-person'
//   platform      virtual only: 'zoom' | 'native' (Native meeting) | 'meet' (Google Meet); joinUrl is the room
//   venue         in person: { name, address, city }; hideVenue → "Hide venue" (shown to registrants only)
//   startsAt/endsAt  ISO times. Pages show them in the visitor's own time zone; timeZone is the
//                 organiser's (default Europe/London), shown as secondary text for in-person events
//   days          multi-day "Sessions" mode: one entry per day, each with its own time and agenda sessions
//   agenda        single-day agenda sessions; speakers: Hosts, speakers and guests (person → src/data/people.js)
//   recurring     { unit: 'week', every, count }: the first occurrence is startsAt/endsAt
//   perDate       "Per date" pricing: { limit, going: [per occurrence] } places for each date
//   registration  limit ("Limit registrations"), going, showCount ("Show registration count publicly"),
//                 waitlist ("Waitlist with auto-promotion") + waiting, deadline ("Registration deadline"),
//                 guest ("Guest registration"), countdown ("Countdown timer")
//   status        'cancelled' when the school cancels it; scheduled, live and ended come from the times
//   recordings    replays registrants can watch once it has ended
//   places        membership-only events: how many of a member's monthly event places it uses
//
// Every date is relative to today (wall-clock times in London), so each demo keeps its state
// against the real clock: upcoming, live, registration closed, ended, cancelled. Card meta is
// worked out from the dates in the visitor's zone (`get meta()`), never typed in.
// Legacy fields (location, online, seats, seatsLeft) stay for older screens.
import { media } from './media-credits.js'
import { wallTime, daysUntil, localDate } from '@/components/product/time.js'
import { ORGANISER_ZONE, eventMeta } from '@/components/event/dates.js'

const MIN = 60000
const TZ = ORGANISER_ZONE
const [SUN, TUE, WED, THU, FRI, SAT] = [0, 2, 3, 4, 5, 6]
// "hh:mm" London time, `days` after today.
const on = (days, hhmm) => wallTime(days, hhmm, TZ)
// Days until the next given weekday, plus whole weeks.
const next = (weekday, weeks = 0) => daysUntil(weekday, TZ) + weeks * 7
const plus = (iso, minutes) => new Date(new Date(iso).getTime() + minutes * MIN).toISOString()
// An agenda session `from`–`to` minutes after a start.
const session = (start, from, to, rest) => ({ startsAt: plus(start, from), endsAt: plus(start, to), ...rest })

// The two "right now" demos start relative to page load, and roll on to the next one when they
// end, so a page left open for hours still shows them live or about to start (never "Ended").
function rolling(event, { startIn, length, cycle }) {
  const base = Math.round((Date.now() + startIn * MIN) / MIN) * MIN
  const start = () => {
    const behind = Date.now() - (base + length * MIN)
    return base + (behind >= 0 ? (Math.floor(behind / (cycle * MIN)) + 1) * cycle * MIN : 0)
  }
  return Object.defineProperties(event, {
    startsAt: { enumerable: true, get: () => new Date(start()).toISOString() },
    endsAt: { enumerable: true, get: () => new Date(start() + length * MIN).toISOString() },
  })
}

const webinar = on(next(THU, 1), '18:30')
const bath = on(next(TUE, 3), '18:30')
const nourish1 = on(next(SAT, 5), '09:30')
const nourish2 = on(next(SAT, 5) + 1, '09:30')
const breathwork = on(next(WED, -2), '19:00') // started two weeks ago: some dates have passed
const heartCooking = on(next(WED), '19:00')
const autumn = on(-10, '19:30')
const london = on(-20, '10:30')
const mindful = on(next(SAT, 1), '10:00')
// The two events that live in src/data/products.js.
const spring = on(next(SAT, 3), '10:00')
const retreat = on(next(FRI, 7), '15:00')
export const eventTimes = {
  springWorkshop: { startsAt: spring, endsAt: plus(spring, 180) },
  retreat: { startsAt: retreat, endsAt: on(next(FRI, 7) + 2, '14:00') },
}
export { eventMeta }

const amaraHost = { person: 'amara', kind: 'Host' }

export const eventProducts = [
  {
    slug: 'gut-brain-webinar', type: 'event', category: 'gut-health', practitioner: 'amara',
    image: media['post-why-your-gut-reacts-to-stress'].url,
    title: 'The gut–brain connection: a live webinar',
    summary: 'An evening talk on how stress shows up in digestion, with time for your questions.',
    description: [
      'Chidi walks through what happens in your gut when life gets busy, and the small, steady habits that help. Bring a cup of tea and your questions.',
      'The webinar runs on Zoom. Everyone who registers gets the recording afterwards.',
    ],
    visibility: 'public', availability: 'available', siteAccessExcluded: true,
    get meta() { return eventMeta(this, { icon: 'video', label: 'Online on Zoom' }) },
    event: {
      format: 'virtual', platform: 'zoom', joinUrl: 'https://zoom.us/j/84120931177',
      startsAt: webinar, endsAt: plus(webinar, 75),
      registration: { limit: 40, going: 32, showCount: true, waitlist: true, waiting: 0, countdown: true },
      speakers: [amaraHost],
      agenda: [
        session(webinar, 0, 10, { id: 'a1', title: 'Welcome and a settling breath', speakers: ['amara'] }),
        session(webinar, 10, 50, { id: 'a2', title: 'Your gut under stress', description: 'What the gut–brain axis is, in plain words, and why digestion changes on hard weeks.', speakers: ['amara'] }),
        session(webinar, 50, 75, { id: 'a3', title: 'Your questions', speakers: ['amara'] }),
      ],
      online: true, location: 'Online on Zoom', seats: 40, seatsLeft: 8,
    },
    prices: [{ id: 'ticket', kind: 'one-time', label: 'Ticket', amount: 15, price: { amount: '$15' } }],
    includes: ['75-minute live webinar', 'Live Q&A with Chidi', 'Recording for everyone who registers'],
    faqs: [{ question: 'What if I can’t make it live?', answer: 'Register anyway. We email the recording to everyone the next morning.' }],
  },
  {
    slug: 'hormone-qa-live', type: 'event', category: 'mens-health', practitioner: 'leah',
    image: media['condition-mens-health'].url,
    title: 'Ask Owen: energy, hormones and sleep, live',
    summary: 'A free hour of questions and answers on energy, midlife changes and rest.',
    description: ['Owen answers your questions live in our own meeting room. Send one in when you join, or simply listen.'],
    visibility: 'public', availability: 'available', siteAccessExcluded: true,
    get meta() { return eventMeta(this, { icon: 'video', label: 'Online' }) },
    event: rolling({
      format: 'virtual', platform: 'native', joinUrl: 'https://meet.halvera.example/ask-owen',
      registration: { going: 118, showCount: true, countdown: true },
      speakers: [{ person: 'leah', kind: 'Host' }],
      online: true, location: 'Online',
    }, { startIn: -20, length: 60, cycle: 90 }),
    prices: [{ id: 'free', kind: 'free', label: 'Free', amount: 0, price: { amount: 0 } }],
    includes: ['One hour of live Q&A', 'Recording for everyone who registers'],
    faqs: [],
  },
  {
    slug: 'midlife-sleep-evening-bath', type: 'event', category: 'mens-health', practitioner: 'leah',
    image: media['post-midlife-sleep'].url,
    title: 'Midlife, sleep and you: an evening talk',
    summary: 'A free, friendly talk in Bath on sleeping well through your forties, fifties and beyond.',
    description: [
      'An hour with Owen on why sleep often changes for men in midlife, from stress and weight to waking in the night, and what tends to help, followed by tea and time to talk.',
      'No account needed. Register with your name and email and we’ll send your ticket.',
    ],
    visibility: 'public', availability: 'available', siteAccessExcluded: true,
    get meta() { return eventMeta(this, { icon: 'map-pin', label: 'Bath' }) },
    event: {
      format: 'in-person', hideVenue: true,
      venue: { name: 'The Reading Room', address: '6 Queen Square, Bath BA1 2HE', city: 'Bath' },
      startsAt: bath, endsAt: plus(bath, 90),
      registration: { limit: 60, going: 41, showCount: true, guest: true, countdown: true },
      speakers: [{ person: 'leah', kind: 'Host' }],
      beforeYouCome: ['Doors open at 18:15, and there’s tea when you arrive', 'The room is step-free, with an accessible toilet', 'Give your name at the door; your ticket number is in your confirmation email'],
      online: false, location: 'Bath', seats: 60, seatsLeft: 19,
    },
    prices: [{ id: 'free', kind: 'free', label: 'Free', amount: 0, price: { amount: 0 } }],
    includes: ['A 45-minute talk', 'Tea and time for questions', 'A take-home sleep guide'],
    faqs: [],
  },
  {
    slug: 'nourish-weekend', type: 'event', category: 'gut-health', practitioner: 'amara',
    image: media['condition-gut-health'].url,
    title: 'Nourish: a two-day gut health workshop',
    summary: 'Two online mornings of talks, cooking and practice with Chidi and guests.',
    description: [
      'A weekend workshop for anyone who wants to understand their gut and cook for it with confidence. Each morning has its own sessions and its own join link.',
      'Every session is recorded, so you can catch up on anything you miss.',
    ],
    visibility: 'public', availability: 'available', siteAccessExcluded: true,
    get meta() { return eventMeta(this, { icon: 'video', label: '2 mornings online' }) },
    event: {
      format: 'virtual', platform: 'zoom', joinUrl: 'https://zoom.us/j/86610244530',
      startsAt: nourish1, endsAt: plus(nourish2, 180),
      registration: { limit: 120, going: 87, showCount: true, waitlist: true, waiting: 0, deadline: on(next(SAT, 5) - 2, '18:00'), countdown: true },
      speakers: [
        amaraHost,
        { person: 'leah', kind: 'Speaker' },
        { id: 'tomas', name: 'Tomás Reyes', role: 'Chef and cookbook author', kind: 'Guest' },
        { id: 'henry', name: 'Henry Clarke', role: 'Specialist gut health dietitian', kind: 'Guest' },
      ],
      days: [
        {
          id: 'd1', label: 'Day 1', startsAt: nourish1, endsAt: plus(nourish1, 180), sessions: [
            session(nourish1, 0, 15, { id: 's1', title: 'Welcome and housekeeping', speakers: ['amara'] }),
            session(nourish1, 15, 75, { id: 's2', title: 'How your gut works, gently explained', description: 'Digestion from start to finish, and what your symptoms may be telling you.', speakers: ['amara'] }),
            session(nourish1, 90, 150, { id: 's3', title: 'Fibre without the bloat', description: 'How to add fibre slowly, and which foods to start with.', speakers: ['henry'] }),
            session(nourish1, 150, 180, { id: 's4', title: 'Questions and close', speakers: ['amara', 'henry'] }),
          ],
        },
        {
          id: 'd2', label: 'Day 2', startsAt: nourish2, endsAt: plus(nourish2, 180), sessions: [
            session(nourish2, 0, 60, { id: 's5', title: 'Cook-along: three calm-gut suppers', description: 'Cook with Tomás in your own kitchen. The shopping list arrives a week before.', speakers: ['tomas'] }),
            session(nourish2, 75, 135, { id: 's6', title: 'Stress hormones and digestion', description: 'Why symptoms can flare in a busy week, and what helps.', speakers: ['leah'] }),
            session(nourish2, 135, 180, { id: 's7', title: 'Your plan for the weeks ahead', speakers: ['amara'] }),
          ],
        },
      ],
      online: true, location: 'Online on Zoom', seats: 120, seatsLeft: 33,
    },
    prices: [
      { id: 'once', kind: 'one-time', label: 'One payment', amount: 120, price: { amount: '$120', strike: '$150' }, note: `Early-bird price until ${localDate(on(next(SUN, 2), '12:00'))}` },
      { id: 'plan', kind: 'installments', label: '3 monthly payments', amount: 42, count: 3, price: { amount: '$42', installments: 3, total: '$126' } },
    ],
    includes: ['Two mornings of live sessions', 'A cook-along with a shopping list', 'Recordings of every session', 'Workshop workbook (PDF)'],
    faqs: [{ question: 'Do I have to come to both days?', answer: 'It works best together, but every session is recorded, so you can catch up on either day.' }],
  },
  {
    slug: 'wednesday-breathwork', type: 'event', category: 'stress', practitioner: 'samir',
    image: media['post-breathing-for-sleep'].url,
    title: 'Wednesday breathwork evenings',
    summary: 'A weekly 45-minute breathwork class online to settle into the evening.',
    description: [
      'Every Wednesday, Samir guides a slow breathwork practice you can do sitting or lying down. Come to one, or make it part of your week.',
      'Ongoing access lets you join any evening while you’re subscribed. Pick the dates you want and pay for each one, or get the term pass for every date in this run.',
    ],
    visibility: 'public', availability: 'available', siteAccessExcluded: true,
    get meta() { return eventMeta(this, { icon: 'clock', label: '45 minutes' }) },
    event: {
      format: 'virtual', platform: 'native', joinUrl: 'https://meet.halvera.example/breathwork',
      startsAt: breathwork, endsAt: plus(breathwork, 45),
      recurring: { unit: 'week', every: 1, count: 12 },
      // "Per date": places for each evening (going, per date in order).
      perDate: { limit: 20, going: [18, 20, 15, 20, 13, 9, 7, 6, 4, 3, 2, 1] },
      registration: { going: 54, showCount: true, countdown: true },
      speakers: [{ person: 'samir', kind: 'Host' }],
      online: true, location: 'Online',
    },
    prices: [
      { id: 'monthly', kind: 'subscription', label: 'Ongoing access', amount: 20, interval: 'month', default: true, price: { amount: '$20', interval: 'month', note: 'Join any evening while subscribed' } },
      { id: 'term', kind: 'one-time', label: 'All dates this term', amount: 150, price: { amount: '$150', strike: '$180', note: 'Every date in this run' } },
      { id: 'term-plan', kind: 'installments', label: 'All dates in 3 payments', amount: 52, count: 3, price: { amount: '$52', installments: 3, total: '$156' } },
      // Per date (admin Sell → Per date, "Charge for each date booked"): one charge, at checkout,
      // for each date picked. A one-time price, so it can go in the cart.
      { id: 'per-date', kind: 'one-time', perDate: true, label: 'Pick your dates', amount: 12, price: { amount: '$12', interval: 'date', note: 'Pay for each evening you choose' } },
    ],
    includes: ['A live 45-minute class every Wednesday', 'Recordings for 7 days after each class', 'A short practice to use between classes'],
    faqs: [{ question: 'Can I cancel ongoing access?', answer: 'Yes, any time from your dashboard. You keep access until the end of the month you’ve paid for.' }],
  },
  {
    slug: 'members-checkin', type: 'event', category: 'gut-health', practitioner: 'amara',
    image: media['condition-energy'].url,
    title: 'Members’ monthly check-in with Chidi',
    summary: 'A small online group for members to share progress and ask questions.',
    description: ['Once a month, Chidi opens a room for members. Bring what’s working, what isn’t, and anything you’d like to ask.'],
    visibility: 'membership', availability: 'available', plans: ['supported', 'founding'], siteAccessExcluded: true,
    get meta() { return eventMeta(this, { icon: 'users', label: 'Members only' }) },
    event: rolling({
      format: 'virtual', platform: 'native', joinUrl: 'https://meet.halvera.example/members-checkin',
      places: 1,
      registration: { limit: 20, going: 14, showCount: true, countdown: true },
      speakers: [amaraHost],
      online: true, location: 'Online',
    }, { startIn: 10, length: 60, cycle: 90 }),
    prices: [],
    includes: ['A 60-minute small-group call', 'Uses one of your monthly event places'],
    faqs: [],
  },
  {
    slug: 'heart-healthy-cooking-workshop', type: 'event', category: 'mens-health', practitioner: 'leah',
    image: media['post-prostate-friendly-eating'].url,
    title: 'Cooking for a healthy heart: online workshop',
    summary: 'A practical evening of simple, filling meals that look after your heart.',
    description: ['Owen cooks easy suppers built on beans, oily fish, wholegrains and olive oil, with a shopping list sent to registrants before the day.'],
    visibility: 'public', availability: 'available', siteAccessExcluded: true,
    get meta() { return eventMeta(this, { icon: 'video', label: 'Online on Google Meet' }) },
    event: {
      format: 'virtual', platform: 'meet', joinUrl: 'https://meet.google.com/hhb-hart-wks',
      startsAt: heartCooking, endsAt: plus(heartCooking, 90),
      registration: { limit: 50, going: 38, showCount: true, deadline: on(next(WED) - 7, '19:00'), countdown: true },
      speakers: [{ person: 'leah', kind: 'Host' }],
      online: true, location: 'Online on Google Meet', seats: 50, seatsLeft: 12,
    },
    prices: [{ id: 'ticket', kind: 'one-time', label: 'Ticket', amount: 25, price: { amount: '$25' } }],
    includes: ['90-minute live workshop', 'Recipes for the week ahead'],
    faqs: [],
  },
  {
    slug: 'autumn-immunity-talk', type: 'event', category: 'gut-health', practitioner: 'amara',
    image: media['post-miso-ginger-and-greens-soup'].url,
    title: 'Autumn immunity and your gut',
    summary: 'A recorded talk on keeping well through the colder months, starting with the gut.',
    description: ['Recorded live in October. Chidi covers seasonal eating, sleep and the gut’s part in staying well, then answers questions.'],
    visibility: 'public', availability: 'available', siteAccessExcluded: true,
    get meta() { return eventMeta(this, { icon: 'play', label: 'Replay available' }) },
    event: {
      format: 'virtual', platform: 'zoom', joinUrl: 'https://zoom.us/j/81200774415',
      startsAt: autumn, endsAt: plus(autumn, 80),
      registration: { going: 146, showCount: true },
      speakers: [amaraHost],
      recordings: [
        { id: 'talk', title: 'The talk', duration: '58:12' },
        { id: 'qa', title: 'Questions and answers', duration: '21:40' },
      ],
      online: true, location: 'Online on Zoom',
    },
    prices: [{ id: 'replay', kind: 'one-time', label: 'Replay', amount: 12, price: { amount: '$12' } }],
    includes: ['The full talk and Q&A recordings', 'Slides (PDF)'],
    faqs: [],
  },
  {
    slug: 'sleep-reset-london', type: 'event', category: 'sleep', practitioner: 'samir',
    image: media['condition-sleep'].url,
    title: 'Sleep reset morning: London',
    summary: 'A morning of practical sleep habits and a guided wind-down practice.',
    description: ['A small in-person morning in Islington with Samir. This one wasn’t recorded.'],
    visibility: 'public', availability: 'sales-ended', siteAccessExcluded: true,
    get meta() { return eventMeta(this, { icon: 'map-pin', label: 'London' }) },
    event: {
      format: 'in-person',
      venue: { name: 'Canonbury Studio', address: '21 Alwyne Place, London N1 2NL', city: 'London' },
      startsAt: london, endsAt: plus(london, 180),
      registration: { limit: 20, going: 20, showCount: true },
      speakers: [{ person: 'samir', kind: 'Host' }],
      online: false, location: 'London', seats: 20, seatsLeft: 0,
    },
    prices: [{ id: 'ticket', kind: 'one-time', label: 'Ticket', amount: 45, price: { amount: '$45' } }],
    includes: ['3-hour session', 'Breakfast'],
    faqs: [],
  },
  {
    slug: 'mindful-morning-bath', type: 'event', category: 'mindful-eating', practitioner: 'leah',
    image: media['condition-mindful-eating'].url,
    title: 'Mindful eating morning: Bath',
    summary: 'A slow brunch and a guided practice on noticing hunger and fullness.',
    description: ['A relaxed Saturday morning with Owen: a guided practice, a shared brunch and time to talk.'],
    visibility: 'public', availability: 'sales-ended', siteAccessExcluded: true,
    get meta() { return eventMeta(this, { icon: 'map-pin', label: 'Bath' }) },
    event: {
      format: 'in-person',
      venue: { name: 'Larkhall Kitchen', address: '3 St Saviours Road, Bath BA1 6RT', city: 'Bath' },
      startsAt: mindful, endsAt: plus(mindful, 150),
      registration: { limit: 18, going: 12, showCount: true },
      speakers: [{ person: 'leah', kind: 'Host' }],
      status: 'cancelled',
      cancelled: { on: localDate(on(-4, '09:00')), note: 'Owen is unwell, so we’ve cancelled this morning. We’re sorry for the change of plans.' },
      online: false, location: 'Bath', seats: 18, seatsLeft: 6,
    },
    prices: [{ id: 'ticket', kind: 'one-time', label: 'Ticket', amount: 25, price: { amount: '$25' } }],
    includes: ['A guided practice', 'Brunch'],
    faqs: [],
  },
]
