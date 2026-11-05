// Memberships (Sell → Memberships → Plans and Groups). Plans in one group are tiers:
// members can upgrade or downgrade within the group. A plan can have several prices.
// A plan is in at most one group; plans outside a group stand alone, and a student can hold
// several memberships at once (one plan per group, plus any standalone plans).
//
// Group settings (Groups → group): up 'now' | 'renewal' ("Upgrades: Right away / At next renewal"),
// down 'end' | 'now' ("Downgrades: End of paid period / Right away"), prorate ("Charge or credit the
// difference for the rest of the paid period"), self ("Users can switch plans from their account").
export const membershipGroup = { name: 'Halvera membership', tiers: ['essentials', 'supported'], up: 'now', down: 'end', prorate: true, self: true }

export const plans = [
  {
    id: 'essentials', tier: 1, name: 'Essentials', featured: true,
    description: 'Guided audio and the community, at your own pace.',
    prices: {
      monthly: { amount: 19, price: { amount: '$19', interval: 'month' } },
      yearly: { amount: 182, price: { amount: '$182', interval: 'year', note: 'Save $46 a year' } },
    },
    trial: '7-day free trial',
    features: ['Rest and Restore Audio', 'The Healing Circle community', 'Monthly live Q&A', '10% off workshops'],
    allowances: [],
  },
  {
    id: 'supported', tier: 2, name: 'Supported',
    description: 'Guided audio, the community and men’s health talks, plus time with a practitioner.',
    prices: {
      monthly: { amount: 49, price: { amount: '$49', interval: 'month' } },
      yearly: { amount: 470, price: { amount: '$470', interval: 'year', note: 'Save $118 a year' } },
    },
    trial: '7-day free trial',
    features: ['Rest and Restore Audio', 'The Healing Circle community', 'Men’s Health Evenings talks', 'Members’ check-in calls', 'Priority booking'],
    allowances: { monthly: ['1 follow-up a month', '1 member check-in a month'], yearly: ['12 follow-ups a year', '12 member check-ins a year'] },
  },
  {
    // Standalone: not in a group, so it sits beside any other membership.
    id: 'gut-health-club', tier: null, name: 'Gut Health Club',
    description: 'Practitioner Q&A replays and gentle recipes for a calmer gut.',
    prices: {
      monthly: { amount: 12, price: { amount: '$12', interval: 'month' } },
      yearly: { amount: 115, price: { amount: '$115', interval: 'year', note: 'Save $29 a year' } },
    },
    features: ['Practitioner Q&A replays', 'Calm breakfasts recipe folder', 'A new gut-friendly recipe every month'],
    // Library folders the plan includes (Contents → items).
    contents: ['folder:qa-replays', 'folder:breakfasts'],
    allowances: [],
  },
  {
    id: 'founding', tier: null, name: 'Founding member',
    description: 'Pay once, keep Supported for life. Limited to 100 places.',
    prices: {
      lifetime: { amount: 990, price: { amount: '$990', note: 'One payment' } },
    },
    features: ['Everything in Supported, for life', 'Founding member badge'],
    allowances: { lifetime: ['1 follow-up a month', '1 member check-in a month'] },
  },
]

export const billingPeriods = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly', note: 'Save 20%' },
  { value: 'lifetime', label: 'Lifetime' },
]

// Cheapest first, so prices always climb from left to right wherever plans are listed.
const byPrice = (period) => (a, b) => a.prices[period].amount - b.prices[period].amount
export const plansFor = (period) => plans.filter((p) => p.prices[period]).sort(byPrice(period))
// Every plan, cheapest first: plans with monthly prices by those, then the lifetime-only ones.
const basePrice = (p) => (p.prices.monthly ? p.prices.monthly.amount : Infinity)
export const plansByPrice = () => [...plans].sort((a, b) => basePrice(a) - basePrice(b))

export const getPlan = (id) => plans.find((p) => p.id === id)

export const membershipFaqs = [
  { question: 'Can I cancel any time?', answer: 'Yes. Cancel from your dashboard and you keep access until the end of the period you paid for.' },
  { question: 'Can I switch plans?', answer: 'You can upgrade from Essentials to Supported at any time. We charge the difference for the rest of your billing period.' },
  { question: 'Do unused consultations roll over?', answer: 'No. Your allowance resets at the start of each billing period.' },
  { question: 'Is there a free trial?', answer: 'Monthly and yearly plans start with 7 days free. We remind you 2 days before the trial ends.' },
]

// Memberships → plan → Success path: "An ordered list of first steps. Each step ticks itself off
// when the user does it." Shown only when the school turns on "Show to users".
//   kind      media | appointment | channel | event | course | custom (custom steps have no trigger:
//             the member ticks them off themselves)
//   target    the product or appointment slug the step points at
//   then      "When done: Recommend something" (a product slug)
//   finish    "When they finish every step": a message and a recommendation
export const successPaths = {
  supported: {
    show: true,
    steps: [
      { id: 'listen', kind: 'media', target: 'rest-and-restore-audio', label: 'Listen to a session in Rest and Restore Audio' },
      { id: 'consult', kind: 'appointment', target: 'follow-up', label: 'Have your first included consultation' },
      { id: 'hello', kind: 'channel', target: 'healing-circle-community', label: 'Introduce yourself in The Healing Circle' },
      { id: 'goal', kind: 'custom', label: 'Write down one thing you want to feel better about', hint: 'Keep it somewhere you’ll see it. Tick this off when it’s done.' },
      { id: 'evenings', kind: 'media', target: 'mens-health-evenings', label: 'Watch a Men’s Health Evenings talk', then: 'mens-health-circle' },
    ],
    finish: { message: 'All done. Ready for more?', recommend: 'one-to-one-coaching' },
  },
}
