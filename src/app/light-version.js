// Whiter light modes for Midnight & gold (see /palettes). The client chose '1' (Pure white), the default.
// '2'–'4' are the other whiter versions (src/styles/light-versions.css); '0' is the original oat ground,
// which has no attribute (palettes.css). Light mode only.
//   ?light=<id>   applies a version; with ?preview=1 or inside a frame it isn't saved.
// Saved in localStorage 'halvera-light' (nothing saved = the default). Applied as data-light on <html>.
import '@/styles/light-versions.css'

const KEY = 'halvera-light'
export const DEFAULT_LIGHT = '1'
export const ORIGINAL_LIGHT = '0'

// swatches: page ground, panels, tint (the dashboard band and tinted panels).
export const lightVersions = [
  { id: '1', name: 'Pure white', idea: 'A white page with the faintest cool grey for panels. Navy and gold do all the colour work.', swatches: ['#ffffff', '#f5f6f8', '#f3f5f9'] },
  { id: '2', name: 'Porcelain', idea: 'A cool off-white with a whisper of blue in the tints. Clean, a little softer than pure white.', swatches: ['#f9fafc', '#f0f2f6', '#ebeff6'] },
  { id: '3', name: 'Ivory', idea: 'A warm white, and the tint turns cream instead of blue, so navy and gold sit on a warm ground.', swatches: ['#fdfcf8', '#f5f2ea', '#f5efe1'] },
  { id: '4', name: 'Mist', idea: 'A neutral grey-white with no colour cast. Quiet and modern; photos and the gold stand out.', swatches: ['#fafafa', '#f2f2f4', '#eef0f3'] },
]
export const ORIGINAL_SWATCHES = ['#f8f6f1', '#efece4', '#e5e9f2']

const valid = (id) => id === ORIGINAL_LIGHT || lightVersions.some((v) => v.id === id)

let params = new URLSearchParams()
let inFrame = false
if (typeof window !== 'undefined') {
  params = new URLSearchParams(window.location.search)
  try { inFrame = window.self !== window.top } catch { inFrame = true }
}
const isPreview = inFrame || params.has('preview')

const readStored = () => {
  try { const v = localStorage.getItem(KEY); return valid(v) ? v : DEFAULT_LIGHT } catch { return DEFAULT_LIGHT }
}
function apply(id) {
  if (typeof document === 'undefined') return
  if (id && id !== ORIGINAL_LIGHT) document.documentElement.setAttribute('data-light', id)
  else document.documentElement.removeAttribute('data-light')
}

export const getSavedLight = () => readStored()

export function setLight(id) {
  const next = valid(id) ? id : DEFAULT_LIGHT
  try { if (next === DEFAULT_LIGHT) localStorage.removeItem(KEY); else localStorage.setItem(KEY, next) } catch { /* storage blocked */ }
  apply(next)
}

if (typeof window !== 'undefined') {
  const asked = params.get('light')
  if (valid(asked)) { if (isPreview) apply(asked); else setLight(asked) } else apply(readStored())
  if (!isPreview) window.addEventListener('storage', (e) => { if (e.key === KEY || e.key === null) apply(readStored()) })
}
