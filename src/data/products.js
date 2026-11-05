// Every product the school sells. Shapes follow what the EzyCourse admin can set:
//   type          course | cohort | bundle | coaching | community | event | media-library | asset-library | newsletter
//                 (asset-library: the school's Library; access and prices are per item, see src/data/library.js)
//   visibility    public | membership (only through a plan) | private (request access, approved in Sell → Approvals)
//   availability  available | sold-out | sales-ended | enrolment-closed | pre-order
//   prices        one or more; kind: one-time | subscription | installments | free | pwyw (pay what you want)
// Amounts are numbers for the mock server (src/lib/commerce.js) plus a display string. Pages show the string only.
import { media } from './media-credits.js'
import { categories as libraryCategories, files as libraryFiles } from './library.js'
import { eventProducts, eventTimes, eventMeta } from './events.js'

// Media library episodes, in the admin's Episodes order. A `{ divider }` row groups the episodes below it.
// Episode: id, title, duration, tag 'Main' | 'Bonus' (classification, default Main), free ("Available for
// free": plays in full for everyone and is never dripped), days (release 'days' mode: days after purchase),
// unlocksAt (release 'date' mode: this episode's own moment), download ("Downloadable").
// Show notes and transcripts live in src/data/media-library.js.
const restEpisodes = [
  { divider: 'Short breaks' },
  { id: 'box-breathing', title: 'Box breathing for busy days', duration: '05:10', free: true },
  { id: 'morning-reset', title: 'Morning reset', duration: '08:45', tag: 'Bonus' },
  { id: 'softer-lunch', title: 'A softer lunch break', duration: '06:20' },
  { divider: 'Wind down' },
  { id: 'body-scan', title: 'Body scan for sleep', duration: '18:30' },
  { id: 'letting-go', title: 'Letting the day go', duration: '12:40' },
  { divider: 'Sleep stories' },
  { id: 'lighthouse', title: 'The lighthouse keeper (sleep story)', duration: '32:00' },
  { id: 'orchard', title: 'A walk through the orchard (sleep story)', duration: '28:15', tag: 'Bonus' },
]
const retreatEpisodes = [
  { divider: 'Saturday' },
  { id: 'opening-circle', title: 'Opening circle', duration: '22:00' },
  { id: 'breath-by-the-water', title: 'Breathwork by the water', duration: '31:40' },
  { id: 'yoga-nidra', title: 'Yoga nidra', duration: '35:10' },
  { divider: 'Sunday' },
  { id: 'dawn-practice', title: 'Dawn practice', duration: '26:30' },
  { id: 'closing-circle', title: 'Closing circle and what to take home', duration: '19:15', tag: 'Bonus' },
]
const movementEpisodes = [
  { divider: 'Start here' },
  { id: 'welcome', title: 'Welcome, and how to use these classes', duration: '04:20', free: true },
  { id: 'warm-up', title: 'A 10-minute gentle warm-up', duration: '10:05', free: true },
  { divider: 'Morning classes' },
  { id: 'wake-up-flow', title: 'Wake-up flow for stiff mornings', duration: '18:40' },
  { id: 'hip-openers', title: 'Hip openers for desk days', duration: '22:10' },
  { id: 'balance', title: 'Standing balance, step by step', duration: '16:30' },
  { divider: 'Evening classes' },
  { id: 'floor-unwind', title: 'Floor-based unwind', duration: '24:00' },
  { id: 'gentle-twists', title: 'Gentle twists for digestion', duration: '14:45', tag: 'Bonus' },
  { id: 'legs-up', title: 'Legs up the wall, guided rest', duration: '12:00' },
]
const podcastEpisodes = [
  { id: 'gut-and-stress', title: 'Why your gut reacts to stress', duration: '32:10', free: true },
  { id: 'fibre-gently', title: 'Fibre without the bloat', duration: '28:45' },
  { id: 'eating-pace', title: 'Eating pace, and why it matters', duration: '24:30' },
  { id: 'listener-questions-1', title: 'Your questions: food diaries and flare-ups', duration: '18:20', tag: 'Bonus' },
  { id: 'sleep-and-digestion', title: 'Sleep and digestion, a two-way street', duration: '35:05' },
  { id: 'fermented-foods', title: 'Fermented foods, gently', duration: '29:15' },
  { id: 'hormones-and-gut', title: 'Hormones and the gut, with Owen Marsh', duration: '41:00' },
  { id: 'eating-out', title: 'Eating out without the worry', duration: '26:40' },
  { id: 'listener-questions-2', title: 'Your questions: travel and routine', duration: '21:10', tag: 'Bonus' },
  { id: 'kind-movement', title: 'Kind movement for a calmer gut', duration: '27:35' },
  { id: 'breath-and-belly', title: 'Breath and belly, with Samir Haddad', duration: '33:20' },
  { id: 'winter-meals', title: 'Warming meals for winter', duration: '30:00' },
  { id: 'setbacks', title: 'When symptoms come back', duration: '28:10' },
  { id: 'year-one', title: 'What a year of listening taught us', duration: '38:45' },
]
const calmEpisodes = [
  { divider: 'First steps' },
  { id: 'orienting', title: 'Noticing where you are', duration: '09:30', days: 0, free: true },
  { id: 'long-exhale', title: 'The long exhale', duration: '11:15', days: 1 },
  { id: 'humming', title: 'Humming and the vagus nerve', duration: '10:40', days: 2 },
  { id: 'grounding', title: 'Feet on the floor', duration: '12:05', days: 3 },
  { divider: 'Going deeper' },
  { id: 'shaking-off', title: 'Shaking off the day', duration: '08:50', days: 4 },
  { id: 'safe-place', title: 'A safe place to rest', duration: '15:20', days: 5 },
  { id: 'gentle-tension', title: 'Tension and release', duration: '14:00', days: 6 },
  { divider: 'Keeping it going' },
  { id: 'everyday-calm', title: 'Calm in everyday moments', duration: '10:10', days: 7 },
  { id: 'evening-wind-down', title: 'Your evening wind-down', duration: '16:30', days: 8 },
  { id: 'your-plan', title: 'Your plan from here', duration: '12:45', days: 9, tag: 'Bonus' },
]
const mensHealthEveningEpisodes = [
  { divider: 'Live recordings' },
  { id: 'energy-basics', title: 'Energy and testosterone, explained', duration: '52:00', unlocksAt: '2026-10-06T18:00:00Z' },
  { id: 'blood-sugar', title: 'Blood sugar and mood', duration: '48:30', unlocksAt: '2026-10-13T18:00:00Z' },
  { id: 'midlife-changes', title: 'Midlife changes, plainly', duration: '55:10', unlocksAt: '2026-10-20T18:00:00Z' },
  { id: 'sleep-and-hormones', title: 'Sleep and hormones', duration: '50:00', unlocksAt: '2026-10-27T19:00:00Z' },
  { id: 'your-questions', title: 'Your questions answered', duration: '58:00', unlocksAt: '2026-11-03T19:00:00Z' },
  { divider: 'Extras' },
  { id: 'energy-tracking', title: 'How to track your energy and sleep', duration: '09:40', tag: 'Bonus', free: true },
]
const summerEpisodes = [
  { id: 'cooling-breath', title: 'Cooling breath for warm days', duration: '07:30' },
  { id: 'morning-sun', title: 'A morning practice in the sun', duration: '14:15' },
  { id: 'heavy-evenings', title: 'Breath for heavy summer evenings', duration: '12:00' },
]
// Morning Reset Audio: included in Essentials only (not in Supported or Founding member), so the plan
// picker shows Essentials alone.
const morningEpisodes = [
  { id: 'first-light', title: 'First light: a 3-minute wake-up breath', duration: '03:20', free: true },
  { id: 'kettle-on', title: 'While the kettle boils', duration: '05:40' },
  { id: 'slow-start', title: 'A slow start for a busy day', duration: '09:15' },
  { id: 'walk-in', title: 'Walking into the day', duration: '11:30' },
]
const episodeCount = (list) => list.filter((e) => !e.divider).length

export const products = [
  {
    slug: 'gut-health-reset', type: 'course', category: 'gut-health', practitioner: 'amara',
    image: media['product-gut-health-reset'].url,
    title: 'Gut Health Reset',
    summary: 'Six weeks of gentle changes to calm digestion and understand your triggers.',
    description: [
      'A self-paced programme for people who are tired of guessing what upsets their stomach. Each week adds one small change: eating pace, meal timing, fibre, stress and sleep.',
      'You get short video lessons, printable meal guides and a symptom tracker, plus a monthly live Q&A with Chidi.',
    ],
    visibility: 'public', availability: 'available', certificate: true, access: 'Lifetime access',
    meta: [{ icon: 'clock', label: '6 weeks' }, { icon: 'video', label: '25 lessons' }],
    rating: { value: 4.9, count: 128 }, students: 1240,
    prices: [
      { id: 'once', kind: 'one-time', label: 'One payment', amount: 149, price: { amount: '$149', strike: '$199' }, note: 'Sale ends Sun 26 Oct' },
      { id: 'plan', kind: 'installments', label: '3 monthly payments', amount: 55, count: 3, price: { amount: '$55', installments: 3, total: '$165' } },
    ],
    includes: ['25 lessons: short videos, an interactive video, readings, audio practices, slides and practice quizzes', 'Printable meal guides, a symptom tracker and The calm gut handbook', 'Practice tools, including an AI practice coach', 'Monthly live Q&A with Chidi', 'Certificate of completion', 'Lifetime access, including updates'],
    curriculum: [
      {
        title: 'Week 1 · Settle in', lessons: [
          { id: 'welcome', title: 'Welcome and how to use this programme', type: 'video', duration: '06:12', preview: true },
          { id: 'how-it-works', title: 'How this programme works', type: 'text', duration: '6 min read', preview: true },
          { id: 'gut-basics', title: 'Your gut, in eight slides', type: 'slide', duration: '8 slides', preview: true },
          { id: 'tracker', title: 'Your symptom tracker', type: 'pdf', duration: 'PDF', preview: true },
          { id: 'intake', title: 'Getting-started survey', type: 'survey', duration: '5 questions' },
          { id: 'starter-kit', title: 'Starter kit: planner and shopping list', type: 'download', duration: '3 files' },
          { id: 'pace', title: 'Eating pace and the first change', type: 'video', duration: '11:40' },
        ],
      },
      {
        title: 'Week 2 · Timing and rhythm', lessons: [
          { id: 'breathing', title: 'A calm breath before meals', type: 'audio', duration: '04:30' },
          { id: 'timing', title: 'Meal timing that suits your day', type: 'video', duration: '09:05' },
          { id: 'timing-interactive', title: 'Meal timing, step by step', type: 'interactive', duration: '0:29' },
          { id: 'meal-planner', title: 'Plan your meal rhythm', type: 'embedded', duration: 'Interactive tool', prereq: true },
          { id: 'rhythm-map', title: 'Map your weekday meals', type: 'assignment', duration: 'Assignment' },
          { id: 'coach', title: 'Practise with the AI coach', type: 'ai', duration: 'Practice chat' },
          { id: 'dropin', title: 'Drop-in Q&A replay: your first fortnight', type: 'live', duration: '42:00' },
          { id: 'quiz-1', title: 'Check-in quiz', type: 'quiz', duration: '20 questions', prereq: true },
        ],
      },
      {
        title: 'Week 3 · Fibre, gently', lessons: [
          { id: 'fibre', title: 'Building fibre without the bloat', type: 'video', duration: '12:20', drip: 'Mon 27 Oct' },
          { id: 'recipes', title: 'Recipe pack: soups and stews', type: 'download', duration: 'PDF', drip: 'Mon 27 Oct' },
          { id: 'food-diary', title: 'Food diary training', type: 'scorm', duration: '15 minutes' },
          { id: 'fibre-steps', title: 'Adding fibre, step by step', type: 'multiple', duration: '4 parts' },
        ],
      },
      {
        title: 'Weeks 4–6 · Stress, sleep and keeping going', lessons: [
          { id: 'stress', title: 'The gut–brain connection', type: 'video', duration: '14:02', drip: 'Mon 3 Nov' },
          { id: 'handbook', title: 'The calm gut handbook', type: 'ebook', duration: '12 pages' },
          { id: 'live', title: 'Live Q&A replay', type: 'live', duration: '58:00', drip: 'Mon 10 Nov' },
          { id: 'assignment', title: 'Your plan for the next three months', type: 'assignment', duration: 'Assignment', drip: 'Mon 17 Nov' },
        ],
      },
      {
        // Embedded lessons with embed code (Admin → Embedded → "Embed URL or code"): video walkthrough boards
        // (src/components/player/AnswerBoard.jsx). shownAs: they show with the video icon and label.
        title: 'Video explanations', lessons: [
          { id: 'label-answers', title: 'Reading food labels: answers explained', type: 'embedded', shownAs: 'video' },
          { id: 'check-in-answers', title: 'Gut health check-in: answers explained', type: 'embedded', shownAs: 'video' },
        ],
      },
      {
        title: 'Extra practice', lessons: [
          { id: 'check-in-all', title: 'Quick check-in: Sam’s day', type: 'quiz', duration: '8 questions' },
          { id: 'ielts-practice', title: 'Practice test: Listening, reading, writing and speaking', type: 'quiz', duration: '22 questions' },
        ],
      },
    ],
    faqs: [
      { question: 'How long do I have access?', answer: 'For life, including any updates we make to the programme.' },
      { question: 'What if it is not right for me?', answer: 'You can ask for a full refund within 14 days of buying. See our refund policy.' },
      { question: 'Can I do this alongside medical treatment?', answer: 'Yes. This programme supports, and never replaces, care from your doctor.' },
    ],
  },
  {
    slug: 'mens-health-circle', type: 'cohort', category: 'mens-health', practitioner: 'leah',
    image: media['product-mens-health-circle'].url,
    title: 'Men’s Health Circle',
    summary: 'A small live group meeting weekly to look after your energy, heart and sleep together.',
    description: ['Eight weeks, twelve people, one practitioner. We meet every Tuesday evening on Zoom, with short lessons to watch in between.'],
    visibility: 'public', availability: 'available', certificate: false, access: 'Access for 12 months',
    meta: [{ icon: 'calendar', label: 'Next cohort starts Tue 3 Nov' }, { icon: 'users', label: '4 places left' }],
    rating: { value: 5, count: 41 }, students: 96,
    // starts … enrolmentCloses: the next cohort open for enrolment, for cards and summaries.
    // The rest mirrors the admin's Cohort course screen (Product settings and each cohort's settings).
    cohort: {
      starts: 'Tue 3 Nov', ends: 'Tue 22 Dec', schedule: 'Tuesdays, 19:00–20:15 (London)', seats: 12, seatsLeft: 4, enrolmentCloses: 'Fri 30 Oct',
      weeks: 8,
      release: 'weekly', // Release: weekly (One chapter a week) | all (Everything on the start date) | dates
      time: '19:00', timeZone: 'Europe/London', sessionMinutes: 75, location: 'Zoom', recordings: true,
      routing: 'choose', // Enrollment routing: next | late | choose (Let users choose at checkout)
      whenFull: 'next', // When a cohort is full: next (Send users to the next cohort) | waitlist
      countdown: true, // Show a countdown before the cohort starts
      community: 'https://fit.ezycommunity.com/feeds', // Enable community for this cohort (EzyCommunity)
      runs: [
        { id: 'sep-2026', name: 'September 2026', start: '2026-09-29', enrolmentCloses: '2026-09-29', seats: 12, enrolled: 12 },
        { id: 'nov-2026', name: 'November 2026', start: '2026-11-03', enrolmentCloses: '2026-10-30', seats: 12, enrolled: 8 },
        { id: 'jan-2027', name: 'January 2027', start: '2027-01-12', enrolmentCloses: '2027-01-08', seats: 12, enrolled: 0 },
      ],
    },
    prices: [
      { id: 'once', kind: 'one-time', label: 'One payment', amount: 289, price: { amount: '$289' } },
      { id: 'plan', kind: 'installments', label: '3 monthly payments', amount: 99, count: 3, price: { amount: '$99', installments: 3, total: '$297' } },
    ],
    includes: ['8 live group sessions', 'Short lessons between sessions', 'Private group chat', 'Session replays for 12 months'],
    // Cohort-paced: "Before we start" (bonus: ignores drip) opens on enrolment; week N opens on
    // the cohort's start date + (N - 1) weeks. Live sessions fall on that day at cohort.time.
    curriculum: [
      { title: 'Before we start', bonus: true, lessons: [
        { id: 'intro', title: 'Meet your circle', type: 'video', duration: '04:30', preview: true },
        { id: 'energy-diary', title: 'Your energy and sleep diary', type: 'download', duration: 'PDF' },
      ] },
      { title: 'Week 1 · Your energy, mapped', lessons: [
        { id: 'w1-video', title: 'What drives your energy, simply', type: 'video', duration: '12:10' },
        { id: 's1', title: 'Live session 1: Your energy, mapped', type: 'live', duration: '75 min' },
      ] },
      { title: 'Week 2 · Blood sugar and mood', lessons: [
        { id: 'w2-video', title: 'Steadier blood sugar, steadier mood', type: 'video', duration: '10:45' },
        { id: 's2', title: 'Live session 2: Blood sugar and mood', type: 'live', duration: '75 min' },
      ] },
      { title: 'Week 3 · Sleep and your hormones', lessons: [
        { id: 'w3-video', title: 'Why sleep shifts in midlife', type: 'video', duration: '11:20' },
        { id: 's3', title: 'Live session 3: Sleep and your hormones', type: 'live', duration: '75 min' },
      ] },
      { title: 'Week 4 · Stress and cortisol', lessons: [
        { id: 'w4-video', title: 'Stress, cortisol and burnout', type: 'video', duration: '09:50' },
        { id: 's4', title: 'Live session 4: Stress and cortisol', type: 'live', duration: '75 min' },
      ] },
      { title: 'Week 5 · Food that supports you', lessons: [
        { id: 'w5-video', title: 'Building a heart-friendly plate', type: 'video', duration: '13:05' },
        { id: 's5', title: 'Live session 5: Food that supports you', type: 'live', duration: '75 min' },
      ] },
      { title: 'Week 6 · Movement and recovery', lessons: [
        { id: 'w6-video', title: 'Training, rest and recovery after 40', type: 'video', duration: '08:40' },
        { id: 's6', title: 'Live session 6: Movement and recovery', type: 'live', duration: '75 min' },
      ] },
      { title: 'Week 7 · Talking to your GP', lessons: [
        { id: 'w7-video', title: 'Preparing for a GP appointment', type: 'video', duration: '07:55' },
        { id: 's7', title: 'Live session 7: Your questions', type: 'live', duration: '75 min' },
      ] },
      { title: 'Week 8 · Keeping it going', lessons: [
        { id: 'w8-video', title: 'Your plan for the months ahead', type: 'video', duration: '10:10' },
        { id: 's8', title: 'Live session 8: Closing circle', type: 'live', duration: '75 min' },
      ] },
    ],
    faqs: [
      { question: 'What if I miss a session?', answer: 'Every session is recorded and posted within a day.' },
      { question: 'Can I choose my cohort?', answer: 'Yes. At checkout you pick from every cohort that’s still open, with its dates and the places left.' },
    ],
  },
  {
    slug: 'calm-gut-bundle', type: 'bundle', category: 'gut-health', practitioner: 'amara',
    image: media['product-calm-gut-bundle'].url,
    title: 'The Calm Gut Bundle',
    summary: 'Gut Health Reset, Calm Gut Kitchen and the Recipes and meal plans library together, for less.',
    description: ['Everything you need to calm your digestion and keep meals simple afterwards. Start with Gut Health Reset, then take what you’ve learned into the kitchen.'],
    visibility: 'public', availability: 'available', access: 'Lifetime access',
    meta: [{ icon: 'book', label: '3 products' }],
    bundle: ['gut-health-reset', 'calm-gut-kitchen'], // in list order (Progressive mode follows it)
    library: ['category:recipes'], // library items this bundle unlocks (src/data/library.js)
    // Admin → Bundle course: Progressive mode ("Users must finish each course before the next opens"),
    // the bundle certificate and "Allow component certificates" (each course issues its own too).
    progressive: true, certificate: true, componentCertificates: true,
    prices: [{ id: 'once', kind: 'one-time', label: 'One payment', amount: 169, price: { amount: '$169', strike: '$207' } }],
    includes: ['Gut Health Reset (course)', 'Calm Gut Kitchen (course)', 'Recipes and meal plans (library category)', 'A bundle certificate when you finish both courses', 'Save $38 compared with buying separately'],
    faqs: [],
  },
  {
    // Sold with The Calm Gut Bundle; Hidden, so it's not in the catalogue (direct link only).
    slug: 'calm-gut-kitchen', type: 'course', category: 'gut-health', practitioner: 'amara',
    image: media['post-miso-ginger-and-greens-soup'].url,
    title: 'Calm Gut Kitchen',
    summary: 'Five short cooking lessons that turn what you learned in Gut Health Reset into easy weekday meals.',
    description: ['Chidi cooks five simple, gentle meals in his own kitchen, with the swaps he suggests most often.'],
    visibility: 'hidden', availability: 'available', certificate: true, access: 'Lifetime access',
    meta: [{ icon: 'clock', label: '1 week' }, { icon: 'video', label: '5 lessons' }],
    prices: [{ id: 'once', kind: 'one-time', label: 'One payment', amount: 29, price: { amount: '$29' } }],
    includes: ['5 cooking lessons', 'A printable shopping list', 'Certificate of completion'],
    curriculum: [
      { title: 'In the kitchen', lessons: [
        { id: 'k1', title: 'A calm kitchen: tools and staples', type: 'video', duration: '07:30' },
        { id: 'k2', title: 'Gentle soups for tender days', type: 'video', duration: '11:15' },
        { id: 'k3', title: 'Slow breakfasts in five minutes', type: 'video', duration: '06:40' },
        { id: 'k4', title: 'Shopping list for the week', type: 'download', duration: 'PDF' },
        { id: 'k5', title: 'Batch cooking for a busy week', type: 'video', duration: '12:05' },
      ] },
    ],
    faqs: [],
  },
  {
    slug: 'one-to-one-coaching', type: 'coaching', category: 'mens-health', practitioner: 'amara',
    image: media['product-one-to-one-coaching'].url,
    title: '1:1 Nutrition Coaching',
    summary: 'Three months of personal support, with a plan built around you.',
    description: ['For clients who want a practitioner alongside them. Places are limited, so we start with a short application and a free call.'],
    visibility: 'private', availability: 'available', access: '3 months',
    meta: [{ icon: 'calendar', label: '6 sessions' }, { icon: 'clock', label: '50 minutes each' }],
    coaching: { sessions: 6, length: '50 minutes', format: 'Online video call', cadence: 'Every two weeks' },
    prices: [
      { id: 'monthly', kind: 'subscription', label: 'Monthly', amount: 240, interval: 'month', cycles: 3, price: { amount: '$240', interval: 'month', note: 'For 3 months' } },
      { id: 'once', kind: 'one-time', label: 'Pay in full', amount: 680, price: { amount: '$680', note: 'Save $40' } },
    ],
    includes: ['A 75-minute first consultation', 'Five 50-minute follow-ups', 'A written plan after each session', 'Message support between sessions'],
    faqs: [{ question: 'Why do I need to apply?', answer: 'So we can check coaching is the right fit before you pay anything.' }],
  },
  {
    slug: 'healing-circle-community', type: 'community', category: 'stress', practitioner: 'leah',
    image: media['product-healing-circle-community'].url,
    title: 'The Healing Circle',
    // Communities run on EzyCommunity; members are sent there when they open it.
    externalUrl: 'https://fit.ezycommunity.com/feeds',
    summary: 'A kind, moderated community for members, with weekly prompts and live chats.',
    description: ['A quiet place to share wins, ask questions and keep going. Practitioners drop in every week.'],
    visibility: 'membership', availability: 'available', plans: ['essentials', 'supported', 'founding'],
    meta: [{ icon: 'users', label: '640 members' }],
    community: { spaces: ['Welcome and introductions', 'Weekly wins', 'Gut health', 'Midlife and men’s health', 'Recipes'], members: 640 },
    prices: [],
    includes: ['Moderated spaces by topic', 'Weekly prompts', 'Monthly live chat with a practitioner'],
    faqs: [],
  },
  {
    slug: 'rest-and-restore-audio', type: 'media-library', category: 'sleep', practitioner: 'samir',
    image: media['product-rest-and-restore-audio'].url,
    title: 'Rest and Restore Audio',
    summary: 'Guided relaxations and sleep stories for slower evenings.',
    description: ['Guided sessions from Samir, from 5-minute breathing breaks to 30-minute sleep stories. Listen in any order, and download them for nights without signal.'],
    visibility: 'membership', availability: 'available', plans: ['essentials', 'supported', 'founding'],
    meta: [{ icon: 'headphones', label: `${episodeCount(restEpisodes)} sessions` }],
    // format 'video' | 'audio' | 'podcast' (admin: Video only, Audio only, Podcast).
    // promo: the promo video or audio at the top of the library page.
    // release: { mode: 'immediate' } | { mode: 'days' } (each episode's `days`) | { mode: 'date', date } (same moment
    //   for every user; episodes may set their own unlocksAt) | { mode: 'recurring', every, unit: 'day' | 'week' | 'month',
    //   weekday?, anchor: 'enroll' | 'date', start? } ("One episode unlocks every …", in Episodes order).
    // expiresAt: the expiration date (the library page closes; buyers keep their access). downloads: every episode is downloadable.
    mediaLibrary: {
      format: 'audio',
      promo: { title: 'A short welcome from Samir', duration: '01:48' },
      release: { mode: 'immediate' },
      downloads: true,
      episodes: restEpisodes,
    },
    prices: [],
    includes: [`${episodeCount(restEpisodes)} guided audio sessions`, 'Download for offline listening', 'New sessions every month'],
    faqs: [],
  },
  {
    slug: 'morning-reset-audio', type: 'media-library', category: 'energy', practitioner: 'samir',
    image: media['condition-energy'].url,
    title: 'Morning Reset Audio',
    summary: 'Short guided audio to start the day steadily. Included with Essentials.',
    description: ['Four short sessions from Samir for the first few minutes of the day: a wake-up breath, a pause while the kettle boils and a gentle walk into the morning.'],
    visibility: 'membership', availability: 'available', plans: ['essentials'], access: 'While your membership is active',
    meta: [{ icon: 'headphones', label: `${episodeCount(morningEpisodes)} sessions` }],
    mediaLibrary: {
      format: 'audio',
      release: { mode: 'immediate' },
      downloads: true,
      episodes: morningEpisodes,
    },
    prices: [],
    includes: [`${episodeCount(morningEpisodes)} guided audio sessions`, 'Download for offline listening'],
    faqs: [],
  },
  {
    slug: 'retreat-recordings', type: 'media-library', category: 'stress', practitioner: 'samir',
    image: media['product-retreat-recordings'].url,
    title: 'Spring Retreat Recordings',
    summary: 'Recordings from our spring retreat, for retreat guests only.',
    description: ['Guests received the password by email after the retreat.'],
    visibility: 'public', availability: 'available', password: true,
    meta: [{ icon: 'headphones', label: `${episodeCount(retreatEpisodes)} recordings` }, { icon: 'lock', label: 'Password protected' }],
    mediaLibrary: { format: 'audio', release: { mode: 'immediate' }, downloads: true, episodes: retreatEpisodes },
    prices: [{ id: 'free', kind: 'free', label: 'Free', amount: 0, price: { amount: 0 } }],
    includes: [`${episodeCount(retreatEpisodes)} recordings from the retreat`, 'Download for offline listening'],
    faqs: [],
  },
  {
    slug: 'gentle-movement-classes', type: 'media-library', category: 'energy', practitioner: 'leah',
    image: media['condition-energy'].url,
    title: 'Gentle Movement Classes',
    summary: 'Slow, kind video classes for stiff mornings, desk days and restless evenings.',
    description: [
      'Short follow-along classes you can do in a living room, with no special kit. Every class offers an easier option, so you move at the pace your body asks for.',
      'Start with the two free classes, then pick a morning or evening class to suit your day.',
    ],
    visibility: 'public', availability: 'available', access: 'Lifetime access',
    meta: [{ icon: 'video', label: `${episodeCount(movementEpisodes)} video classes` }, { icon: 'clock', label: '10 to 25 minutes each' }],
    mediaLibrary: {
      format: 'video',
      promo: { title: 'Watch the class trailer', duration: '01:24' },
      release: { mode: 'immediate' },
      episodes: movementEpisodes,
    },
    prices: [{ id: 'once', kind: 'one-time', label: 'One payment', amount: 49, price: { amount: '$49', strike: '$65' } }],
    includes: [`${episodeCount(movementEpisodes)} follow-along video classes`, 'Two free classes to try first', 'An easier option in every class', 'Lifetime access, including new classes'],
    faqs: [
      { question: 'Do I need any equipment?', answer: 'A mat or a rug and a cushion. A chair helps for the balance class.' },
      { question: 'Is this safe with joint pain?', answer: 'The classes are gentle and every move has an easier option. If you have an injury or a health condition, check with your doctor or physiotherapist first.' },
    ],
  },
  {
    slug: 'calm-gut-podcast', type: 'media-library', category: 'gut-health', practitioner: 'amara',
    image: media['condition-gut-health'].url,
    title: 'The Calm Gut Podcast',
    summary: 'A free weekly podcast on digestion, stress and food, with Dr Chidi Okafor and guests.',
    description: [
      'Every Monday, Chidi talks through one part of gut health in plain language, with time for listener questions. Episodes are around 30 minutes, made for a walk or the washing up.',
      'Sign up for free to listen here, read the show notes and transcripts, and follow the podcast in your own app.',
    ],
    visibility: 'public', availability: 'available', access: 'Free with an account',
    meta: [{ icon: 'headphones', label: 'Podcast' }, { icon: 'calendar', label: 'New episode every Monday' }],
    mediaLibrary: {
      format: 'podcast',
      promo: { title: 'Listen to the trailer', duration: '01:12' },
      release: { mode: 'recurring', every: 1, unit: 'week', weekday: 'Mon', anchor: 'date', start: '2026-08-03T07:00:00Z' },
      episodes: podcastEpisodes,
    },
    prices: [{ id: 'free', kind: 'free', label: 'Free', amount: 0, price: { amount: 0 } }],
    includes: ['A new episode every Monday', 'Show notes and a transcript for every episode', 'A private feed for your podcast app', 'Listener question episodes'],
    faqs: [
      { question: 'Can I listen in Apple Podcasts or Spotify?', answer: 'Yes. Once you sign up you get a private feed link that works in Apple Podcasts, Pocket Casts, Overcast and most other apps.' },
      { question: 'Is this medical advice?', answer: 'No. The podcast shares general information. Talk to your doctor about your own symptoms.' },
    ],
  },
  {
    slug: 'calm-in-ten-days', type: 'media-library', category: 'stress', practitioner: 'samir',
    image: media['condition-stress'].url,
    title: 'Calm in Ten Days',
    summary: 'Ten short audio practices for a calmer nervous system, one a day.',
    description: [
      'One practice opens each day after you join, so you build the habit gently instead of rushing ahead. Each one takes 8 to 16 minutes and works sitting, lying down or on a walk.',
    ],
    visibility: 'public', availability: 'available', access: 'Lifetime access',
    meta: [{ icon: 'headphones', label: `${episodeCount(calmEpisodes)} audio practices` }, { icon: 'calendar', label: 'One a day' }],
    mediaLibrary: {
      format: 'audio',
      noun: 'practice', // what one episode is called on the page (default: class, session or episode)
      promo: { title: 'Hear how the ten days work', duration: '02:05' },
      release: { mode: 'days' },
      downloads: true,
      episodes: calmEpisodes,
    },
    prices: [{ id: 'once', kind: 'one-time', label: 'One payment', amount: 29, price: { amount: '$29' } }],
    includes: ['10 guided audio practices', 'One new practice each day', 'Download for offline listening', 'Lifetime access'],
    faqs: [{ question: 'What if I miss a day?', answer: 'Nothing is lost. Practices stay open once they unlock, so you can pick up whenever you are ready.' }],
  },
  {
    slug: 'mens-health-evenings', type: 'media-library', category: 'mens-health', practitioner: 'leah',
    image: media['condition-mens-health'].url,
    title: 'Men’s Health Evenings',
    summary: 'Recordings of our autumn evening talks on energy, midlife changes and sleep.',
    description: [
      'Five evening talks from Owen, recorded live this autumn. Each recording opens at 19:00 on the evening of its talk, the same moment for everyone.',
      'The library is open to members until the end of the year.',
    ],
    visibility: 'membership', availability: 'available', plans: ['supported', 'founding'], access: 'While your membership is active',
    meta: [{ icon: 'video', label: '5 recorded talks' }, { icon: 'calendar', label: 'Available until 31 Dec 2026' }],
    mediaLibrary: {
      format: 'video',
      noun: 'talk',
      promo: { title: 'Watch a short introduction', duration: '01:30' },
      release: { mode: 'date', date: '2026-10-06T18:00:00Z' },
      expiresAt: '2026-12-31T23:59:00Z',
      episodes: mensHealthEveningEpisodes,
    },
    prices: [],
    includes: ['5 recorded evening talks', 'A bonus guide to tracking energy and sleep', 'Open to members until Thu 31 Dec 2026'],
    faqs: [],
  },
  {
    slug: 'summer-breathwork', type: 'media-library', category: 'stress', practitioner: 'samir',
    image: media['post-breathing-for-sleep'].url,
    title: 'Summer Breathwork Sessions',
    summary: 'A short seasonal series of breathing practices for warm days.',
    description: ['Three practices recorded for the summer. The series has closed; everyone who joined keeps their access.'],
    visibility: 'public', availability: 'sales-ended', access: 'Lifetime access',
    meta: [{ icon: 'headphones', label: `${episodeCount(summerEpisodes)} practices` }],
    mediaLibrary: { format: 'audio', release: { mode: 'immediate' }, expiresAt: '2026-09-30T22:59:00Z', episodes: summerEpisodes },
    prices: [{ id: 'once', kind: 'one-time', label: 'One payment', amount: 15, price: { amount: '$15' } }],
    includes: ['3 breathing practices'],
    faqs: [],
  },
  {
    slug: 'halvera-library', type: 'asset-library', category: 'gut-health', practitioner: 'amara',
    image: media['product-halvera-library'].url,
    title: 'Halvera Library',
    summary: 'Recipes, guided audio, trackers and practitioner videos. Free guides, member audio and files to buy one at a time.',
    description: ['Everything we hand out in sessions, in one place. Browse by category, open the free guides straight away, and buy a whole category, a folder or a single recipe card.'],
    visibility: 'public', availability: 'available', access: 'Free, member and paid files',
    meta: [{ icon: 'book', label: `${libraryCategories.length} categories` }, { icon: 'file', label: `${libraryFiles.length} files` }],
    prices: [], // access and prices are per category, folder and file
    includes: libraryCategories.map((c) => c.title),
    faqs: [],
  },
  {
    slug: 'spring-gut-workshop', type: 'event', category: 'gut-health', practitioner: 'amara',
    image: media['product-spring-gut-workshop'].url,
    title: 'Gut Health Workshop: Live in Bristol',
    summary: 'A hands-on morning of cooking, tasting and Q&A.',
    description: ['Join Chidi in our Bristol kitchen for a relaxed morning of simple gut-friendly cooking.'],
    visibility: 'public', availability: 'available', siteAccessExcluded: true,
    get meta() { return eventMeta(this, { icon: 'map-pin', label: 'Bristol' }) },
    // Event settings: see src/data/events.js.
    event: {
      format: 'in-person', venue: { name: 'Halvera kitchen', address: '14 Linden Row, Bristol BS8 4AT', city: 'Bristol' },
      ...eventTimes.springWorkshop,
      registration: { limit: 16, going: 11, showCount: true, waitlist: true, waiting: 0, qr: true, countdown: true },
      speakers: [{ person: 'amara', kind: 'Host' }],
      beforeYouCome: ['Arrive about 10 minutes early so we can start together', 'Let us know about any allergies by replying to your ticket email', 'Wear something comfortable you don’t mind cooking in'],
      location: '14 Linden Row, Bristol', online: false, seats: 16, seatsLeft: 5,
    },
    prices: [{ id: 'ticket', kind: 'one-time', label: 'Ticket', amount: 35, price: { amount: '$35' } }],
    includes: ['3-hour hands-on session', 'Lunch and recipe cards', 'Live Q&A'],
    faqs: [],
  },
  {
    slug: 'winter-retreat', type: 'event', category: 'stress', practitioner: 'samir',
    image: media['product-winter-retreat'].url,
    title: 'Winter Rest Retreat',
    summary: 'A weekend of rest, breathwork and nourishing food in the Cotswolds.',
    description: ['Two nights, small group, everything included.'],
    visibility: 'public', availability: 'sold-out', siteAccessExcluded: true,
    get meta() { return eventMeta(this, { icon: 'map-pin', label: 'Cotswolds' }) },
    event: {
      format: 'in-person', venue: { name: 'Hollow Barn', address: 'Lower Slaughter, Cheltenham GL54 2HP', city: 'Cotswolds' },
      ...eventTimes.retreat,
      registration: { limit: 14, going: 14, showCount: true, waitlist: true, waiting: 2, qr: true, countdown: true },
      speakers: [{ person: 'samir', kind: 'Host' }],
      location: 'Cotswolds, UK', online: false, seats: 14, seatsLeft: 0,
    },
    prices: [{ id: 'ticket', kind: 'one-time', label: 'Shared room', amount: 495, price: { amount: '$495' } }],
    includes: ['Two nights’ stay', 'All meals', 'Daily breathwork and yoga'],
    faqs: [],
  },
  ...eventProducts, // the other events, one per admin setting (src/data/events.js)
  {
    slug: 'sunday-letter', type: 'newsletter', category: 'mindful-eating', practitioner: 'amara',
    image: media['product-sunday-letter'].url,
    title: 'The Sunday Letter, paid edition',
    summary: 'A longer weekly letter with a recipe, a practice and a reader Q&A.',
    description: ['The free letter is a short note. The paid edition adds a recipe, a 10-minute practice and answers to your questions.'],
    visibility: 'public', availability: 'available',
    meta: [{ icon: 'mail', label: 'Every Sunday' }],
    newsletter: { cadence: 'Every Sunday', issues: 86 }, // tiers and posts: src/data/newsletter.js
    // The free tier has no price. Each paid price names its newsletter tier (Sell → Pricing).
    prices: [
      { id: 'monthly', tier: 'paid', kind: 'subscription', label: 'Paid monthly', amount: 5, interval: 'month', trialDays: 14, price: { amount: '$5', interval: 'month', note: '14-day free trial' } },
      { id: 'yearly', tier: 'paid', kind: 'subscription', label: 'Paid yearly', amount: 50, interval: 'year', price: { amount: '$50', interval: 'year', strike: '$60', note: 'Two months free' } },
      { id: 'supporter', tier: 'supporter', kind: 'subscription', label: 'Founding supporter', amount: 120, interval: 'year', price: { amount: '$120', interval: 'year', note: 'Helps keep the free letter free' } },
    ],
    includes: ['A weekly recipe', 'A 10-minute practice', 'Reader Q&A', 'The full archive'],
    faqs: [],
  },
  {
    slug: 'mindful-eating-basics', type: 'course', category: 'mindful-eating', practitioner: 'leah',
    image: media['product-mindful-eating-basics'].url,
    title: 'Mindful Eating Basics',
    summary: 'A free 5-day mini course to slow down and enjoy meals again.',
    description: ['Five short lessons, one a day. A gentle place to start.'],
    visibility: 'public', availability: 'available', access: 'Lifetime access',
    meta: [{ icon: 'clock', label: '5 days' }, { icon: 'video', label: '5 lessons' }],
    rating: { value: 4.8, count: 512 }, students: 4310,
    prices: [{ id: 'free', kind: 'free', label: 'Free', amount: 0, price: { amount: 0 } }],
    includes: ['5 short lessons', 'A printable journal'],
    curriculum: [{ title: 'Five days', lessons: [{ id: 'd1', title: 'Day 1: One slow meal', type: 'video', duration: '06:00', preview: true }, { id: 'd2', title: 'Day 2: Hunger and fullness', type: 'video', duration: '07:20' }] }],
    faqs: [],
  },
  {
    slug: 'better-sleep-21-days', type: 'course', category: 'sleep', practitioner: 'samir',
    image: media['product-better-sleep-21-days'].url,
    title: 'Better Sleep in 21 Days',
    summary: 'A step-by-step plan for deeper, steadier sleep. Pre-order now.',
    description: ['Three weeks of small evening and morning changes, with guided audio for every night.'],
    visibility: 'public', availability: 'pre-order', releases: 'Mon 3 Nov', access: 'Lifetime access',
    meta: [{ icon: 'calendar', label: 'Opens Mon 3 Nov' }, { icon: 'headphones', label: '21 audio sessions' }],
    prices: [{ id: 'once', kind: 'one-time', label: 'Pre-order price', amount: 59, price: { amount: '$59', strike: '$79', note: 'Charged today. Opens Mon 3 Nov' } }],
    includes: ['21 nightly audio sessions', 'Morning routine guides', 'Sleep diary'],
    curriculum: [{ title: 'Week 1', lessons: [{ id: 'n1', title: 'Night 1: Setting the scene', type: 'audio', duration: '12:00', preview: true }] }],
    faqs: [],
  },
  {
    slug: 'mens-health-foundations', type: 'course', category: 'mens-health', practitioner: 'leah',
    image: media['product-mens-health-foundations'].url,
    title: 'Men’s Health Foundations',
    summary: 'The self-paced version of our men’s health programme.',
    description: ['Enrolment opens twice a year. Join the next intake list to hear first.'],
    visibility: 'public', availability: 'enrolment-closed', access: 'Lifetime access',
    meta: [{ icon: 'video', label: '18 lessons' }],
    prices: [{ id: 'once', kind: 'one-time', label: 'One payment', amount: 129, price: { amount: '$129' } }],
    includes: ['18 lessons', 'Energy and sleep tracker'],
    faqs: [],
  },
  {
    // A course sold as a subscription with a free trial (Sell → price → Subscription, Free trial).
    slug: 'steady-energy', type: 'course', category: 'energy', practitioner: 'leah',
    image: media['condition-energy'].url,
    title: 'Steady Energy',
    summary: 'A short new module every month on food, sleep and movement for steadier days.',
    description: ['Each month brings a new 20-minute module and a simple experiment to try. Join any time and work through the back catalogue at your own pace.'],
    visibility: 'public', availability: 'available', access: 'While you’re subscribed',
    meta: [{ icon: 'calendar', label: 'New module monthly' }],
    prices: [{ id: 'monthly', kind: 'subscription', label: 'Monthly', amount: 15, interval: 'month', trialDays: 14, price: { amount: '$15', interval: 'month', note: '14-day free trial' } }],
    includes: ['A new module every month', 'The full back catalogue', 'Cancel any time'],
    curriculum: [
      { title: 'October: breakfast and energy', lessons: [{ id: 'se-oct-1', title: 'What a steady breakfast looks like', type: 'video', duration: '08:20', preview: true }, { id: 'se-oct-2', title: 'This month’s experiment', type: 'text', duration: '4 min read' }] },
      { title: 'September: the afternoon dip', lessons: [{ id: 'se-sep-1', title: 'Why 3pm feels hard', type: 'video', duration: '09:10' }, { id: 'se-sep-2', title: 'A five-minute reset', type: 'audio', duration: '05:00' }] },
    ],
    faqs: [],
  },
  {
    slug: 'stress-less-programme', type: 'course', category: 'stress', practitioner: 'samir',
    image: media['product-stress-less-programme'].url,
    title: 'Stress Less in 4 Weeks',
    summary: 'Simple daily practices for a calmer nervous system.',
    description: ['Four weeks of 10-minute practices.'],
    visibility: 'public', availability: 'sales-ended', access: 'Lifetime access',
    meta: [{ icon: 'clock', label: '4 weeks' }],
    prices: [{ id: 'once', kind: 'one-time', label: 'One payment', amount: 69, price: { amount: '$69' } }],
    includes: ['20 short practices'],
    curriculum: [{ title: 'Week 1', lessons: [{ id: 'w1', title: 'Noticing stress in the body', type: 'video', duration: '09:00' }] }],
    faqs: [],
  },
]

export const getProductData = (slug) => products.find((p) => p.slug === slug)
