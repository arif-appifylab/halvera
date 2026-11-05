// Marketing → Newsletters: the school's newsletter, its tiers and posts (the web archive).
// Tiers belong to the newsletter (admin: "Tiers belong to this newsletter"). Paid tiers are the
// prices on the newsletter product (src/data/products.js, `tier` on each price).
//
// Post web access (admin: Web access) is one of:
//   public       open to everyone ("Free")
//   subscribers  free subscribers: visitors read up to the checkout break, then subscribe free
//   paid         "Paid after preview": everyone reads up to the checkout break, then any paid tier
//   supporter    "Specific tiers": founding supporters only, after the break
//   members      included in a site membership (plans below), after the break
// `breakAt` is the index of the first body block behind the checkout break.
// Comments with `author: true` are the post's author replying (shown with their current name).

export const newsletters = [
  {
    slug: 'sunday-letter',
    name: 'The Sunday Letter',
    tagline: 'One calm letter a week: a recipe, a small practice and answers to your questions.',
    cadence: 'Every Sunday at 07:00 (GMT+1)',
    author: 'amara',
    subscribers: '4,812 subscribers',
    paidSubscribers: '612 on the paid edition',
    since: 'Since November 2023',
    comments: { on: true, paidOnly: true },
    // Site memberships that include the paid edition (admin: "A site membership can grant read access").
    membershipPlans: ['supported', 'founding'],
    tiers: [
      {
        id: 'free', name: 'Free letter', free: true,
        description: 'A short note every Sunday, and every post up to the checkout break.',
        perks: ['The weekly note by email', 'Free posts in the archive', 'Paid posts up to the break'],
      },
      {
        id: 'paid', name: 'Paid edition',
        description: 'The full letter, the whole archive and the comments.',
        perks: ['Every post in full', 'A weekly recipe and a 10-minute practice', 'Reader Q&A', 'The full archive', 'Comment on paid posts'],
      },
      {
        id: 'supporter', name: 'Founding supporter',
        description: 'Everything in the paid edition, plus a quarterly letter for supporters.',
        perks: ['Everything in the paid edition', 'Quarterly supporters’ letter', 'Your name in the yearly thank-you'],
      },
    ],
    // Fixed dates for the preview states (the server sends these with the subscription).
    dates: {
      trialEnds: 'Sun 19 Oct', renews: 'Sun 9 Nov', supporterRenews: '14 Mar 2027',
      pausedUntil: 'Sun 2 Nov', ended: 'Sun 5 Oct', unsubscribed: 'Sat 11 Oct',
    },
  },
]

export const getNewsletter = (slug) => newsletters.find((n) => n.slug === slug) || null

const c = (id, name, when, text, extra = {}) => ({ id, name, when, text, ...extra })

export const newsletterPosts = [
  {
    slug: 'soup-season-evening-wind-down', newsletter: 'sunday-letter', issue: 86,
    title: 'Soup season, and a 10-minute evening wind-down',
    date: 'Sun 12 Oct', author: 'amara', readTime: '6 min read', access: 'paid', breakAt: 2, likes: 214,
    excerpt: 'A simple miso and greens soup, a breathing practice for the end of a long day and your questions about bloating after exercise.',
    body: [
      { type: 'p', text: 'The evenings have drawn in this week, and with them the pull towards something warm in a bowl. This letter is about two small things that help me at the end of a long day: a soup that takes fifteen minutes and a wind-down that takes ten.' },
      { type: 'p', text: 'Neither is a fix. They are simply kind places to land when the day has asked a lot of you.' },
      { type: 'h2', text: 'Miso and greens soup' },
      { type: 'ul', items: ['1 litre of vegetable stock', '2 tablespoons of white miso', 'A handful of greens: kale, spinach or pak choi', 'A thumb of ginger, grated', 'Cooked rice or noodles, if you like'] },
      { type: 'p', text: 'Warm the stock with the ginger, add the greens for two minutes, then take it off the heat before you stir in the miso so it keeps its gentle flavour.' },
      { type: 'h2', text: 'The 10-minute wind-down' },
      { type: 'p', text: 'Dim one light. Sit somewhere you won’t be disturbed. Breathe in for four, out for six, and let your shoulders drop a little on each out-breath. When your mind wanders, notice where it went and come back.' },
      { type: 'quote', text: 'You don’t need to earn rest. You only need to make a little room for it.' },
    ],
    comments: [
      c('c1', 'Joel M.', '3 days ago', 'Made the soup twice this week. The tip about adding the miso last made such a difference.'),
      c('c2', 'Author', '3 days ago', 'So glad, Joel. Try a spoon of tahini in it next time too.', { author: true }),
      c('c3', 'Tom B.', '2 days ago', 'The longer out-breath helps me more than I expected.'),
    ],
  },
  {
    slug: 'falling-off-the-routine', newsletter: 'sunday-letter', issue: 85,
    title: 'What to do when you fall off the routine',
    date: 'Sun 5 Oct', author: 'leah', readTime: '4 min read', access: 'public', breakAt: null, likes: 341,
    excerpt: 'Why missing a few days doesn’t undo anything, plus overnight oats three ways and a short body scan.',
    body: [
      { type: 'p', text: 'Almost everyone who works with us has a week where the plan falls away. Work gets busy, someone is ill, sleep goes sideways. It happens, and it doesn’t undo the steps you’ve already taken.' },
      { type: 'h2', text: 'Start with the smallest piece' },
      { type: 'p', text: 'Pick one thing you did before the busy week and do only that, for three days. A glass of water when you wake, one slow meal, a short walk after lunch.' },
      { type: 'h2', text: 'Overnight oats, three ways' },
      { type: 'ul', items: ['Apple, cinnamon and a spoon of yoghurt', 'Banana, cocoa and peanut butter', 'Pear, ginger and toasted oats'] },
      { type: 'p', text: 'Make two jars on Sunday evening and Monday and Tuesday look after themselves.' },
    ],
    comments: [
      c('c1', 'Dev S.', '1 week ago', 'Needed to hear this one. Back to my one slow meal a day.'),
      c('c2', 'Rob K.', '6 days ago', 'Pear and ginger is my new favourite.'),
    ],
  },
  {
    slug: 'reader-qa-bloating-after-exercise', newsletter: 'sunday-letter', issue: 84,
    title: 'Reader Q&A: bloating after exercise',
    date: 'Sun 28 Sep', author: 'amara', readTime: '7 min read', access: 'paid', breakAt: 2, likes: 188,
    excerpt: 'Three of your questions this week: bloating after a run, eating before an early class and whether timing matters.',
    body: [
      { type: 'p', text: 'Thank you for every question you sent this month. I’ve picked three that came up again and again. As always, these are general ideas, not a diagnosis: if something worries you, talk to your GP or book a consultation.' },
      { type: 'h2', text: '“Why do I feel bloated after a run?”' },
      { type: 'p', text: 'Movement shifts blood flow away from digestion for a while, so a big meal close to exercise can sit heavily. Many people feel better leaving two hours after a full meal, or having something small and simple an hour before.' },
      { type: 'h2', text: '“What can I eat before a 7am class?”' },
      { type: 'p', text: 'Half a banana, a few oatcakes or a small yoghurt are easy on most stomachs. Notice how you feel and adjust; there’s no single right answer.' },
      { type: 'h2', text: '“Does meal timing matter?”' },
      { type: 'p', text: 'Regular meals help many of our clients feel steadier. If you’ve been skipping lunch, start there before changing anything else.' },
    ],
    comments: [
      c('c1', 'Adnan Rahman', '2 weeks ago', 'The two-hour gap has helped me a lot. Thank you for answering this.'),
    ],
  },
  {
    slug: 'a-slower-breakfast', newsletter: 'sunday-letter', issue: 83,
    title: 'A slower breakfast',
    date: 'Sun 21 Sep', author: 'amara', readTime: '3 min read', access: 'public', breakAt: null, likes: 276,
    excerpt: 'Five minutes at the table before the day starts, and a simple savoury porridge to go with it.',
    body: [
      { type: 'p', text: 'This week, one invitation: sit down for breakfast. Not every day, and not for long. Five minutes, phone in another room, before the day starts asking things of you.' },
      { type: 'h2', text: 'Savoury porridge' },
      { type: 'p', text: 'Cook oats in stock instead of milk, then top with a soft egg, a few spinach leaves and a little chilli oil. Warm, filling and quick.' },
      { type: 'p', text: 'Write back and tell me how it went. I read every reply.' },
    ],
    comments: [],
  },
  {
    slug: 'supporters-letter-behind-the-clinic', newsletter: 'sunday-letter', issue: 82,
    title: 'Supporters’ letter: a season behind the scenes',
    date: 'Sun 14 Sep', author: 'amara', readTime: '5 min read', access: 'supporter', breakAt: 1, likes: 64,
    excerpt: 'What we learned running our first cohort, what’s changing in the new year and a thank-you to everyone who helps keep the letter going.',
    body: [
      { type: 'p', text: 'Every three months I write a longer letter for founding supporters. It’s where I share what’s going on behind the scenes, and where your support goes.' },
      { type: 'h2', text: 'What we learned this season' },
      { type: 'p', text: 'Our first cohort showed us how much a small group helps. People kept going because others were going too. We’re keeping groups small next year.' },
      { type: 'h2', text: 'What’s next' },
      { type: 'p', text: 'A new sleep programme with Samir, more recipes in the archive and, from January, a short audio version of every letter.' },
    ],
    comments: [
      c('c1', 'Rui A.', '1 month ago', 'Lovely to see behind the curtain. The audio version is a great idea.'),
    ],
  },
  {
    slug: 'the-4-7-8-breath', newsletter: 'sunday-letter', issue: 81,
    title: 'The 4-7-8 breath, and when to skip it',
    date: 'Sun 7 Sep', author: 'samir', readTime: '5 min read', access: 'paid', breakAt: 2, likes: 152,
    excerpt: 'Samir guides this week’s practice: a slow breathing pattern for the evening, and gentler options if holding the breath doesn’t suit you.',
    body: [
      { type: 'p', text: 'Hello, it’s Samir. Our founder has handed me the letter this week to talk about one of the breathing patterns people ask about most.' },
      { type: 'p', text: '4-7-8 means breathing in for four, holding for seven and breathing out for eight. Many people find it settling in the evening.' },
      { type: 'h2', text: 'How to practise' },
      { type: 'ul', items: ['Sit or lie comfortably', 'Breathe in quietly through your nose for four', 'Hold gently for seven', 'Breathe out through your mouth for eight', 'Repeat four times, no more to begin with'] },
      { type: 'h2', text: 'When to skip it' },
      { type: 'p', text: 'If holding your breath makes you feel anxious or light-headed, leave out the hold and simply make the out-breath longer than the in-breath. That alone is enough.' },
    ],
    comments: [
      c('c1', 'Harry L.', '1 month ago', 'Leaving out the hold works much better for me. Thank you for saying that’s fine.'),
      c('c2', 'Author', '1 month ago', 'Absolutely fine, Harry. The long out-breath is the part that matters most.', { author: true }),
    ],
  },
  {
    slug: 'back-to-school-rhythms', newsletter: 'sunday-letter', issue: 80,
    title: 'Back-to-school rhythms for the whole household',
    date: 'Sun 31 Aug', author: 'leah', readTime: '4 min read', access: 'subscribers', breakAt: 2, likes: 119,
    excerpt: 'Gentle routines for busy September mornings, a lunchbox list and a two-minute reset for the school run.',
    body: [
      { type: 'p', text: 'September can feel like a second new year. Mornings speed up, evenings shorten and the routines that held over summer start to wobble.' },
      { type: 'p', text: 'Here are a few things that help the households we work with.' },
      { type: 'h2', text: 'A calmer morning' },
      { type: 'ul', items: ['Lay out breakfast things the night before', 'Wake ten minutes earlier for one week only', 'Keep one screen-free table'] },
      { type: 'h2', text: 'A two-minute reset' },
      { type: 'p', text: 'After the school run, before the next thing, stand still and take five slow breaths. Feel your feet on the ground. Then go on with your day.' },
    ],
    comments: [],
  },
  {
    slug: 'members-live-qa-written-up', newsletter: 'sunday-letter', issue: 79,
    title: 'Members’ edition: the August live Q&A, written up',
    date: 'Sun 24 Aug', author: 'amara', readTime: '8 min read', access: 'members', breakAt: 1, likes: 97,
    excerpt: 'The questions from this month’s members’ Q&A, with notes and links to the lessons we mentioned.',
    body: [
      { type: 'p', text: 'Each month members join us live for an hour of questions. Here are the notes, for anyone who couldn’t make it.' },
      { type: 'h2', text: 'Fibre, gently' },
      { type: 'p', text: 'Adding fibre slowly, over a few weeks, is kinder to most guts than a big change all at once.' },
      { type: 'h2', text: 'Sleep and late meals' },
      { type: 'p', text: 'Several of you noticed better sleep after moving dinner a little earlier. It’s worth a try for a week.' },
    ],
    comments: [
      c('c1', 'Joel M.', '1 month ago', 'So helpful to have these written up.'),
    ],
  },
  {
    slug: 'late-summer-tomatoes', newsletter: 'sunday-letter', issue: 78,
    title: 'Late-summer tomatoes, three ways',
    date: 'Sun 17 Aug', author: 'amara', readTime: '3 min read', access: 'public', breakAt: null, likes: 402,
    excerpt: 'A quick roast, a no-cook salad and a tomato and white bean stew for cooler evenings.',
    body: [
      { type: 'p', text: 'The tomatoes are at their best this month, so this week’s letter is simply three ways I’ve been eating them.' },
      { type: 'ul', items: ['Roasted with garlic and thyme, then crushed onto toast', 'Sliced with olive oil, salt and torn basil', 'Simmered with white beans and a bay leaf'] },
      { type: 'p', text: 'Enjoy the last of the long evenings.' },
    ],
    comments: [c('c1', 'Tom B.', '2 months ago', 'The bean stew is on repeat here.')],
  },
  {
    slug: 'rest-is-not-a-reward', newsletter: 'sunday-letter', issue: 77,
    title: 'Rest is not a reward',
    date: 'Sun 10 Aug', author: 'samir', readTime: '5 min read', access: 'paid', breakAt: 2, likes: 233,
    excerpt: 'Why waiting until everything is done before you rest rarely works, and three short ways to rest in the middle of the day.',
    body: [
      { type: 'p', text: 'Many of us treat rest as something we earn once the list is finished. The list is rarely finished.' },
      { type: 'p', text: 'This week, I’d like to suggest resting in small pieces, before you feel you deserve it.' },
      { type: 'h2', text: 'Three short rests' },
      { type: 'ul', items: ['Two minutes with your eyes closed after lunch', 'A slow walk to the end of the road and back', 'One song, lying on the floor, legs up the wall'] },
      { type: 'p', text: 'None of them take long. Together, they change the shape of a day.' },
    ],
    comments: [],
  },
  {
    slug: 'training-and-appetite', newsletter: 'sunday-letter', issue: 76,
    title: 'Training and appetite',
    date: 'Sun 3 Aug', author: 'leah', readTime: '4 min read', access: 'public', breakAt: null, likes: 167,
    excerpt: 'Owen on why hunger can change after a hard week of training, and how to meet it kindly instead of fighting it.',
    body: [
      { type: 'p', text: 'If your appetite jumps the day after a long run, a heavy gym session or a five-a-side match, you’re not imagining it. Your body is asking for what it needs to recover.' },
      { type: 'p', text: 'Rather than fighting it, try planning for it: a more filling breakfast with some protein, a snack you enjoy within reach, an earlier night.' },
      { type: 'p', text: 'If changes feel big or worrying, talk to your GP, or book a consultation with us.' },
    ],
    comments: [],
  },
]

export const postsFor = (slug) => newsletterPosts.filter((p) => p.newsletter === slug)
export const getNewsletterPost = (slug, postSlug) => newsletterPosts.find((p) => p.newsletter === slug && p.slug === postSlug) || null
