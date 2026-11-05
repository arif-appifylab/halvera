import { useEffect, useState } from 'react'
import { resourcesFor, transcriptFor } from '@/data/lesson-tools.js'
import { useStageMedia } from './media.js'
import { useDiscussion, useNotes } from './state.js'
import Resources from './Resources.jsx'
import Discussion from './Discussion.jsx'
import Notes from './Notes.jsx'
import Transcript from './Transcript.jsx'
import './lesson-tools.css'

// Lessons with a player the tools can follow (an upcoming cohort live session has none yet).
export const isMediaLesson = (product, lesson) =>
  ['video', 'audio', 'interactive'].includes(lesson.type) || (lesson.type === 'live' && product.type !== 'cohort')

// Everything the three tool layouts share: which tools this lesson has (with the discussion count)
// and `render(id)` for a tool's content. The layouts in ./LessonTools.jsx only arrange them.
// `lesson` may be null (a lesson id that isn't in the course); the hook then returns no tools.
export function useLessonTools({ product, lesson, lessons, hrefFor, stageRef, canOpen, viewer }) {
  const lessonId = lesson?.id
  const media = useStageMedia(stageRef, lessonId)
  const discussion = useDiscussion(product.slug, lessonId, viewer)
  const notes = useNotes(product.slug)
  const isMedia = !!lesson && isMediaLesson(product, lesson)
  const resources = lesson ? resourcesFor(product.slug, lessonId) : []

  const tools = !lesson ? [] : [
    { id: 'resources', label: 'Resources', icon: 'resources' },
    { id: 'discussion', label: 'Discussion', icon: 'discussion', count: discussion.count },
    { id: 'notes', label: 'Notes', icon: 'notes' },
    ...(isMedia ? [{ id: 'transcript', label: 'Transcript', icon: 'transcript' }] : []),
  ]

  const render = (id, { fill } = {}) => {
    if (!lesson) return null
    switch (id) {
      case 'resources': return <Resources items={resources} />
      case 'discussion': return <Discussion key={lesson.id} discussion={discussion} canPost={canOpen} lessonTitle={lesson.title} />
      case 'notes': return <Notes key={lesson.id} notes={notes} lesson={lesson} lessons={lessons} hrefFor={hrefFor} media={media} isMedia={isMedia} />
      case 'transcript': return <Transcript key={lesson.id} transcript={transcriptFor(product.slug, lesson.id)} media={media} fill={fill} />
      default: return null
    }
  }

  return { tools, render, lessonId }
}

// True on screens wide enough for the side panel (1280px and up).
export function useWide(query = '(min-width: 1280px)') {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches
  const [wide, setWide] = useState(get)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return undefined
    const on = () => setWide(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return wide
}
