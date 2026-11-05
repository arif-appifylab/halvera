// Extra sales-page data the shared product data doesn't carry yet. Keyed by product slug.
// In EzyCourse these come from the product settings (cohort start time, event end time,
// newsletter sample issue, coaching steps).

export const extras = {
  'mens-health-circle': {
    startsAt: '2026-11-03T19:00:00Z',
  },
  'sunday-letter': {
    sample: {
      issue: 'Issue 86 · Sun 12 Oct',
      title: 'Soup season, and the five-minute reset',
      body: [
        'This week’s recipe is the one I make on repeat once the evenings draw in: a gentle lentil and carrot soup that sits well even on a tender stomach.',
        'The practice is a five-minute reset for the moment you get home. Shoes off, one hand on your belly, three slow breaths before you open the fridge.',
      ],
    },
  },
}

export const coachingSteps = [
  { label: 'Request access', description: 'Tell us a little about you. It takes two minutes.' },
  { label: 'Free call', description: 'A 20-minute video call with Chidi to check coaching is the right fit.' },
  { label: 'Start', description: 'We email you a checkout link, then you book your first consultation.' },
]

export const extrasFor = (slug) => extras[slug] || {}
