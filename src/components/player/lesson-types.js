// Lesson type labels and helpers shared by the course player layouts.

// Every lesson type the EzyCourse admin offers (LessonItemEditor), in the admin's order.
export const LESSON_TYPES = [
  'video', 'text', 'slide', 'pdf', 'audio', 'quiz', 'survey', 'assignment', 'download', 'live',
  'embedded', 'scorm', 'multiple', 'ai', 'ebook',
  'interactive', // theme addition: a video that pauses for questions (src/components/media/InteractiveVideo.jsx)
]

export const TYPE_LABEL = {
  video: 'Video', text: 'Reading', slide: 'Slides', pdf: 'PDF', audio: 'Audio', quiz: 'Quiz', survey: 'Survey',
  assignment: 'Assignment', download: 'Download', live: 'Live session', embedded: 'Interactive tool',
  scorm: 'Training module', multiple: 'Multi-part lesson', ai: 'AI practice', ebook: 'Ebook',
  interactive: 'Interactive video',
}

// Icon names from the design-system set (iconNames in src/design-system/core.jsx).
export const TYPE_ICON = {
  video: 'video', text: 'file', slide: 'card', pdf: 'file', audio: 'headphones', quiz: 'check-circle',
  survey: 'heart', assignment: 'file', download: 'download', live: 'users', embedded: 'globe', scorm: 'play',
  multiple: 'menu', ai: 'sparkle', ebook: 'book', interactive: 'play',
}

// Media lessons: the player shows them on a stage (the focus layout breaks the figure out to full width).
// Their playback keeps the lesson's active time counting (markMediaPlaying / the <video> listener).
export const MEDIA = ['video', 'audio', 'live', 'interactive']

// Lessons that mark themselves complete (a passed quiz, a sent survey, a finished SCORM package, a
// submitted assignment), so layouts don't show "Mark as complete" for them.
export const SELF_COMPLETING = ['quiz', 'survey', 'assignment', 'scorm']

// Lessons whose content counts questions rather than minutes in the lesson meta line.
export const COUNTS_QUESTIONS = ['quiz', 'survey']

export const lessonHref = (slug, id) => `/course/${slug}/learn/${id}`

// The type a lesson shows as (icon and label). Usually its own; an embed-code video walkthrough sets
// shownAs: 'video' so learners see a video lesson, while it still renders as an embedded lesson.
export const shownType = (lesson) => lesson.shownAs || lesson.type
