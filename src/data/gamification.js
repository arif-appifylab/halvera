// Gamification, as the backend has it (EzyCommunity → Gamification). Members earn points (XP) for
// activities and climb nine badge levels automatically: each level IS a badge, with a name, subtext,
// the points needed, an optional perk, and an image from the school's chosen badge set (Journey,
// Voyage, Cosmos, Ascension or Olympus). There are no separate one-off badges and no streaks.
// The leaderboard ranks members by points: rank, member, badge, points, in pages, with "Your position".
// Images are the platform's default badge art for the Journey set.
const CDN = 'https://site-cdn-net.b-cdn.net/gamification/default/'

// Badges & Levels: the Journey set's defaults (name, subtext, points to reach, colours, image).
export const badgeSet = { code: 'journey', name: 'Journey' }
export const levels = [
  { level: 1, name: 'Sprout', subtext: 'Just planted.', points: 10, colors: ['#A8B2C2', '#717B8C'], img: `${CDN}default-journey-sprout_l1_1780881352383.svg` },
  { level: 2, name: 'Rookie', subtext: 'You’re in. Welcome aboard.', points: 30, colors: ['#4ADE80', '#16A34A'], img: `${CDN}default-journey-leaf_l2_1780881352646.svg` },
  { level: 3, name: 'Regular', subtext: 'People are noticing you.', points: 75, colors: ['#2DD4BF', '#0D9488'], img: `${CDN}default-journey-message_l3_1780881352939.svg` },
  { level: 4, name: 'Insider', subtext: 'One of the regulars now.', points: 150, colors: ['#5B8DEF', '#2563EB'], img: `${CDN}default-journey-gem_l4_1780913434716.svg` },
  { level: 5, name: 'Connector', subtext: 'You hold this place together.', points: 400, colors: ['#A78BFA', '#7C3AED'], img: `${CDN}default-journey-link_l5_1780913436232.svg` },
  { level: 6, name: 'Veteran', subtext: 'A pillar of the community.', points: 1000, colors: ['#818CF8', '#4F46E5'], img: `${CDN}default-journey-shield_l6_1780881354038.svg` },
  { level: 7, name: 'Mentor', subtext: 'Others learn from you.', points: 3000, colors: ['#FBBF24', '#D97706'], img: `${CDN}default-journey-award_l7_1780881355906.svg` },
  { level: 8, name: 'Luminary', subtext: 'You light the way.', points: 9000, colors: ['#FB923C', '#EA580C'], img: `${CDN}default-journey-star_l8_1780881356373.svg` },
  { level: 9, name: 'Legend', subtext: 'A name everyone knows.', points: 30000, colors: ['#F472B6', '#9333EA'], img: `${CDN}default-journey-crown_l9_1780881356865.svg` },
]

// Activity XP: what earns points (the platform defaults; "once" or "each" time).
export const activities = [
  { title: 'Complete a course', category: 'Courses', cadence: 'each', points: 50 },
  { title: 'Attend an event', category: 'Events & Live', cadence: 'each', points: 25 },
  { title: 'Join a live session', category: 'Events & Live', cadence: 'each', points: 10 },
  { title: 'Enroll in a course', category: 'Courses', cadence: 'each', points: 5 },
  { title: 'Join the community', category: 'Membership', cadence: 'once', points: 5 },
  { title: 'React to a post', category: 'Engagement', cadence: 'each', points: 2 },
  { title: 'React to a comment', category: 'Engagement', cadence: 'each', points: 1 },
  { title: 'Update profile picture', category: 'Profile', cadence: 'once', points: 2 },
  { title: 'Complete your bio', category: 'Profile', cadence: 'once', points: 2 },
  { title: 'Update cover photo', category: 'Profile', cadence: 'once', points: 1 },
  { title: 'Add a social profile', category: 'Profile', cadence: 'once', points: 1 },
]

// The level a points total reaches (0 before the first badge).
export const levelFor = (points) => levels.filter((l) => points >= l.points).pop() || null

// The leaderboard, highest first (the student is one row). Points come from the activities above.
export const leaderboardRows = [
  ['Jonah M.', 1180], ['Rafael K.', 960], ['Priya D.', 845], ['Hannah W.', 610], ['Marcus O.', 540],
  ['Sofia L.', 455], ['Tom B.', 410], ['Adnan Rahman', 320, true], ['Grace N.', 305], ['Pranav S.', 290],
  ['Leila A.', 240], ['Ben C.', 205], ['Mei T.', 180], ['Oscar F.', 150], ['Ruth E.', 120],
  ['Daniel K.', 95], ['Ana P.', 70], ['Yusuf H.', 45],
]
