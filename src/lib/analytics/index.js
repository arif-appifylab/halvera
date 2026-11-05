// Lesson analytics: the one interface every lesson type reports through. First-party and
// provider-agnostic: one event schema for every lesson type (docs/lesson-analytics.md).
//
// Stable interface (other modules code against these; keep the signatures):
//
//   track(type, data)        record one event, e.g. track('video_progress', { lessonId, position: 42, duration: 545 })
//                            Common fields (courseSlug, lessonId, lessonType, sessionId, at) are added
//                            from the current lesson context. Returns the event, or null when it was
//                            dropped (no consent, duplicate). Never throws, never blocks the UI.
//                            Optional `dedupeKey` in data: the event is recorded once per lesson visit.
//   setLessonContext(ctx)    { courseSlug, lessonId, lessonType } — set by the course player on lesson change.
//                            A new lesson id starts a new visit (new sessionId). Pass null to clear.
//   subscribe(fn)            listen to every event (used by the preview panel); returns an unsubscribe function
//
// Also exported: flush, configure, getConfig, getEvents, clearEvents, getContext, setConsent, getConsent,
// markMediaPlaying, isMediaPlaying, summarise (./summarise.js), useLessonAnalytics (./useLessonAnalytics.js),
// renderer helpers (./dom.js) and createWatchTracker (./watch.js).
//
// Event names (snake_case). Each lesson type uses the ones that fit:
//   lesson_view, lesson_active_time, lesson_complete, lesson_uncomplete
//   video_play, video_pause, video_seek, video_progress, video_ended, video_rate
//   audio_play, audio_pause, audio_progress, audio_ended
//   doc_page_view, doc_zoom, doc_download                     (pdf, slides, ebook)
//   read_progress                                             (text: scroll depth 25/50/75/100)
//   quiz_start, quiz_answer, quiz_submit, quiz_result
//   survey_submit, assignment_draft_saved, assignment_submit
//   scorm_launch, scorm_status, scorm_score, scorm_exit
//   embed_open, embed_active_time, ai_message, file_download, reflection_save

export {
  track, setLessonContext, subscribe,
  flush, configure, getConfig, getEvents, clearEvents, getContext, getConsent, setConsent,
  markMediaPlaying, isMediaPlaying,
} from './core.js'
export { summarise, summariseLesson, meetsCompletion, COMPLETION_DEFAULTS } from './summarise.js'
export { createWatchTracker, parseDuration } from './watch.js'
export { useLessonAnalytics, getLiveActiveSeconds } from './useLessonAnalytics.js'
export { useReadProgress, useAudioAnalytics, useFocusTime } from './dom.js'
