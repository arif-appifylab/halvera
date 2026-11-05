// Every stock photo the theme shows, with its credit and licence. People shown are men only
// (client brief); topic photos without people are used where a man would read oddly. Images are hotlinked from the
// source CDN (nothing is stored in the repo). A school replaces these with its own uploads; when a
// field is empty the pages fall back to /images/hero-placeholder.svg or the component placeholder.
//
// Licences (both allow free commercial use without permission or payment; credit is appreciated):
//   Pexels License   https://www.pexels.com/license/
//   Unsplash License https://unsplash.com/license
// Human-readable list: CREDITS.md

const PEXELS = { source: 'Pexels', licence: 'Pexels License', licenceUrl: 'https://www.pexels.com/license/' }
const UNSPLASH = { source: 'Unsplash', licence: 'Unsplash License', licenceUrl: 'https://unsplash.com/license' }

const pexelsUrl = (id, w) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`
const unsplashUrl = (id, w) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`

// url: large (heroes, page media). thumb: cards, portraits and avatars.
const pexels = (key, id, slug, photographer, alt) => ({
  key, id: String(id), alt, photographer, ...PEXELS,
  url: pexelsUrl(id, 1200), thumb: pexelsUrl(id, 640),
  sourceUrl: `https://www.pexels.com/photo/${slug}-${id}/`,
})
const unsplash = (key, id, pageId, slug, photographer, alt) => ({
  key, id: `photo-${id}`, alt, photographer, ...UNSPLASH,
  url: unsplashUrl(id, 1200), thumb: unsplashUrl(id, 640),
  sourceUrl: `https://unsplash.com/photos/${slug}-${pageId}`,
})

export const mediaList = [
  // Heroes
  pexels('home-hero', 7551595, 'a-man-slicing-tomatoes-in-the-kitchen', 'Kampus Production',
    'An older and a younger man preparing vegetables together in a home kitchen'),
  pexels('about-hero', 13334752, 'men-talking-in-a-kitchen', 'Mizuno K',
    'Two men talking in a bright kitchen with plants'),

  // Practitioners
  pexels('practitioner-chidi', 6757964, 'middle-aged-black-man-in-elegant-suit', 'Steward Masweneng',
    'Portrait of a smiling middle-aged man in a jacket and tie'),
  pexels('practitioner-owen', 6688614, 'elderly-man-smiling', 'cottonbro studio',
    'Portrait of a smiling older man with a grey beard in a blue shirt'),
  pexels('practitioner-samir', 38670596, 'portrait-of-smiling-man-in-casual-attire', 'McFollis',
    'Portrait of a smiling man in a beige sweater'),

  // Products
  pexels('product-gut-health-reset', 7262904, 'ripe-vegetables-and-glass-jars-placed-on-kitchen-counter', 'Sarah Chai',
    'Fresh vegetables and glass jars on a kitchen counter by a window'),
  pexels('product-mens-health-circle', 3975566, 'laptop-with-empty-screen-placed-near-cup-of-tea-smartphone-and-notebook-in-workspace', 'Tatiana Syrikova',
    'A laptop, a cup of tea, a phone and a notebook on a table, ready for an online session'),
  pexels('product-calm-gut-bundle', 10510752, 'honey-and-tea-on-cutting-board', 'Anastasia Ilina-Makarova',
    'Herbal tea and honey on a wooden board by a window'),
  pexels('product-one-to-one-coaching', 8937480, 'two-men-drinking-coffee-while-talking', 'Thirdman',
    'Two men in conversation over coffee'),
  pexels('product-healing-circle-community', 5711177, 'men-consoling-a-member-of-a-group-therapy', 'Tima Miroshnichenko',
    'Three men sitting together in a support group, one comforting another'),
  pexels('product-rest-and-restore-audio', 7651737, 'a-man-in-gray-sleeves-listening-to-music', 'Kindel Media',
    'A man relaxing indoors with headphones, eyes closed'),
  pexels('product-retreat-recordings', 4334979, 'photo-of-two-men-doing-yoga', 'ArtHouse Studio',
    'Two men practising yoga balancing poses outdoors'),
  pexels('product-halvera-library', 1640767, 'three-clear-glass-jars-on-gray-surface', 'Ella Olsson',
    'Three jars of prepared quinoa salad with mushrooms and tomatoes'),
  pexels('product-spring-gut-workshop', 3298639, 'person-slicing-green-leafy-vegetable', 'cottonbro studio',
    'Hands slicing bok choy on a wooden board'),
  pexels('product-winter-retreat', 34381358, 'charming-frosty-morning-scene-with-rural-cottage', 'Damir K',
    'A rural cottage on a frosty, misty morning'),
  pexels('product-sunday-letter', 8715958, 'a-diary-beside-a-cup-of-tea', 'Katya Wolf',
    'An open journal with a handwritten entry beside a cup of tea by the window'),
  pexels('product-mindful-eating-basics', 6740529, 'man-eating-on-a-rice-bowl', 'Mikhail Nilov',
    'A man in a white shirt enjoying a bowl of fresh salad indoors'),
  pexels('product-better-sleep-21-days', 10061393, 'a-bed-with-white-pillow-and-creased-linen', 'cottonbro studio',
    'An unmade bed with white linen in soft morning light'),
  pexels('product-mens-health-foundations', 36511421, 'cozy-morning-tea-with-journal-and-candle-on-wooden-table', 'William Finn',
    'A cup of tea, a journal and a candle on a wooden table in the morning'),
  pexels('product-stress-less-programme', 6303797, 'man-with-eyes-closed-meditating-at-home', 'Klaus Nielsen',
    'A man sitting cross-legged at home with his eyes closed, meditating'),

  // Conditions
  pexels('condition-gut-health', 28645472, 'preparing-homemade-pickled-vegetables-in-jar', 'hello aesthe',
    'Hands packing homemade pickled vegetables into a jar'),
  pexels('condition-mens-health', 5067669, 'aged-gray-haired-man-running-on-stadium', 'Anna Shvets',
    'A grey-haired man running on an outdoor track in summer'),
  pexels('condition-energy', 5990953, 'man-in-gray-shirt-waking-up', 'Kampus Production',
    'A man stretching in bed in bright morning light'),
  pexels('condition-sleep', 7556587, 'man-sleeping-comfortably-in-bed', 'Kampus Production',
    'A man sleeping comfortably under white sheets'),
  pexels('condition-stress', 6974786, 'tranquil-black-man-sitting-with-closed-eyes-and-crossed-legs-on-floor', 'SHVETS production',
    'A man sitting cross-legged on the living room floor with his eyes closed'),
  pexels('condition-mindful-eating', 5425871, 'a-man-eating-salad-in-a-bowl', 'Nataliya Vaitkevich',
    'A man eating a bowl of fresh salad outdoors in summer'),

  // Blog posts
  pexels('post-why-your-gut-reacts-to-stress', 6837648, 'overworked-employee-lying-in-front-of-laptop', 'Nataliya Vaitkevich',
    'A tired man resting his head on his desk in front of a laptop'),
  unsplash('post-five-gentle-swaps-for-a-calmer-gut', '1512621776951-a57141f2eefd', 'IGfIGP5ONV0', 'bowl-of-vegetable-salads', 'Anna Pelzer',
    'A colourful bowl of salad vegetables and greens'),
  pexels('post-midlife-sleep', 4346281, 'book-and-cup-of-tea-in-cozy-room', 'Ioana Motoc',
    'A teapot and an open book on a cloth with small pink flowers'),
  pexels('post-prostate-friendly-eating', 12809403, 'bowl-of-red-tomatoes', 'Ramon Crivelli',
    'Ripe cherry tomatoes in a blue bowl on a wooden table'),
  pexels('post-a-wind-down-routine-you-will-keep', 28594393, 'cozy-evening-tea-ritual-with-candlelight', 'Polat Eyyüp Albayrak',
    'An evening cup of herbal tea beside a lit candle'),
  pexels('post-breathing-for-sleep', 5302897, 'serene-man-meditating-in-lotus-pose-on-sofa', 'Monstera Production',
    'A young man sitting cross-legged with his eyes closed, breathing slowly'),
  pexels('post-how-to-notice-when-you-are-full', 6740538, 'man-eating-a-rice-bowl', 'Mikhail Nilov',
    'A man eating from a bowl of noodles, taking his time'),
  unsplash('post-warm-oat-and-stewed-apple-bowl', '1710444224000-273d950eb27b', 'Fqcqe0dQR7A', 'a-bowl-of-oatmeal-apple-slices-and-spoon-on-a-plate', 'Stephanie Sarlos',
    'A bowl of oats with apple slices and a spoon'),
  pexels('post-miso-ginger-and-greens-soup', 11834941, 'bowl-with-soup', 'Yaka Bagus',
    'A bowl of vegetable and tofu soup in a ceramic bowl'),
]

export const media = Object.fromEntries(mediaList.map((m) => [m.key, m]))

// Look up one photo by key. Returns undefined for unknown keys so callers can fall back.
export const getMedia = (key) => media[key]

// Alt text for a photo URL taken from a data file (products only store `image`). Empty for unknown
// URLs, e.g. a school's own upload that has no description yet.
export const altFor = (url) => mediaList.find((m) => m.url === url || m.thumb === url)?.alt || ''
