// Video sources for lessons, keyed by product slug, then lesson id (multi-part lessons: `${lessonId}#${partIndex}`).
// The course player's MediaBlock reads these through `videoSourceFor()` and hands them to
// src/components/media/VideoPlayer.jsx. How it works and why: docs/video-player.md.
//
// A source is one of:
//   { provider: 'bunny', libraryId, videoId, drm, token?, expires? }   a school's video on Bunny Stream
//   { provider: 'file', src, poster, captions?, audioTracks? }          a plain MP4 (used for this preview)
//
// audioTracks [{ id?, label, lang, kind?, src? }]: dubs or audio description. On Bunny Stream they
// come inside the HLS stream and Bunny's player lists them; for a file source VideoPlayer shows an
// "Audio" menu. A track with its own `src` swaps the file; without one (the preview) the clip stays
// and only the label and caption language change. kind: 'description' for audio description.

// Preview clip: hotlinked, not stored in the repo. Mixkit Stock Video Free License.
// "Pouring tea into a cup on a rustic table setting" by Mixkit, 0:29, 1280 × 720.
// https://mixkit.co/free-stock-video/pouring-tea-into-a-cup-on-a-rustic-table-setting-100252/
const MIXKIT = 'https://assets.mixkit.co/active_storage/video_items/100252/1722543012'

export const previewVideo = {
  provider: 'file',
  src: `${MIXKIT}/100252-video-720.mp4`,
  poster: `${MIXKIT}/100252-video-thumb-720-0.jpg`,
  // captions: [{ src: '/captions/welcome.en.vtt', srclang: 'en', label: 'English', default: true }],
}

// The preview's simulated audio tracks: the stand-in clip has one soundtrack, so these change the
// label, the caption language and the analytics, not the sound.
export const previewAudioTracks = [
  { id: 'en', label: 'English', lang: 'en' },
  { id: 'bn', label: 'বাংলা', lang: 'bn' },
  { id: 'en-description', label: 'Audio description', lang: 'en', kind: 'description' },
]

// "Welcome and how to use this programme" and "Meal timing that suits your day" with their audio
// tracks (and, for meal timing, English and Bangla captions written for the preview clip).
const welcomeVideo = { ...previewVideo, audioTracks: previewAudioTracks }
const timingVideo = {
  ...previewVideo,
  audioTracks: previewAudioTracks,
  captions: [
    { src: '/files/meal-timing.en.vtt', srclang: 'en', label: 'English' },
    { src: '/files/meal-timing.bn.vtt', srclang: 'bn', label: 'বাংলা' },
  ],
}

export const previewVideoCredit = {
  title: 'Pouring tea into a cup on a rustic table setting',
  author: 'Mixkit',
  url: 'https://mixkit.co/free-stock-video/pouring-tea-into-a-cup-on-a-rustic-table-setting-100252/',
  licence: 'Mixkit Stock Video Free License',
}

// Example of a real school's lesson on Bunny Stream (fake ids; not wired to a lesson, it would not play).
// How an EzyCourse lesson maps to it:
//   - libraryId: the school's Bunny Stream video library (one per school, set up by EzyCourse).
//   - videoId:   the video's GUID in that library, saved on the lesson when the video is uploaded
//                through the admin's Media library or the lesson editor.
//   - drm:       Settings → Media → DRM. "All videos" turns it on for every lesson; "Selected videos"
//                turns it on for the videos picked there. On means MediaCage DRM is applied by Bunny.
//   - token / expires: signed by the backend on every lesson load when the library has embed token
//                authentication on (SHA256_HEX(token_security_key + videoId + expires), expires in Unix
//                seconds, a few minutes ahead). Never signed in the browser.
// The backend would return, for example, lessonContent['gut-health-reset'].welcome.video =
export const exampleBunnySource = {
  provider: 'bunny',
  libraryId: '123456',
  videoId: '6f1c2a8e-4b7d-4e0a-9c3f-2d5b8a7e1f40',
  drm: true,
  token: '0f3c…signed-by-backend',
  expires: 1760000000,
}

export const videoSources = {
  'gut-health-reset': {
    welcome: welcomeVideo,
    pace: previewVideo,
    timing: timingVideo,
    fibre: previewVideo,
    stress: previewVideo,
    dropin: previewVideo, // live session replay
    live: previewVideo, // live session replay
    'fibre-steps#0': previewVideo, // multi-part lesson, part 1 "Watch: why slow and steady works"
  },
}

// The lesson's source, or the preview clip when the lesson has none yet.
export function videoSourceFor(slug, lessonId, part) {
  const key = part === undefined ? lessonId : `${lessonId}#${part}`
  return videoSources[slug]?.[key] || previewVideo
}
