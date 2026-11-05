// How the closing call-to-action box and the footer look in dark mode, for the client to choose (see
// /palettes). In light mode they stay as they are (the dark "inverse" surface). In dark mode that
// surface flips to near-white, which glares at the bottom of a dark page, so each option repaints
// both from the dark palette instead. Any option works with any palette.
//   ?darkfoot=<id>   applies an option; with ?preview=1 or inside a frame it isn't saved.
// Saved in localStorage 'halvera-darkfoot'. Applied as data-darkfoot on <html> (src/styles/dark-footer.css).
import '@/styles/dark-footer.css'

const KEY = 'halvera-darkfoot'
export const DEFAULT_DARKFOOT = 'deep'

export const darkFooters = [
  { id: 'deep', name: 'Deep', idea: 'The footer drops to the darkest shade of the page; the box is a raised panel with a gold button.' },
  { id: 'gold', name: 'Gold box', idea: 'The box is filled with the gold, with dark text and a dark button. The footer is the darkest shade.' },
  { id: 'tint', name: 'Tinted', idea: 'The box takes the blue tint; the footer is a slightly lighter panel than the page, with a gold button.' },
  { id: 'glow', name: 'Glow', idea: 'The box is outlined with a soft gold glow in one corner; the footer is the page colour under a thin line.' },
]

const ids = darkFooters.map((d) => d.id)
const valid = (id) => ids.includes(id)

let params = new URLSearchParams()
let inFrame = false
if (typeof window !== 'undefined') {
  params = new URLSearchParams(window.location.search)
  try { inFrame = window.self !== window.top } catch { inFrame = true }
}
const isPreview = inFrame || params.has('preview')

const readStored = () => {
  try { const v = localStorage.getItem(KEY); return valid(v) ? v : DEFAULT_DARKFOOT } catch { return DEFAULT_DARKFOOT }
}
const apply = (id) => { if (typeof document !== 'undefined') document.documentElement.setAttribute('data-darkfoot', id) }

export const getSavedDarkFooter = () => readStored()

export function setDarkFooter(id) {
  const next = valid(id) ? id : DEFAULT_DARKFOOT
  try { if (next === DEFAULT_DARKFOOT) localStorage.removeItem(KEY); else localStorage.setItem(KEY, next) } catch { /* storage blocked */ }
  apply(next)
}

if (typeof window !== 'undefined') {
  const asked = params.get('darkfoot')
  if (valid(asked)) { if (isPreview) apply(asked); else setDarkFooter(asked) } else apply(readStored())
  if (!isPreview) window.addEventListener('storage', (e) => { if (e.key === KEY || e.key === null) apply(readStored()) })
}
