// Media library content the server sends with the library page: show notes, transcripts, the
// signed-in viewer's own state (when they joined, where they stopped) and the private podcast feed.
// The library settings (format, promo, release schedule, expiry, episodes) are on the product in
// src/data/products.js. Logic: src/components/media-library/schedule.js.

// Show notes ("Shown under the player on the episode page") and transcripts, keyed by slug, then episode id.
export const episodeNotes = {
  'calm-gut-podcast': {
    'gut-and-stress': {
      notes: 'Why a stressful week so often shows up as a stomach ache, what the gut–brain connection is, and three small things to try before your next meal.',
      links: ['Blog: Why your gut reacts to stress', 'The calm breath before meals (2 minutes)'],
      transcript: [
        ['00:00', 'Chidi', 'Hello, and welcome to The Calm Gut. I’m Chidi, and this is a podcast about digestion, stress and food, in plain language.'],
        ['00:24', 'Chidi', 'Today we’re starting with the question I hear most in clinic: why does my stomach play up when life gets busy?'],
        ['01:10', 'Chidi', 'Your gut and your brain talk all day long, mostly through the vagus nerve. When you’re stressed, digestion is simply not the priority.'],
        ['02:45', 'Chidi', 'So the first thing to try is the least exciting one: slow down the first five bites of a meal.'],
      ],
    },
    'fibre-gently': {
      notes: 'How to add fibre without the bloating: go slowly, spread it across the day and drink a little more water. Includes Chidi’s two-week fibre ladder.',
      links: ['Download: the two-week fibre ladder'],
      transcript: [
        ['00:00', 'Chidi', 'Welcome back. This week is all about fibre, and why “eat more of it” is good advice that often goes wrong.'],
        ['00:52', 'Chidi', 'If you add a lot of fibre at once, your gut bacteria have a feast, and the result is gas and bloating. The trick is pace.'],
      ],
    },
    'eating-pace': { notes: 'What happens when you eat quickly, how to notice your own pace, and a simple ten-chew experiment for this week.' },
    'listener-questions-1': { notes: 'Your questions on keeping a food diary without it taking over, and what to do in the first hours of a flare-up.' },
    'sleep-and-digestion': { notes: 'Late meals, broken sleep and a grumbling gut: how they feed each other, and an evening routine that helps both.' },
    'fermented-foods': { notes: 'Kefir, kimchi and sauerkraut without overdoing it. Where to start, how much, and when to skip them.' },
    'hormones-and-gut': { notes: 'Owen Marsh joins Chidi to talk about how stress hormones, testosterone and midlife changes can affect digestion, and what to track.' },
    'eating-out': { notes: 'Menus, travel and social meals: how to enjoy eating out when your gut is unpredictable.' },
    'listener-questions-2': { notes: 'Keeping a routine on holiday, jet lag and digestion, and what to pack for a long journey.' },
    'kind-movement': { notes: 'Why gentle movement after meals helps, and three moves you can do in the kitchen.' },
    'breath-and-belly': { notes: 'Samir Haddad guides a short breathing practice and explains why the exhale matters for digestion.' },
    'winter-meals': { notes: 'Soups, stews and slow-cooked meals that are kind to a sensitive gut.' },
    setbacks: { notes: 'Symptoms coming back is normal. How to respond calmly and get back on track.' },
    'year-one': { notes: 'A look back at the first season, your favourite episodes, and what comes next.' },
  },
}

// The signed-in viewer's state per library: joinedDaysAgo (purchase date, for "X days after purchase"
// and "from each user's enrollment"), last (episode to continue), position (seconds into it), done (finished episodes).
export const libraryProgress = {
  'gentle-movement-classes': { joinedDaysAgo: 12, last: 'hip-openers', position: 552, done: ['welcome', 'warm-up', 'wake-up-flow'] },
  'calm-in-ten-days': { joinedDaysAgo: 3, last: 'humming', position: 245, done: ['orienting', 'long-exhale'] },
  'rest-and-restore-audio': { joinedDaysAgo: 40, last: 'body-scan', position: 462, done: ['box-breathing', 'morning-reset'] },
  'calm-gut-podcast': { joinedDaysAgo: 30, last: 'breath-and-belly', position: 734, done: ['gut-and-stress', 'fibre-gently', 'eating-pace'] },
  'mens-health-evenings': { joinedDaysAgo: 20, last: 'blood-sugar', position: 1310, done: ['energy-basics'] },
}

// Private RSS feed for podcast libraries: one per listener, so it can be turned off if it is shared.
export const podcastFeed = {
  'calm-gut-podcast': {
    url: 'https://halvera.ezycourse.com/podcast/calm-gut-podcast/feed/7f3a9c21e4b8.rss',
    apps: ['Apple Podcasts', 'Pocket Casts', 'Overcast'],
  },
}
