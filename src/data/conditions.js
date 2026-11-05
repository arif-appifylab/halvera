// "Health topics". Each condition links to its own page and to related products (by slug).
import { media } from './media-credits.js'

export const conditions = [
  {
    slug: 'gut-health', icon: 'leaf', title: 'Gut health',
    image: media['condition-gut-health'].url,
    text: 'Bloating, reflux and irregular digestion, eased step by step.',
    intro: 'Digestive symptoms are common, and they are rarely about one food. We look at what you eat, how you eat, sleep, stress and your history, then make small changes in a sensible order.',
    symptoms: ['Bloating that builds through the day', 'Reflux or heartburn', 'Constipation, loose stools or both', 'Feeling tired after meals', 'A long list of foods you now avoid'],
    approach: [
      { title: 'Listen first', text: 'A full consultation covering your history, routines and what you have already tried.' },
      { title: 'Calm things down', text: 'Gentle changes to meals, timing and eating pace before any elimination.' },
      { title: 'Rebuild variety', text: 'Reintroduce foods with a plan, so your diet grows rather than shrinks.' },
    ],
    fits: ['You have seen your doctor and serious causes have been ruled out', 'You want to understand your triggers, not just avoid foods', 'You can make room for small daily changes'],
    notFits: ['You have unexplained weight loss, bleeding or severe pain (see your doctor first)', 'You want a strict elimination diet without support'],
    related: ['gut-health-reset', 'calm-gut-bundle', 'halvera-library'],
    faqs: [
      { question: 'Do I need tests before I start?', answer: 'Not usually. If tests would help, we will explain why and work with your doctor.' },
      { question: 'Will I have to cut out lots of foods?', answer: 'No. Most clients start by changing how and when they eat, not what they cut out.' },
    ],
  },
  {
    slug: 'mens-health', icon: 'heart', title: 'Men’s health',
    image: media['condition-mens-health'].url,
    text: 'Energy, hormones, heart health and the changes of midlife, with steady support.',
    intro: 'From your forties on, energy, sleep, mood, weight and heart health can all shift, and testosterone changes gradually with age. We build routines that support you through each stage, alongside care from your GP.',
    symptoms: ['Low energy or drive that lingers', 'Weight settling around the middle', 'Getting up in the night to use the loo', 'Feeling flat, irritable or stretched thin'],
    approach: [
      { title: 'Track and notice', text: 'A simple log of energy, food, sleep and training over a few weeks.' },
      { title: 'Steady the basics', text: 'Blood sugar, protein, rest and movement that suit your stage of life.' },
      { title: 'Adjust together', text: 'Regular check-ins so the plan changes as you do.' },
    ],
    fits: ['You want practical support alongside your GP', 'You are curious about how food, rest and training affect your energy and heart health'],
    notFits: ['You want to start or stop testosterone or other medication without your doctor', 'You have new urinary symptoms, blood in your urine or pain (see your GP first)'],
    related: ['mens-health-circle', 'one-to-one-coaching'],
    faqs: [
      { question: 'Can I join if I take medication, such as testosterone or blood pressure tablets?', answer: 'Yes. Our programmes work alongside medical treatment, never instead of it. Keep your GP in the loop about any changes you make.' },
      { question: 'Do you help with prostate health?', answer: 'We can help with prostate-friendly eating and everyday routines, alongside your GP. We don’t diagnose or treat prostate conditions, so see your doctor about any new symptoms first.' },
    ],
  },
  {
    slug: 'energy', icon: 'sparkle', title: 'Steady energy',
    image: media['condition-energy'].url,
    text: 'Fewer afternoon crashes, with routines that fit a busy week.',
    intro: 'Tiredness has many causes. We start with the everyday ones: meals, sleep, stress and movement.',
    symptoms: ['Afternoon crashes', 'Waking up tired', 'Relying on caffeine or sugar to get through the day'],
    approach: [
      { title: 'Map your day', text: 'Find where energy dips and what comes before it.' },
      { title: 'Small swaps', text: 'Meal and rest changes that fit around work and family.' },
      { title: 'Build momentum', text: 'Add movement and routines as energy returns.' },
    ],
    fits: ['Your bloods are normal but you still feel flat', 'You want a plan that fits a busy life'],
    notFits: ['You have new, severe fatigue (see your doctor first)'],
    related: ['gut-health-reset', 'mindful-eating-basics'],
    faqs: [],
  },
  {
    slug: 'sleep', icon: 'clock', title: 'Better sleep',
    image: media['condition-sleep'].url,
    text: 'Wind-down habits and nutrition that help you rest through the night.',
    intro: 'Good sleep is built across the whole day. We look at light, food, caffeine, stress and your evening routine.',
    symptoms: ['Trouble falling asleep', 'Waking at 3am', 'Feeling unrested after a full night'],
    approach: [
      { title: 'Reset the rhythm', text: 'Consistent wake times, light and meal timing.' },
      { title: 'Wind down', text: 'Guided breathwork and audio for the last hour of the day.' },
      { title: 'Protect the night', text: 'Simple changes that help you stay asleep.' },
    ],
    fits: ['You have tried sleep tips but nothing has stuck', 'You want gentle, drug-free routines'],
    notFits: ['You think you may have sleep apnoea (see your doctor first)'],
    related: ['better-sleep-21-days', 'rest-and-restore-audio'],
    faqs: [],
  },
  {
    slug: 'stress', icon: 'users', title: 'Stress and mood',
    image: media['condition-stress'].url,
    text: 'Practical tools for calmer days, alongside care from your doctor.',
    intro: 'Stress shows up in the body: in digestion, sleep and energy. We teach tools you can use in a few minutes a day.',
    symptoms: ['Feeling wired but tired', 'Tension in the jaw, shoulders or stomach', 'Low patience at the end of the day'],
    approach: [
      { title: 'Notice', text: 'Learn your early signs of overload.' },
      { title: 'Practise', text: 'Breathwork and short practices that calm the nervous system.' },
      { title: 'Connect', text: 'A supportive community so you are not doing it alone.' },
    ],
    fits: ['You want simple daily practices', 'You would like a supportive group'],
    notFits: ['You are in crisis: please contact your doctor or local emergency number'],
    related: ['healing-circle-community', 'rest-and-restore-audio'],
    faqs: [],
  },
  {
    slug: 'mindful-eating', icon: 'book', title: 'Mindful eating',
    image: media['condition-mindful-eating'].url,
    text: 'A kinder relationship with food, without strict rules.',
    intro: 'Mindful eating helps you notice hunger, fullness and satisfaction again, without dieting.',
    symptoms: ['Eating on autopilot', 'Feeling guilty after meals', 'Cycling between strict rules and giving up'],
    approach: [
      { title: 'Slow down', text: 'Simple practices for one meal a day.' },
      { title: 'Listen in', text: 'Relearn hunger and fullness cues.' },
      { title: 'Let go of rules', text: 'Replace rules with curiosity and care.' },
    ],
    fits: ['You are tired of diets', 'You want a calmer relationship with food'],
    notFits: ['You have an active eating disorder (please speak to your doctor about specialist care)'],
    related: ['mindful-eating-basics'],
    faqs: [],
  },
]

export const getCondition = (slug) => conditions.find((c) => c.slug === slug)
