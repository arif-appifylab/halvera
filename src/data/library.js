// The asset library (Sell → Library): categories → folders → files. Each level has its own access:
//   free     everyone, signed in or not
//   members  included in the membership plans listed in `plans`
//   paid     bought: the item itself, or anything above it (a category opens its folders and files,
//            a folder opens its files)
// Access is inherited downwards: a folder or file without its own `access` takes its parent's.
// A folder or file inside a paid category can also be sold on its own with a one-time price.
// Price rules from the admin: files one-time only · folders one-time · categories one-time,
// subscription or installments. Prices use the product price shape (src/data/products.js).
// Helpers (access, unlock options, counts) live in src/lib/library.js; pages never read this directly.
import { media } from './media-credits.js'
import { previewVideo } from './media.js'

const once = (amount, label = 'One payment') => ({ id: 'once', kind: 'one-time', label, amount, price: { amount: `$${amount}` } })

export const library = {
  slug: 'halvera-library',
  title: 'Library',
  description: 'Recipes, guided audio, trackers and practitioner videos. Some files are free, some come with a membership and some you can buy on their own.',
}

export const categories = [
  {
    id: 'recipes', title: 'Recipes and meal plans', access: 'paid', image: media['product-halvera-library'].thumb,
    description: 'Gut-friendly recipe cards, four weeks of meal plans and shopping lists from our clients’ favourites.',
    prices: [
      once(29),
      { id: 'monthly', kind: 'subscription', label: 'Monthly', amount: 9, interval: 'month', price: { amount: '$9', interval: 'month', note: 'New recipes every month. Cancel any time' } },
      { id: 'plan', kind: 'installments', label: '3 monthly payments', amount: 11, count: 3, price: { amount: '$11', installments: 3, total: '$33' } },
    ],
  },
  {
    id: 'breathwork', title: 'Breathwork and sleep audio', access: 'members', plans: ['essentials', 'supported', 'founding'],
    image: media['product-rest-and-restore-audio'].thumb,
    description: 'Short breathing breaks for the day and longer sessions and stories for slower evenings.',
    prices: [],
  },
  {
    id: 'guides', title: 'Guides and trackers', access: 'free', image: media['product-sunday-letter'].thumb,
    description: 'Printable trackers and short guides to help you notice patterns. Free for everyone.',
    prices: [],
  },
  {
    id: 'videos', title: 'Practitioner videos', access: 'paid', image: media['product-spring-gut-workshop'].thumb,
    description: 'Cooking demonstrations and replays of our monthly live Q&A with Chidi and Owen.',
    prices: [
      once(39),
      { id: 'plan', kind: 'installments', label: '2 monthly payments', amount: 21, count: 2, price: { amount: '$21', installments: 2, total: '$42' } },
    ],
  },
]

export const folders = [
  { id: 'soups-and-stews', category: 'recipes', title: 'Soups and stews', description: 'Warming, gentle recipes that are easy on digestion.', prices: [once(12)] },
  { id: 'weekly-meal-plans', category: 'recipes', title: 'Weekly meal plans', description: 'Four weeks of plans with shopping lists, one small change a week.', prices: [once(15)] },
  { id: 'breakfasts', category: 'recipes', title: 'Calm breakfasts', description: 'Slow mornings, simple bowls.', prices: [] },
  { id: 'breathing-breaks', category: 'breathwork', title: 'Breathing breaks', description: 'Five-minute practices for busy days.', prices: [] },
  { id: 'sleep-stories', category: 'breathwork', title: 'Sleep sessions and stories', description: 'Body scans and stories for winding down.', prices: [] },
  { id: 'trackers', category: 'guides', title: 'Trackers and diaries', description: 'Print them, or fill them in on screen.', prices: [] },
  { id: 'cooking-demos', category: 'videos', title: 'Cooking demonstrations', description: 'Short kitchen videos with Chidi.', prices: [once(14)] },
  { id: 'qa-replays', category: 'videos', title: 'Live Q&A replays', description: 'Our monthly live Q&A, recorded.', prices: [] },
]

const DOC = '/files/symptom-tracker.pdf'
const SLIDES = '/files/gut-basics-slides.pdf'
const video = (poster) => ({ ...previewVideo, poster: poster || previewVideo.poster })

// type: pdf | doc | slides | video | image | audio | link | web. date: ISO (sorting); shown as "9 Oct".
// price: optional one-time price for the file on its own. download: false keeps a file stream-only.
export const files = [
  // Recipes and meal plans › Soups and stews
  { id: 'miso-ginger-soup', folder: 'soups-and-stews', type: 'pdf', title: 'Miso, ginger and greens soup', size: '1.2 MB', date: '2026-10-09', src: DOC, thumb: media['post-miso-ginger-and-greens-soup'].thumb, price: once(4), description: 'A single recipe card: a bowl of greens in a light miso broth, ready in 20 minutes.' },
  { id: 'lentil-squash-stew', folder: 'soups-and-stews', type: 'pdf', title: 'Red lentil and squash stew', size: '1.4 MB', date: '2026-10-02', src: DOC, price: once(4), description: 'A single recipe card for a soft, filling stew that keeps for three days.' },
  { id: 'batch-cooking-soups', folder: 'soups-and-stews', type: 'doc', title: 'Batch cooking soups: a how-to', size: '380 KB', date: '2026-09-28', src: DOC, description: 'Cook once on Sunday, eat well all week. Freezing and reheating notes included.' },
  { id: 'miso-soup-photo', folder: 'soups-and-stews', type: 'image', title: 'Miso soup, plated', size: '2.4 MB', date: '2026-09-24', src: media['post-miso-ginger-and-greens-soup'].url, thumb: media['post-miso-ginger-and-greens-soup'].thumb, alt: media['post-miso-ginger-and-greens-soup'].alt },
  { id: 'vegetable-broth', folder: 'soups-and-stews', type: 'video', title: 'Making a simple vegetable broth', size: '48.2 MB', duration: '0:29', date: '2026-09-12', source: video(), thumb: previewVideo.poster, description: 'Chidi shows the base he uses for every soup in this folder.' },

  // Recipes and meal plans › Weekly meal plans
  { id: 'week-1-plan', folder: 'weekly-meal-plans', type: 'pdf', title: 'Week 1: settling meals', size: '2.1 MB', date: '2026-10-06', src: DOC, description: 'Seven days of simple, regular meals to give your gut a steady rhythm.' },
  { id: 'week-2-plan', folder: 'weekly-meal-plans', type: 'pdf', title: 'Week 2: adding fibre gently', size: '2.3 MB', date: '2026-10-06', src: DOC, description: 'The same rhythm, with one new source of fibre every other day.' },
  { id: 'shopping-lists', folder: 'weekly-meal-plans', type: 'doc', title: 'Shopping lists, weeks 1 to 4', size: '640 KB', date: '2026-10-01', src: DOC, description: 'One list per week, grouped by aisle.' },
  { id: 'meal-plan-slides', folder: 'weekly-meal-plans', type: 'slides', title: 'How to use the meal plans', size: '5.6 MB', date: '2026-09-30', src: SLIDES, description: 'A short deck on swapping meals, portion sizes and what to do on busy days.' },
  { id: 'eatwell-guide', folder: 'weekly-meal-plans', type: 'link', title: 'The Eatwell Guide (NHS)', date: '2026-09-18', href: 'https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/the-eatwell-guide/', description: 'The NHS overview of a balanced plate. Our plans follow the same proportions.' },

  // Recipes and meal plans › Calm breakfasts
  { id: 'oat-bowl-photo', folder: 'breakfasts', type: 'image', title: 'Warm oat and stewed apple bowl', size: '1.8 MB', date: '2026-10-11', src: media['post-warm-oat-and-stewed-apple-bowl'].url, thumb: media['post-warm-oat-and-stewed-apple-bowl'].thumb, alt: media['post-warm-oat-and-stewed-apple-bowl'].alt },
  { id: 'ten-breakfasts', folder: 'breakfasts', type: 'pdf', title: 'Ten calm breakfasts', size: '6.4 MB', date: '2026-10-08', src: DOC, price: once(4), description: 'Ten breakfasts that are gentle on the stomach, most ready in ten minutes.' },
  { id: 'overnight-oats', folder: 'breakfasts', type: 'video', title: 'Overnight oats in five minutes', size: '22.6 MB', duration: '0:29', date: '2026-09-20', source: video(), thumb: previewVideo.poster, description: 'Make tomorrow’s breakfast tonight.' },

  // Breathwork and sleep audio › Breathing breaks
  { id: 'box-breathing', folder: 'breathing-breaks', type: 'audio', title: 'Box breathing for busy days', size: '4.8 MB', duration: '05:10', date: '2026-10-13', price: once(3), description: 'Four counts in, four counts hold, four counts out. Five minutes, anywhere.' },
  { id: 'calm-breath-meals', folder: 'breathing-breaks', type: 'audio', title: 'A calm breath before meals', size: '4.1 MB', duration: '04:30', date: '2026-10-03', description: 'A short practice to settle your body before you eat.' },
  { id: 'slow-breathing-slides', folder: 'breathing-breaks', type: 'slides', title: 'Why slow breathing helps', size: '3.9 MB', date: '2026-09-26', src: SLIDES, description: 'What happens in your body when you breathe out slowly.' },
  { id: 'nhs-breathing', folder: 'breathing-breaks', type: 'link', title: 'Breathing exercises for stress (NHS)', date: '2026-09-15', href: 'https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/', description: 'A simple exercise from the NHS, a good companion to the audio in this folder.' },

  // Breathwork and sleep audio › Sleep sessions and stories
  { id: 'body-scan', folder: 'sleep-stories', type: 'audio', title: 'Body scan for sleep', size: '17.2 MB', duration: '18:30', date: '2026-10-10', description: 'A slow scan from your toes to the top of your head.' },
  { id: 'lighthouse-keeper', folder: 'sleep-stories', type: 'audio', title: 'The lighthouse keeper (sleep story)', size: '29.8 MB', duration: '32:00', date: '2026-09-29', description: 'A calm story to listen to with the lights off.' },
  { id: 'wind-down-photo', folder: 'sleep-stories', type: 'image', title: 'An evening wind-down', size: '2.2 MB', date: '2026-09-22', src: media['post-a-wind-down-routine-you-will-keep'].url, thumb: media['post-a-wind-down-routine-you-will-keep'].thumb, alt: media['post-a-wind-down-routine-you-will-keep'].alt },
  { id: 'nhs-sleep', folder: 'sleep-stories', type: 'web', title: 'How to get to sleep (NHS)', date: '2026-09-10', href: 'https://www.nhs.uk/live-well/sleep-and-tiredness/how-to-get-to-sleep/', description: 'Practical NHS tips on routines, light and caffeine.' },

  // Guides and trackers › Trackers and diaries
  { id: 'symptom-tracker', folder: 'trackers', type: 'pdf', title: 'Symptom tracker', size: '210 KB', date: '2026-10-14', src: DOC, description: 'Note meals, symptoms, sleep and stress for two weeks, then look for patterns.' },
  { id: 'food-mood-diary', folder: 'trackers', type: 'doc', title: 'Food and mood diary', size: '180 KB', date: '2026-10-05', src: DOC, description: 'One page a day for what you ate and how you felt.' },
  { id: 'sleep-diary', folder: 'trackers', type: 'pdf', title: 'Sleep diary', size: '160 KB', date: '2026-09-27', src: DOC, description: 'Bedtime, wake time and how rested you feel.' },

  // Guides and trackers (no folder)
  { id: 'gut-basics', category: 'guides', type: 'slides', title: 'Your gut, in eight slides', size: '7.1 MB', date: '2026-10-09', src: SLIDES, description: 'A friendly tour of how digestion works.' },
  { id: 'nhs-fibre', category: 'guides', type: 'web', title: 'How to get more fibre into your diet (NHS)', date: '2026-10-04', href: 'https://www.nhs.uk/live-well/eat-well/digestive-health/how-to-get-more-fibre-into-your-diet/', description: 'NHS guidance on daily fibre and easy ways to add it.' },
  { id: 'nhs-ibs', category: 'guides', type: 'link', title: 'Irritable bowel syndrome (NHS)', date: '2026-09-19', href: 'https://www.nhs.uk/conditions/irritable-bowel-syndrome-ibs/', description: 'Symptoms, causes and when to see a GP. Always check new symptoms with your doctor.' },
  { id: 'kitchen-photo', category: 'guides', type: 'image', title: 'A calm kitchen counter', size: '3.1 MB', date: '2026-09-08', src: media['product-gut-health-reset'].url, thumb: media['product-gut-health-reset'].thumb, alt: media['product-gut-health-reset'].alt },

  // Practitioner videos › Cooking demonstrations
  { id: 'prepping-vegetables', folder: 'cooking-demos', type: 'video', title: 'Prepping vegetables without the fuss', size: '64.3 MB', duration: '0:29', date: '2026-10-07', source: video(media['product-spring-gut-workshop'].thumb), thumb: media['product-spring-gut-workshop'].thumb, price: once(6), description: 'Knife skills, storage and a ten-minute weekly prep.' },
  { id: 'first-pickle-jar', folder: 'cooking-demos', type: 'video', title: 'Your first jar of pickled vegetables', size: '81.0 MB', duration: '0:29', date: '2026-09-21', source: video(media['condition-gut-health'].thumb), thumb: media['condition-gut-health'].thumb, description: 'A gentle start with fermented foods, one spoonful at a time.' },
  { id: 'demo-recipes', folder: 'cooking-demos', type: 'pdf', title: 'Recipes from the demonstrations', size: '2.8 MB', date: '2026-09-21', src: DOC, description: 'Every recipe cooked in this folder, on one printable sheet.' },

  // Practitioner videos › Live Q&A replays
  { id: 'qa-october', folder: 'qa-replays', type: 'video', title: 'Live Q&A replay: October', size: '412 MB', duration: '0:29', date: '2026-10-12', source: video(), thumb: previewVideo.poster, download: false, description: 'Questions on bloating, travel and eating out.' },
  { id: 'qa-september', folder: 'qa-replays', type: 'video', title: 'Live Q&A replay: September', size: '398 MB', duration: '0:29', date: '2026-09-14', source: video(), thumb: previewVideo.poster, download: false, description: 'Questions on sleep, stress and the gut–brain connection.' },
  { id: 'qa-notes', folder: 'qa-replays', type: 'doc', title: 'Q&A notes and links', size: '220 KB', date: '2026-10-12', src: DOC, description: 'A written summary of each session with the links we mentioned.' },
]
