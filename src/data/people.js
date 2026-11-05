// Practitioners and client stories. Fictional school, fictional people (all men, per the client brief).
// Ids (amara, leah, samir) are stable keys used across the data files; display names are below.
// Photos are stock portraits (see src/data/media-credits.js); a school swaps in its own.
import { media } from './media-credits.js'

export const practitioners = [
  {
    id: 'amara',
    photo: media['practitioner-chidi'].thumb,
    name: 'Dr Chidi Okafor',
    role: 'Founder and lead nutritional therapist',
    credentials: ['MSc Nutritional Therapy', 'BANT registered', '12 years in practice'],
    bio: 'I started Halvera after years of seeing clients told their symptoms were "just stress". Here we take the time to listen, look at the whole picture and make changes that last.',
    href: '/about-us',
  },
  {
    id: 'leah',
    photo: media['practitioner-owen'].thumb,
    name: 'Owen Marsh',
    role: 'Men’s health practitioner',
    credentials: ['Dip. Naturopathy', 'Certified health coach'],
    bio: 'Owen supports men through midlife and the years after, with food, rest, movement and steady routines, always alongside their GP.',
    href: '/about-us',
  },
  {
    id: 'samir',
    photo: media['practitioner-samir'].thumb,
    name: 'Samir Haddad',
    role: 'Breathwork and sleep coach',
    credentials: ['Certified breathwork facilitator', 'CBT-I trained'],
    bio: 'Samir leads the guided audio library and the sleep programme, and runs our evening breathwork sessions.',
    href: '/about-us',
  },
]

export const getPractitioner = (id) => practitioners.find((p) => p.id === id) || practitioners[0]

export const testimonials = [
  { quote: 'For the first time in years I wake up rested. The changes were small, which is why they stuck.', name: 'Hiro L.', detail: 'Better Sleep in 21 Days', rating: 5 },
  { quote: 'I finally understand what my body is telling me. Chidi never made me feel rushed.', name: 'Pranav S.', detail: 'Gut Health Reset', rating: 5 },
  { quote: 'The weekly circle kept me going on the hard weeks. It felt like a group of friends.', name: 'Jonah M.', detail: 'Men’s Health Circle', rating: 5 },
  { quote: 'Clear, kind and practical. I came for the bloating and stayed for the community.', name: 'Rafael K.', detail: 'Supported membership', rating: 5 },
  { quote: 'The breathwork audio is the first thing I reach for after a long day.', name: 'Tom B.', detail: 'Rest and Restore Audio', rating: 4 },
]
