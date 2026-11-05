// Design style choice for the client review (see /palettes): the shape and type of the theme,
// separate from its colours. 'soft' (the current design) is the default and sets no attribute.
//   ?style=<id>   applies a style; with ?preview=1 or inside a frame it isn't saved.
// Saved in localStorage 'halvera-style'. Applied as data-style on <html> (src/styles/design-styles.css).
import '@/styles/design-styles.css'

const KEY = 'halvera-style'
export const DEFAULT_STYLE = 'soft'

export const designStyles = [
  { id: 'soft', name: 'Soft', idea: 'The current design: rounded cards, pill buttons and serif headings. Gentle and warm.' },
  { id: 'crisp', name: 'Clean', idea: 'Modern and tidy: bold sans-serif headings, smaller corners and rounded-rectangle buttons.' },
  { id: 'editorial', name: 'Editorial', idea: 'Like a magazine: serif headings, square corners, thin borders and no shadows. Calm and confident.' },
]

const ids = designStyles.map((s) => s.id)
const valid = (id) => ids.includes(id)

let params = new URLSearchParams()
let inFrame = false
if (typeof window !== 'undefined') {
  params = new URLSearchParams(window.location.search)
  try { inFrame = window.self !== window.top } catch { inFrame = true }
}
const isPreview = inFrame || params.has('preview')

const readStored = () => {
  try { const v = localStorage.getItem(KEY); return valid(v) ? v : DEFAULT_STYLE } catch { return DEFAULT_STYLE }
}
function apply(id) {
  if (typeof document === 'undefined') return
  if (id === DEFAULT_STYLE) document.documentElement.removeAttribute('data-style')
  else document.documentElement.setAttribute('data-style', id)
}

export const getSavedStyle = () => readStored()

export function setStyle(id) {
  const next = valid(id) ? id : DEFAULT_STYLE
  try { if (next === DEFAULT_STYLE) localStorage.removeItem(KEY); else localStorage.setItem(KEY, next) } catch { /* storage blocked */ }
  apply(next)
}

if (typeof window !== 'undefined') {
  const asked = params.get('style')
  if (valid(asked)) { if (isPreview) apply(asked); else setStyle(asked) } else apply(readStored())
  if (!isPreview) window.addEventListener('storage', (e) => { if (e.key === KEY || e.key === null) apply(readStored()) })
}
