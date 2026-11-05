// Copy for the About us page. Fictional school, fictional people.
import { media } from './media-credits.js'

export const aboutHero = {
  eyebrow: 'About Halvera',
  title: 'Care that starts with listening',
  highlight: 'listening',
  subtitle: 'We are a small team of practitioners helping people with gut health, men’s health, sleep and stress. Online across the UK and beyond, and in person in Bristol.',
  secondary: { label: 'Explore programmes', href: '/courses' },
  image: media['about-hero']?.url || '/images/hero-placeholder.svg',
  imageAlt: media['about-hero']?.alt || '',
  trust: 'Supporting clients since 2016',
}

export const story = {
  eyebrow: 'Our story',
  title: 'Why we started',
  paragraphs: [
    'Before Halvera, I worked in a busy clinic where appointments lasted ten minutes. I kept meeting people who had been told their bloating, tiredness or poor sleep was "just stress", and who had quietly given up on feeling better.',
    'So in 2016 I started seeing clients from a small room above a bakery in Bristol, with one rule: the first appointment is for listening. We talk about your history, your week, what you have tried and what you would like to change, before anyone suggests a single thing.',
    'Owen and Samir joined as the practice grew, and our courses, groups and audio library came from the questions clients asked between sessions. The room is bigger now, and most of our work happens online, but the rule has not changed.',
  ],
  signature: 'Dr Chidi Okafor, founder',
}

export const team = {
  eyebrow: 'Our practitioners',
  title: 'The people you will work with',
  intro: 'Every client is matched with one practitioner, who stays with you from your first call.',
}

export const values = {
  eyebrow: 'What we believe',
  title: 'How we work',
  items: [
    { icon: 'heart', title: 'Listen first', text: 'Your first session is about your story, not a sales pitch or a meal plan.' },
    { icon: 'book', title: 'Evidence-informed', text: 'We use approaches with good research behind them, and we tell you when the evidence is thin.' },
    { icon: 'users', title: 'Alongside your doctor', text: 'We work with your GP, never instead of them, and refer you on when something needs medical care.' },
    { icon: 'leaf', title: 'Small steps', text: 'A few changes you can keep beat a long list you will drop by Friday.' },
  ],
}

export const credentials = 'Our nutritional therapists are registered with their professional body and hold full professional indemnity insurance. All practitioners complete ongoing professional development each year and work within a written scope of practice. Registration details are available on request.'

// Client stories to feature, by name, from testimonials in src/data/people.js.
export const featuredStories = ['Pranav S.', 'Rafael K.']

export const aboutCta = {
  title: 'Would you like to talk it through?',
  text: 'Book a free 20-minute consultation with one of our practitioners. No pressure, just a conversation about where you are and what could help.',
  secondary: { label: 'Contact us', href: '/contact-us' },
}
