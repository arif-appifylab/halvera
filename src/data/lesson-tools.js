// Lesson tools data: per-lesson resources, discussion threads and transcripts for the course player's
// lesson tools (src/components/lesson-tools/*). Keyed by product slug, then lesson id.
// Fictional school, fictional people. Discussion authors are men only (the client's rule).

import { getPractitioner } from '@/data/people.js'


/* ---------- Resources ----------
   A resource is a file ({ kind: 'file', name, type, size, href }) or a link ({ kind: 'link', name, href, note }).
   Files download from `href`; links open in a new tab. */

const tracker = { kind: 'file', name: 'Symptom tracker.pdf', type: 'PDF', size: '320 KB', href: '/files/symptom-tracker.pdf' }
const slides = { kind: 'file', name: 'Your gut, in eight slides.pdf', type: 'PDF', size: '1.1 MB', href: '/files/gut-basics-slides.pdf' }
const captions = { kind: 'file', name: 'Meal timing, captions.vtt', type: 'WebVTT', size: '2 KB', href: '/files/meal-timing.en.vtt' }
const nhsIndigestion = { kind: 'link', name: 'NHS: indigestion', href: 'https://www.nhs.uk/conditions/indigestion/', note: 'When to see a GP about indigestion' }
const bdaFibre = { kind: 'link', name: 'British Dietetic Association: fibre', href: 'https://www.bda.uk.com/resource/fibre.html', note: 'A plain guide to fibre and how much we need' }

export const lessonResources = {
  'gut-health-reset': {
    welcome: [slides, tracker],
    'how-it-works': [tracker],
    'gut-basics': [slides],
    tracker: [tracker],
    pace: [tracker, nhsIndigestion],
    breathing: [{ kind: 'file', name: 'Calm breath, printable steps.pdf', type: 'PDF', size: '320 KB', href: '/files/symptom-tracker.pdf' }],
    timing: [
      { kind: 'file', name: 'Meal rhythm planner.pdf', type: 'PDF', size: '320 KB', href: '/files/symptom-tracker.pdf' },
      tracker,
      nhsIndigestion,
    ],
    'timing-interactive': [captions, tracker],
    'meal-planner': [tracker],
    fibre: [tracker, bdaFibre],
    stress: [tracker],
  },
}

/* ---------- Discussion ----------
   Threads for one lesson. `ago` is minutes before now (so Newest sorts and the times read naturally);
   `text` is HTML from the rich text editor's schema (rendered through RichTextView, never injected). */

const chidi = getPractitioner('amara')
const owen = getPractitioner('leah')
const practitioner = (p) => ({ author: p.name, avatar: p.photo, practitioner: true })

const HOUR = 60
const DAY = 24 * HOUR

export const lessonDiscussions = {
  'gut-health-reset': {
    timing: [
      {
        id: 'timing-1', author: 'Rafael K.', ago: 2 * DAY, likes: 14,
        text: '<p>I work shifts, so my evening meal is sometimes at 2am. Does the two-to-three-hour gap still apply when I sleep in the day?</p>',
        replies: [
          {
            id: 'timing-1-r1', ...practitioner(chidi), ago: 2 * DAY - 3 * HOUR, likes: 9,
            text: '<p>Good question, Rafael. Think of it as <strong>before sleep</strong>, not before a clock time. If you sleep at 9am, aim to finish eating by about 6 or 7am. Keep the gaps between meals steady across your shift pattern where you can.</p>',
          },
          { id: 'timing-1-r2', author: 'Marcus T.', ago: DAY + 5 * HOUR, likes: 3, text: '<p>Nurse here, same pattern. Planning my last meal before the drive home has helped a lot.</p>' },
        ],
      },
      {
        id: 'timing-2', author: 'Pranav S.', ago: 5 * HOUR, likes: 8,
        text: '<p>Moving dinner from 9pm to 7pm made a bigger difference than I expected. Three nights in and I’m sleeping better too.</p>',
        replies: [
          { id: 'timing-2-r1', author: 'Tom B.', ago: 3 * HOUR, likes: 2, text: '<p>Same here. I didn’t expect the sleep part.</p>' },
        ],
      },
      {
        id: 'timing-3', author: 'Daniel O.', ago: 6 * DAY, likes: 5,
        text: '<p>Is a small snack before bed fine, or does it undo the gap?</p>',
        replies: [
          {
            id: 'timing-3-r1', ...practitioner(chidi), ago: 6 * DAY - 2 * HOUR, likes: 6,
            text: '<p>For most people a small, plain snack is fine: a few oatcakes or a banana. Notice how you feel in your tracker. If mornings feel heavier, try it without for a few days and compare.</p>',
          },
        ],
      },
    ],
    'timing-interactive': [
      {
        id: 'ti-1', author: 'Hiro L.', ago: DAY + 2 * HOUR, likes: 4,
        text: '<p>The question in the middle made me realise I usually finish eating at 10pm. That’s the change I’m trying this week.</p>',
        replies: [
          { id: 'ti-1-r1', ...practitioner(chidi), ago: DAY, likes: 3, text: '<p>That’s a very good place to start, Hiro. Move it by 30 minutes at a time rather than all at once.</p>' },
        ],
      },
    ],
    welcome: [
      {
        id: 'welcome-1', author: 'Jonah M.', ago: 9 * DAY, likes: 11,
        text: '<p>Hello from Leeds. Here for the bloating after lunch. Anyone else starting this week?</p>',
        replies: [
          { id: 'welcome-1-r1', author: 'Ibrahim A.', ago: 8 * DAY, likes: 2, text: '<p>Starting today. Lunch is my hard meal too.</p>' },
          { id: 'welcome-1-r2', ...practitioner(owen), ago: 8 * DAY - 4 * HOUR, likes: 5, text: '<p>Welcome, both of you. Bring lunch questions to the monthly live Q&amp;A, we always leave time for them.</p>' },
        ],
      },
      {
        id: 'welcome-2', author: 'Tom B.', ago: 3 * DAY, likes: 2,
        text: '<p>Can I do the weeks out of order, or is it better to follow them?</p>',
        replies: [
          { id: 'welcome-2-r1', ...practitioner(chidi), ago: 3 * DAY - 5 * HOUR, likes: 4, text: '<p>Follow them if you can. Each week builds on the last, and it makes your tracker easier to read.</p>' },
        ],
      },
    ],
    pace: [
      {
        id: 'pace-1', author: 'Marcus T.', ago: 4 * DAY, likes: 7,
        text: '<p>Putting the fork down between mouthfuls felt silly for two days, then normal. Lunch takes 15 minutes now instead of 5.</p>',
        replies: [],
      },
    ],
    breathing: [
      {
        id: 'breathing-1', author: 'Ibrahim A.', ago: 2 * DAY + 6 * HOUR, likes: 3,
        text: '<p>Is it fine to do this at my desk, with other people around?</p>',
        replies: [
          { id: 'breathing-1-r1', ...practitioner(chidi), ago: 2 * DAY, likes: 2, text: '<p>Yes. Nobody needs to notice. Keep your eyes open and the breath quiet. Two or three rounds is enough.</p>' },
        ],
      },
    ],
  },
}

/* ---------- Transcripts ----------
   Either `vtt` (a WebVTT file, parsed in the browser) or `cues` ([start, end, text] in seconds).
   The theme preview plays a 29-second stand-in clip for every video lesson, so video cues are timed to
   it; replace them with the school's own transcripts when the real videos are uploaded. */

export const lessonTranscripts = {
  'gut-health-reset': {
    'timing-interactive': { vtt: '/files/meal-timing.en.vtt' },
    welcome: {
      cues: [
        [0.5, 4, 'Welcome. I’m Chidi, and I’ll be with you for the next six weeks.'],
        [4, 8.5, 'We’ll make one small change at a time, so you can see what helps and what doesn’t.'],
        [8.5, 13, 'Each lesson takes ten to fifteen minutes. Watch them in order, at a pace that suits your week.'],
        [13, 17.5, 'Keep your symptom tracker beside you. A few honest notes a day are enough.'],
        [17.5, 22.5, 'There is no falling behind here. Nothing expires, and you can repeat a week whenever you like.'],
        [22.5, 28.5, 'If anything worries you along the way, talk to your GP. Now, let’s begin.'],
      ],
    },
    pace: {
      cues: [
        [0.5, 4.5, 'This week is about how fast we eat, not what we eat.'],
        [4.5, 9, 'Chewing is the first step of digestion. Rushing it means your stomach has more work to do.'],
        [9, 13.5, 'Eating quickly can also mean swallowing more air, which some people feel as bloating.'],
        [13.5, 18.5, 'Here’s the change: at one meal a day, put your fork down between mouthfuls.'],
        [18.5, 23.5, 'Chew until the texture changes, then pick it up again.'],
        [23.5, 28.5, 'An hour later, notice how you feel and jot it in your tracker.'],
      ],
    },
    timing: {
      cues: [
        [0.5, 4, 'Let’s talk about when you eat, not only what you eat.'],
        [4, 8, 'Your gut has a daily rhythm, a little like sleep. It likes a steady pattern.'],
        [8, 12.5, 'Two things tend to unsettle it: long gaps between meals, and late, heavy dinners.'],
        [12.5, 17, 'We won’t aim for an ideal day. We’ll look for a rhythm that fits your working day.'],
        [17, 21.5, 'Start with the evening. Try to finish eating two to three hours before bed.'],
        [21.5, 25.5, 'If you work shifts, count back from when you sleep, not from the clock.'],
        [25.5, 28.8, 'Try it for the rest of this week and note how you feel each morning.'],
      ],
    },
    fibre: {
      cues: [
        [0.5, 4.5, 'Fibre feeds the helpful bacteria in your gut. Most of us eat less than we need.'],
        [4.5, 9.5, 'But adding a lot at once is one of the most common causes of bloating.'],
        [9.5, 14, 'So we go slowly: one extra portion a day, for a week, before adding another.'],
        [14, 19, 'Oats, lentils, a piece of fruit with the skin on. Small, familiar foods.'],
        [19, 24, 'Drink a little more water as you go. Fibre works best with it.'],
        [24, 28.5, 'If you feel uncomfortable, stay where you are for a few more days. That’s fine.'],
      ],
    },
    stress: {
      cues: [
        [0.5, 5, 'Your gut and your brain send signals to each other all day long.'],
        [5, 10, 'When you’re stressed, digestion can speed up or slow down. Many people notice both.'],
        [10, 15, 'We can’t remove stress, but we can give the body a calmer moment before meals.'],
        [15, 20, 'That might be the breathing practice, a short walk, or simply sitting down to eat.'],
        [20, 28.5, 'This week, pick one meal and give it two quiet minutes before you start.'],
      ],
    },
    dropin: {
      cues: [
        [0.5, 4, 'Thanks for joining the drop-in, everyone. Let’s start with your questions.'],
        [4, 9, 'Rafael asks whether a coffee first thing counts as breakfast. Short answer: not quite.'],
        [9, 14.5, 'Coffee on an empty stomach unsettles some people. Try it with or after something small.'],
        [14.5, 20, 'Next, a question about eating out. Choose the slower meal, and the pace change still counts.'],
        [20, 28.5, 'And a reminder: if you notice anything that worries you, speak to your GP first.'],
      ],
    },
    live: {
      cues: [
        [0.5, 5, 'Welcome back to the live Q&A. Tonight we’re looking at the gut–brain connection.'],
        [5, 11, 'Pranav asks why his symptoms are worse on work days. Stress is a very common reason.'],
        [11, 17, 'Try a calm breath before lunch on those days and compare them in your tracker.'],
        [17, 23, 'Daniel asks about sleep. A steady wake time often helps digestion more than an early night.'],
        [23, 28.5, 'We’ll pick up the rest of your questions next month. Thank you, all.'],
      ],
    },
    breathing: {
      cues: [
        [0, 40, 'Find a comfortable way to sit, with your feet on the floor. You don’t need to close your eyes, but you can if that feels good.'],
        [40, 80, 'Breathe in gently through your nose for a count of four. Let your belly rise, rather than your shoulders.'],
        [80, 130, 'Breathe out slowly through your mouth for a count of six, as if you were cooling a spoonful of soup.'],
        [130, 220, 'We’ll repeat that six times together. If your mind wanders to the meal ahead, that’s fine. Just come back to the count.'],
        [220, 270, 'Before you start eating, take one more slow breath and notice the food in front of you: its colour, its smell, its warmth.'],
      ],
    },
  },
}

export const resourcesFor = (slug, lessonId) => lessonResources[slug]?.[lessonId] || []
export const discussionFor = (slug, lessonId) => lessonDiscussions[slug]?.[lessonId] || []
export const transcriptFor = (slug, lessonId) => lessonTranscripts[slug]?.[lessonId] || null
