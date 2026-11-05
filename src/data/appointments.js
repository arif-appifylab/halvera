// Appointment types the school sells (EzyCourse admin: Scheduling → Appointments).
// Prices are display strings, as the server sends them.
//
//   kind:      'standard' | 'round-robin' | 'magic-slot' | 'meetup-poll'      (admin "Type")
//   format:    'one-to-one' | 'group'   (group = "Allow multiple bookings on a single slot";
//              capacity = "Attendees per slot", registrants see the spots left)
//   pricing:   'Free' | 'Registrants pay' | 'Included in membership'
//              includedIn.only = true is a membership-only appointment: members redeem a
//              "Membership slot", everyone else is shown the plan picker.
//   location:  one per appointment, as in the admin: zoom | meet | native ("Native meeting") |
//              url ("Custom meeting URL") | person ("In person"; hidden: "Hide venue", the address is
//              only shown once someone has booked)
//   listed:    false for appointments shared by link only (magic slot, meetup poll). Everything else is
//              Public or Membership only and appears in the catalogue under Appointments.
//   category:  the health topic it helps with (the catalogue's Category filter)
//   rules:     durationMin, buffer { before, after } (minutes), noticeHours ("Minimum notice"),
//              dailyLimit ("Bookings a day"), changeHours (cancel/reschedule up to N hours before)
//   intake:    the registrant form. Field types use the admin's names: email, phone, address,
//              short-text, number, long-text, select, multiselect, multi-email, checkbox-group,
//              radio-group, checkbox, url
//   slots:     generated for six weeks from the demo "today" (Fri 16 Oct 2026). Each slot is a
//              wall-clock time in the practitioner's zone: { date, time, host, spots?, full?, limit? }.
//              limit = the day has reached its "Bookings a day" cap.

// The signed-in preview student's email (matches the account banner).
export const signedInEmail = 'adnan@example.com'

// The practitioners' time zone (Settings → General → Time zone).
export const practitionerZone = 'Europe/London'

// The demo clock: Fri 16 Oct 2026, 13:00 in London. Minimum notice counts from here.
export const bookingNow = Date.UTC(2026, 9, 16, 12, 0)

const START = '2026-10-16'
const WEEKS = 6

const LOCATIONS = {
  meet: {
    id: 'meet', kind: 'meet',
    title: 'Google Meet',
    description: 'Video call from your browser or phone',
    icon: 'video',
    confirm: 'Your Google Meet link is in your confirmation email and on your dashboard. It opens 10 minutes before the start.',
  },
  zoom: {
    id: 'zoom', kind: 'zoom',
    title: 'Zoom',
    description: 'Video call, link sent when you book',
    icon: 'video',
    confirm: 'Your Zoom link is in your confirmation email and on your dashboard. It opens 10 minutes before the start.',
  },
  native: {
    id: 'native', kind: 'native',
    title: 'Halvera video room',
    description: 'Opens in your browser, nothing to install',
    icon: 'video',
    confirm: 'Join from your dashboard. The room opens 10 minutes before the start and works in any up-to-date browser.',
  },
  leahLink: {
    id: 'leah-room', kind: 'url',
    title: 'Owen’s video room',
    description: 'A private link, sent when you book',
    icon: 'globe',
    url: 'https://meet.halvera.example/owen-marsh',
    confirm: 'Join at the link below. It’s also in your confirmation email.',
  },
  clinic: {
    id: 'clinic', kind: 'person',
    title: 'In person at the Bristol clinic',
    description: '14 Linden Row, Bristol BS1 4QA',
    icon: 'map-pin',
    address: '14 Linden Row, Bristol BS1 4QA',
    confirm: 'Ring the bell for the first floor. There is step-free access from the side door on Linden Lane.',
  },
  // "Hide venue": registrants see the meeting point once they've booked.
  park: {
    id: 'park', kind: 'person', hidden: true,
    title: 'In person in Bristol',
    description: 'Meeting point shared once you book',
    icon: 'map-pin',
    address: 'The bandstand, Castle Park, Bristol BS1 3XB',
    confirm: 'Meet Samir at the bandstand in Castle Park. Wear comfortable shoes; we walk whatever the weather, at an easy pace.',
  },
}

/* ---------- slot generation ---------- */

const pad = (n) => String(n).padStart(2, '0')
const addDays = (key, n) => {
  const [y, m, d] = key.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n, 12))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}
const weekday = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() }

// Stable 0–1 number per slot, so the same times are "already booked" on every visit.
const rand = (str) => {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return ((h >>> 0) % 10000) / 10000
}

// hours: { [hostId]: { [weekday 0–6]: ['HH:MM', …] } }
function schedule({ seed, hours, taken = 0.3, capacity, limitDays = [], closed = [], overrides = {} }) {
  const out = []
  for (let i = 0; i < WEEKS * 7; i += 1) {
    const date = addDays(START, i)
    if (closed.includes(date)) continue
    Object.entries(hours).forEach(([host, byDay]) => {
      ;(byDay[weekday(date)] || []).forEach((time) => {
        const id = `${date}T${time}`
        const r = rand(`${seed}|${host}|${id}`)
        let slot = { date, time, host }
        if (capacity) {
          const left = r < 0.14 ? 0 : 1 + Math.floor(rand(`${id}|${seed}`) * capacity)
          slot = { ...slot, spots: Math.min(left, capacity), full: left === 0 }
        } else if (r < taken) {
          return // someone booked it: 1:1 times that are taken simply aren't offered
        }
        if (limitDays.includes(date)) slot.limit = true
        out.push({ ...slot, ...(overrides[id] || {}) })
      })
    })
  }
  return out
}

/* ---------- appointment types ---------- */

export const appointmentTypes = [
  {
    slug: 'consultation',
    kind: 'standard',
    title: 'Free 20-minute consultation',
    summary: 'A short, no-pressure call to talk through what’s going on and whether we’re the right fit.',
    hosts: ['amara'],
    duration: '20 min',
    durationMin: 20,
    buffer: { before: 0, after: 10 },
    noticeHours: 12,
    dailyLimit: 6,
    changeHours: 4,
    format: 'one-to-one',
    pricing: 'Free',
    price: 0,
    bookLabel: 'Book my consultation',
    location: LOCATIONS.meet,
    intake: [
      { id: 'topic', type: 'long-text', label: 'What would you like to talk about?', hint: 'A few lines is plenty.', required: true },
      { id: 'area', type: 'select', label: 'Which area is closest?', options: ['Gut health', 'Sleep', 'Men’s health', 'Stress and energy', 'Something else'], required: true },
      { id: 'heard', type: 'select', label: 'How did you hear about us?', options: ['A friend or family member', 'Instagram', 'Search', 'My GP or another practitioner', 'Other'] },
    ],
    slots: schedule({
      seed: 'consultation',
      hours: { amara: { 1: ['09:00', '09:30', '13:00', '16:30'], 2: ['10:00', '11:00', '14:30', '15:00'], 4: ['09:00', '12:30', '15:00', '17:00'], 5: ['10:30', '11:00', '11:30'], 6: ['10:00', '10:30'] } },
      limitDays: ['2026-10-22', '2026-11-05'],
      closed: ['2026-11-09', '2026-11-10'],
    }),
  },
  {
    slug: 'initial-consultation',
    category: 'gut-health',
    kind: 'standard',
    title: 'Initial consultation',
    summary: 'A full first session: your history, symptoms and goals, and a written plan within five working days.',
    hosts: ['amara'],
    duration: '60 min',
    durationMin: 60,
    buffer: { before: 0, after: 15 },
    noticeHours: 12,
    dailyLimit: 4,
    changeHours: 4,
    format: 'one-to-one',
    pricing: 'Registrants pay',
    price: '$95',
    summaryLine: { name: 'Initial consultation', amount: '$95' },
    total: '$95',
    location: LOCATIONS.zoom,
    intake: [
      { id: 'concern', type: 'long-text', label: 'What would you like help with?', hint: 'Symptoms, how long they’ve been going on, anything you’ve tried.', required: true },
      { id: 'area', type: 'select', label: 'Main area of concern', options: ['Gut health', 'Sleep', 'Men’s health', 'Stress and energy', 'Something else'], required: true },
      { id: 'age', type: 'number', label: 'Your age', hint: 'Some recommendations change with age.', min: 16, max: 110 },
      { id: 'apply', type: 'checkbox-group', label: 'Do any of these apply to you?', hint: 'This helps us prepare. It stays between you and your practitioner.', options: ['I take prescribed medication', 'I have a heart condition or high blood pressure', 'I’m under the care of a GP or specialist for this', 'None of these'] },
      { id: 'before', type: 'radio-group', label: 'Have you worked with a nutritional therapist before?', options: ['Yes', 'No'], required: true },
      { id: 'gp', type: 'short-text', label: 'Your GP practice' },
      { id: 'gp-email', type: 'email', label: 'Your GP’s email', hint: 'Only if you’d like us to send them a copy of your plan.' },
      { id: 'phone', type: 'phone', label: 'Phone number', hint: 'Only used if we need to reach you on the day.' },
    ],
    slots: schedule({
      seed: 'initial',
      hours: { amara: { 1: ['10:00', '14:00'], 3: ['09:30', '11:30', '15:00'], 4: ['10:00', '13:30'], 5: ['09:00'] } },
      taken: 0.35,
    }),
  },
  {
    slug: 'follow-up',
    category: 'gut-health',
    kind: 'standard',
    title: 'Follow-up',
    summary: 'Check in on your plan, adjust what isn’t working and agree the next few weeks.',
    hosts: ['amara'],
    duration: '45 min',
    durationMin: 45,
    buffer: { before: 0, after: 15 },
    noticeHours: 12,
    dailyLimit: 5,
    changeHours: 4,
    format: 'one-to-one',
    pricing: 'Included in membership',
    price: '$65',
    // Supported members book this with their monthly allowance instead of paying.
    includedIn: { plans: ['supported', 'founding'], planName: 'Supported' },
    summaryLine: { name: 'Follow-up', amount: '$65' },
    total: '$65',
    location: LOCATIONS.zoom,
    intake: [
      { id: 'since', type: 'long-text', label: 'How have things been since your last session?', required: true },
      { id: 'plan', type: 'radio-group', label: 'How are you finding your plan?', options: ['Going well', 'Mixed', 'Hard to keep up'], required: true },
      { id: 'share', type: 'url', label: 'A link you’d like to share ahead of time', hint: 'A food diary, test results or a shared folder.' },
    ],
    slots: schedule({
      seed: 'follow-up',
      hours: { amara: { 1: ['11:00', '15:30'], 2: ['10:30', '13:00', '16:00'], 3: ['09:00'], 5: ['10:00', '12:00', '14:00'] } },
    }),
  },
  {
    slug: 'breathwork-group',
    category: 'stress',
    kind: 'standard',
    title: 'Group breathwork',
    summary: 'An evening session with Samir: gentle guided breathing to settle your nervous system before sleep.',
    hosts: ['samir'],
    duration: '45 min',
    durationMin: 45,
    buffer: { before: 15, after: 15 },
    noticeHours: 2,
    changeHours: 4,
    format: 'group',
    capacity: 8,
    pricing: 'Registrants pay',
    price: '$15',
    summaryLine: { name: 'Group breathwork', amount: '$15' },
    total: '$15',
    location: LOCATIONS.native,
    intake: [
      { id: 'experience', type: 'radio-group', label: 'Have you done breathwork before?', options: ['Never', 'A little', 'Regularly'], required: true },
      { id: 'health', type: 'checkbox-group', label: 'Anything Samir should know?', hint: 'Some breathing patterns are adjusted for these.', options: ['Asthma or another breathing condition', 'A heart condition', 'Panic attacks', 'High blood pressure', 'None of these'] },
      { id: 'space', type: 'checkbox', label: 'I’ll join from somewhere I can sit or lie down comfortably', required: true },
    ],
    slots: schedule({
      seed: 'breathwork',
      hours: { samir: { 0: ['10:00'], 2: ['19:00'], 4: ['19:00', '20:15'], 6: ['18:30'] } },
      capacity: 8,
      overrides: { '2026-10-20T19:00': { spots: 3, full: false }, '2026-10-22T19:00': { spots: 5, full: false }, '2026-10-22T20:15': { spots: 0, full: true } },
    }),
  },
  {
    slug: 'practitioner-intro',
    kind: 'round-robin',
    title: 'Intro session with a practitioner',
    summary: 'Thirty minutes to map out where you are and what would help most.',
    hosts: ['amara', 'leah', 'samir'],
    // Bookings so far this week: round robin gives a new booking to the least busy free host.
    load: { amara: 6, leah: 3, samir: 4 },
    duration: '30 min',
    durationMin: 30,
    buffer: { before: 5, after: 10 },
    noticeHours: 12,
    dailyLimit: 8,
    changeHours: 4,
    format: 'one-to-one',
    pricing: 'Registrants pay',
    price: '$40',
    summaryLine: { name: 'Intro session with a practitioner', amount: '$40' },
    total: '$40',
    location: LOCATIONS.native,
    intake: [
      { id: 'areas', type: 'multiselect', label: 'What would you like help with?', hint: 'Choose all that apply.', options: ['Gut health', 'Sleep', 'Men’s health', 'Stress', 'Energy', 'Skin'], required: true },
      { id: 'story', type: 'long-text', label: 'Anything you’d like your practitioner to read first?' },
      { id: 'phone', type: 'phone', label: 'Phone number', hint: 'Only used if the video room doesn’t connect.' },
    ],
    slots: schedule({
      seed: 'intro',
      hours: {
        amara: { 1: ['12:00', '12:30'], 3: ['09:00', '09:30'], 5: ['14:00'] },
        leah: { 1: ['10:00', '10:30', '11:00'], 2: ['13:00', '13:30'], 4: ['10:00', '10:30', '16:00'] },
        samir: { 2: ['17:00', '17:30'], 3: ['09:00', '18:00'], 6: ['09:30', '10:00'] },
      },
      taken: 0.25,
    }),
  },
  {
    slug: 'magic-follow-up',
    category: 'gut-health',
    kind: 'magic-slot',
    listed: false, // a magic slot: shared by link or embedded, never listed
    title: 'Results review',
    summary: 'A short call to go through your test results and what they mean for your plan.',
    hosts: ['leah'],
    duration: '30 min',
    durationMin: 30,
    buffer: { before: 0, after: 10 },
    noticeHours: 12,
    changeHours: 4,
    format: 'one-to-one',
    pricing: 'Registrants pay',
    price: '$45',
    summaryLine: { name: 'Results review', amount: '$45' },
    total: '$45',
    location: LOCATIONS.leahLink,
    intake: [
      { id: 'questions', type: 'long-text', label: 'Questions about your results', hint: 'Anything that worried or surprised you.' },
      { id: 'address', type: 'address', label: 'Postal address', hint: 'We post your next test kit here.', required: true },
      { id: 'copies', type: 'multi-email', label: 'Anyone else who should get the summary?', hint: 'Separate email addresses with commas. For example, your GP.' },
    ],
    slots: [{ date: '2026-10-23', time: '15:00', host: 'leah' }],
  },
  {
    slug: 'midlife-circle-poll',
    listed: false, // the vote is shared by link with the men who asked for it
    category: 'mens-health',
    kind: 'meetup-poll',
    title: 'Midlife men’s circle: choose a time',
    summary: 'A new evening circle for men in midlife, with Owen. Tell us which times you could make and we’ll book the one that suits most people.',
    hosts: ['leah'],
    duration: '60 min',
    durationMin: 60,
    format: 'group',
    pricing: 'Free',
    price: 0,
    location: LOCATIONS.zoom,
    poll: {
      closes: { date: '2026-10-24', time: '18:00' },
      cap: 12, // Max attendees
      votesPer: 'many', // 'one' = One vote · 'many' = Vote for any slot
      options: [
        { id: 'p1', date: '2026-11-03', time: '18:30', votes: 7 },
        { id: 'p2', date: '2026-11-04', time: '12:30', votes: 4 },
        { id: 'p3', date: '2026-11-05', time: '19:00', votes: 9 },
        { id: 'p4', date: '2026-11-07', time: '10:00', votes: 5 },
      ],
    },
    intake: [
      { id: 'focus', type: 'select', label: 'What would you most like help with?', options: ['Energy and drive', 'Sleep', 'Weight and heart health', 'Stress and burnout', 'Not sure yet'], required: true },
      { id: 'cover', type: 'short-text', label: 'What would you like the circle to cover?' },
    ],
    slots: [],
  },
  {
    // A paid meetup poll: voters save a card, and only those whose time wins (within the cap) are charged,
    // once, when the booking is confirmed (the admin's "Charged once when the booking is confirmed").
    slug: 'cooking-class-poll',
    listed: false, // the vote is shared by link with the people on the class waitlist
    category: 'gut-health',
    kind: 'meetup-poll',
    title: 'Gut-friendly cooking class: choose a time',
    summary: 'A hands-on evening class at our Bristol clinic: three simple dishes, then we eat together. Tell us which evenings you could make and we’ll run the one that suits most people.',
    hosts: ['amara'],
    duration: '90 min',
    durationMin: 90,
    format: 'group',
    pricing: 'Registrants pay',
    price: '$25',
    compareAt: '$35',
    summaryLine: { name: 'Gut-friendly cooking class', amount: '$25' },
    total: '$25',
    location: LOCATIONS.clinic,
    poll: {
      closes: { date: '2026-10-28', time: '18:00' },
      cap: 10,
      votesPer: 'many',
      options: [
        { id: 'c1', date: '2026-11-10', time: '18:30', votes: 6 },
        { id: 'c2', date: '2026-11-12', time: '18:30', votes: 8 },
        { id: 'c3', date: '2026-11-14', time: '17:00', votes: 3 },
      ],
    },
    intake: [
      { id: 'diet', type: 'checkbox-group', label: 'Anything we should cook around?', options: ['Vegetarian', 'No gluten', 'No dairy', 'A nut allergy', 'None of these'] },
    ],
    slots: [],
  },
  {
    slug: 'clinic-consultation',
    category: 'gut-health',
    kind: 'standard',
    title: 'In-clinic consultation',
    summary: 'A full first session in person at our Bristol clinic: your history, symptoms and goals, and a written plan within five working days.',
    hosts: ['amara'],
    duration: '60 min',
    durationMin: 60,
    buffer: { before: 0, after: 15 },
    noticeHours: 24,
    dailyLimit: 3,
    changeHours: 24,
    format: 'one-to-one',
    pricing: 'Registrants pay',
    price: '$110',
    summaryLine: { name: 'In-clinic consultation', amount: '$110' },
    total: '$110',
    location: LOCATIONS.clinic,
    intake: [
      { id: 'concern', type: 'long-text', label: 'What would you like help with?', hint: 'Symptoms, how long they’ve been going on, anything you’ve tried.', required: true },
      { id: 'access', type: 'checkbox', label: 'I’d like step-free access to the room' },
      { id: 'phone', type: 'phone', label: 'Phone number', hint: 'Only used if we need to reach you on the day.' },
    ],
    slots: schedule({
      seed: 'clinic',
      hours: { amara: { 2: ['10:00', '14:00'], 4: ['09:30', '15:00'] } },
      taken: 0.3,
    }),
  },
  {
    slug: 'walk-and-talk',
    category: 'stress',
    kind: 'standard',
    title: 'Walk-and-talk coaching',
    summary: 'A 45-minute walk through a Bristol park with Samir, talking through stress, sleep and what would help this week.',
    hosts: ['samir'],
    duration: '45 min',
    durationMin: 45,
    buffer: { before: 15, after: 15 },
    noticeHours: 24,
    dailyLimit: 4,
    changeHours: 12,
    format: 'one-to-one',
    pricing: 'Registrants pay',
    price: '$50',
    summaryLine: { name: 'Walk-and-talk coaching', amount: '$50' },
    total: '$50',
    location: LOCATIONS.park,
    intake: [
      { id: 'focus', type: 'long-text', label: 'What’s on your mind at the moment?', required: true },
      { id: 'pace', type: 'radio-group', label: 'What walking pace suits you?', options: ['Slow and steady', 'A brisk walk'], required: true },
    ],
    slots: schedule({
      seed: 'walk',
      hours: { samir: { 1: ['08:00', '12:30'], 3: ['08:00', '17:30'], 6: ['09:00', '10:30'] } },
      taken: 0.25,
    }),
  },
  {
    slug: 'member-check-in',
    category: 'mens-health',
    kind: 'standard',
    title: 'Member check-in',
    summary: 'A monthly half-hour with Owen to look at how your routines are going and adjust them.',
    hosts: ['leah'],
    duration: '30 min',
    durationMin: 30,
    buffer: { before: 0, after: 10 },
    noticeHours: 12,
    dailyLimit: 6,
    changeHours: 4,
    format: 'one-to-one',
    pricing: 'Included in membership',
    price: null,
    includedIn: { plans: ['supported', 'founding'], planName: 'Supported', only: true },
    location: LOCATIONS.meet,
    intake: [
      { id: 'focus', type: 'long-text', label: 'What would you like to focus on this month?', required: true },
      { id: 'notes', type: 'checkbox', label: 'Share my progress notes from the dashboard with Owen' },
    ],
    slots: schedule({
      seed: 'check-in',
      hours: { leah: { 2: ['09:00', '09:30', '12:00'], 4: ['12:00', '12:30'], 5: ['09:00', '09:30'] } },
    }),
  },
]

export const getAppointmentType = (slug) => appointmentTypes.find((t) => t.slug === slug)
