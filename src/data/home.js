// Home page copy. School settings, conditions, people, products and plans come from the shared data files;
// this file only holds the words that are specific to the home page.
import { siteAccess } from '@/lib/access.js'
import { media } from './media-credits.js'

const accessPrice = siteAccess.prices.find((p) => p.default) || siteAccess.prices[0]
const lifetimePrice = siteAccess.prices.find((p) => p.id === 'lifetime')

export const hero = {
  eyebrow: 'Nutrition and wellbeing, in Bristol and online',
  title: 'Feel at home in your body again',
  highlight: 'at home',
  subtitle: 'Gentle, practitioner-led support for your gut, heart, hormones, sleep and energy. We listen first, then help you make small changes that last.',
  secondary: { label: 'Explore programmes', href: '/courses' },
  image: media['home-hero']?.url || '/images/hero-placeholder.svg',
  imageAlt: media['home-hero']?.alt || '',
  trust: 'Over 2,000 clients supported since 2014 · BANT-registered practitioners',
}

export const painPoints = {
  eyebrow: 'Is this you?',
  title: 'You know something is off, but no one has helped you work out what',
  intro: 'Most of our clients arrive after months, sometimes years, of trying to sort things out on their own.',
  items: [
    'You feel bloated or uncomfortable after most meals',
    'You wake up tired, even after a full night in bed',
    'Your energy, mood or sleep has changed in midlife and no one has explained why',
    'You have cut out so many foods you are no longer sure what is safe to eat',
    'Your test results came back normal, but you don’t feel normal',
    'You are tired of conflicting advice online',
  ],
  close: 'You are not imagining it, and you don’t have to work it out alone.',
  link: 'Talk it through in a free consultation',
}

export const helpWith = {
  eyebrow: 'Health topics',
  title: 'Care for the things that wear you down',
  intro: 'Every plan starts with you. These are the areas clients most often come to us for.',
  linkLabel: 'See everything we help with',
}

export const practitionerIntro = {
  eyebrow: 'Meet your practitioner',
  title: 'Hello, I’m Chidi',
  story: [
    'I spent my twenties living with digestive problems that were put down to stress. When I finally found a practitioner who asked about my sleep, my work and how I ate, not only what I ate, things began to change.',
    'That is the care I wanted to offer. Today a small team of us work with clients in Bristol and online, always alongside their GP, never instead of them.',
  ],
  link: { label: 'Our story', href: '/about-us' },
}

export const steps = {
  eyebrow: 'How it works',
  title: 'Three gentle steps',
  intro: 'No pressure and no long contracts. You decide how much support you want.',
  items: [
    { title: 'A free consultation', text: 'A relaxed 20-minute video call to hear where you are, what you have tried and what you would like to change.' },
    { title: 'Your personal plan', text: 'Food, rest and movement suggestions shaped around your life, with a programme or one-to-one sessions if they would help.' },
    { title: 'Gentle, ongoing support', text: 'Check-ins, guided audio and a kind community, so the small changes stick when life gets busy.' },
  ],
}

export const programmes = {
  eyebrow: 'Programmes',
  title: 'Start where you are',
  intro: 'Self-paced courses and small live groups, each led by one of our practitioners.',
  slugs: ['gut-health-reset', 'mens-health-circle', 'mindful-eating-basics'],
}

export const stories = {
  eyebrow: 'Client stories',
  title: 'In their own words',
  names: ['Pranav S.', 'Hiro L.', 'Jonah M.'],
}

export const membership = {
  eyebrow: 'Membership',
  title: 'Support that stays with you',
  intro: 'For when you want guided audio, the community and time with a practitioner every month. Both plans start with 7 days free, and you can cancel any time from your dashboard.',
  plans: ['essentials', 'supported'],
  link: { label: 'Compare all plans', href: '/memberships' },
}

export const guide = {
  title: 'Free guide: 7 gentle habits for calmer digestion',
  text: 'A short, printable guide with the daily habits our clients start with. No strict rules, nothing to buy.',
  consent: 'Also send me the Sunday Letter, one calm email a week from Halvera',
  consentNote: 'Optional. Unsubscribe at any time. We never share your email.',
  submit: 'Get the free guide',
  doneTitle: 'Check your inbox',
  done: (email) => `Your guide is on its way to ${email}. If it hasn’t arrived in 10 minutes, look in your spam or promotions folder.`,
}

export const faqs = [
  {
    question: 'Is this medical advice?',
    answer: 'No. Our practitioners are nutritional therapists and coaches, not doctors. We work alongside your GP and never ask you to stop medication or treatment. If something needs medical attention, we will tell you and suggest you see your doctor.',
  },
  {
    question: 'How does the free consultation work?',
    answer: 'Choose a time that suits you and fill in a short form about what is going on. We meet on a 20-minute video call, listen, and suggest a next step if there is one that would help. There is no obligation to buy anything.',
  },
  {
    question: 'Can I cancel my membership?',
    answer: 'Yes, any time from your dashboard. You keep everything in your plan until the end of the period you have paid for, and you won’t be charged again.',
  },
  ...(siteAccess.enabled ? [{
    question: 'Do I need site access to join a programme?',
    answer: `To buy a paid programme you need ${siteAccess.name} (${accessPrice.price.amount} a ${accessPrice.interval}${lifetimePrice ? `, or ${lifetimePrice.price.amount} for lifetime` : ''}). If you don’t have it yet, it is added at checkout as its own line, so you see the full total before you pay. Free programmes, events and memberships don’t need it.`,
  }] : []),
  {
    question: 'What if a programme isn’t right for me?',
    answer: 'You can ask for a full refund within 14 days of buying a self-paced programme. Just reply to your receipt email or contact us. Our refund policy has the details for live groups and one-to-one sessions.',
  },
]

export const cta = {
  title: 'Ready to feel like yourself again?',
  text: 'Book a free 20-minute consultation. No pressure, just a conversation about where you are and what could help.',
}
