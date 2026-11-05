// Colour palette choice for the client review (see /palettes and src/styles/palettes.css).
// Midnight & gold is the school's palette (the client's choice) and the default. Sage is the base
// in tokens.css, so it alone has no data-palette attribute; every other palette, the default
// included, is set as data-palette from palettes.css.
//
// URL parameters, read once on load:
//   ?palette=<id>      applies a palette and remembers it in localStorage 'halvera-palette'.
//   ?palette=midnight  clears the saved choice (back to the default).
//   ?preview=1       (the /palettes iframes and "Open full page") applies without saving,
//                    and ignores choices made in other tabs. Pages inside an iframe never save.
//   ?theme=light|dark  forces the theme for this page only, never saved (preview only).
import '@/styles/palettes.css'

const KEY = 'halvera-palette'
export const DEFAULT_PALETTE = 'midnight'
const BASE_PALETTE = 'sage' // the colours in tokens.css

// Swatch values mirror tokens.json (sage) and palettes.css (the others). Data, not styling.
export const palettes = [
  {
    id: 'sage',
    name: 'Sage',
    idea: 'The original palette: sage green for action on warm oat, with clay for warmth.',
    swatches: {
      light: { surface: '#faf6ef', primary: '#2f5d4a', accent: '#a4532f', 'surface-sunken': '#f1eadf', 'surface-sage': '#e3ebe3', 'surface-clay': '#f6e4d8', ink: '#1f2a24' },
      dark: { surface: '#131a16', primary: '#8fc4a7', accent: '#e7a17f', 'surface-sunken': '#0e1310', 'surface-sage': '#1d2c24', 'surface-clay': '#2e1f18', ink: '#eef0ea' },
    },
  },
  {
    id: 'clay',
    name: 'Clay & linen',
    idea: 'Terracotta for action on warm linen, with olive as the quiet second colour. Earthy and grounded.',
    swatches: {
      light: { surface: '#f8f3ec', primary: '#9c4529', accent: '#566228', 'surface-sunken': '#efe6da', 'surface-sage': '#f4e2d7', 'surface-clay': '#e7e8d4', ink: '#2b211c' },
      dark: { surface: '#1a1512', primary: '#e99c7a', accent: '#bac47c', 'surface-sunken': '#120e0c', 'surface-sage': '#33221a', 'surface-clay': '#252716', ink: '#f3ece4' },
    },
  },
  {
    id: 'plum',
    name: 'Plum & blush',
    idea: 'Muted plum for action on a soft blush ground, with sage as the gentle second colour. Tender and restful.',
    swatches: {
      light: { surface: '#faf4f2', primary: '#6b3a5e', accent: '#4b6750', 'surface-sunken': '#f2e8e5', 'surface-sage': '#f0e3ea', 'surface-clay': '#e3eae0', ink: '#2a1f28' },
      dark: { surface: '#18131a', primary: '#d8a8ca', accent: '#9ec3a1', 'surface-sunken': '#110d12', 'surface-sage': '#2d1f2b', 'surface-clay': '#1d271f', ink: '#f2ecf0' },
    },
  },
  {
    id: 'tide',
    name: 'Tide & sand',
    idea: 'Deep sea-teal for action on warm sand, with ochre for warmth. Clear, steady and open.',
    swatches: {
      light: { surface: '#f7f3ec', primary: '#1d5866', accent: '#875a13', 'surface-sunken': '#ede6da', 'surface-sage': '#dfeaec', 'surface-clay': '#f3e7cf', ink: '#172a30' },
      dark: { surface: '#10191c', primary: '#84c4d2', accent: '#e0b465', 'surface-sunken': '#0b1214', 'surface-sage': '#172d33', 'surface-clay': '#2b2414', ink: '#ecf1f0' },
    },
  },
  {
    id: 'evergreen',
    name: 'Evergreen',
    idea: 'A deeper forest green on soft cream, with terracotta warmth. In dark mode: charcoal, not green, with a clear bright green for action.',
    swatches: {
      light: { surface: '#f7f6f2', primary: '#1f5c45', accent: '#a84a22', 'surface-sunken': '#eeece6', 'surface-sage': '#e3ece5', 'surface-clay': '#f4e5da', ink: '#17201b' },
      dark: { surface: '#121413', primary: '#5cc08f', accent: '#f0a37a', 'surface-sunken': '#0c0e0d', 'surface-sage': '#182620', 'surface-clay': '#2a1f1a', ink: '#eef0ed' },
    },
  },
  {
    id: 'midnight',
    name: 'Midnight & gold',
    idea: 'Navy on white by day; at night, deep navy with warm gold for action. Calm, premium and easy on the eyes after dark.',
    swatches: {
      light: { surface: '#ffffff', primary: '#1f3a6b', accent: '#8a5e10', 'surface-sunken': '#f5f6f8', 'surface-sage': '#f3f5f9', 'surface-clay': '#fbf5ea', ink: '#151c2e' }, // Pure white (light-versions.css)
      dark: { surface: '#0e1320', primary: '#e7b95c', accent: '#8fb4ff', 'surface-sunken': '#0a0e18', 'surface-sage': '#18213a', 'surface-clay': '#2a2414', ink: '#eef1f7' },
    },
  },
  {
    id: 'stone',
    name: 'Stone & moss',
    idea: 'Quiet neutrals with a moss green and a soft rust. Almost colourless, so photos and content lead. Dark mode is true neutral grey.',
    swatches: {
      light: { surface: '#f6f5f3', primary: '#3d5c38', accent: '#8a4f3a', 'surface-sunken': '#ecebe8', 'surface-sage': '#e7ebe3', 'surface-clay': '#f0e7e0', ink: '#1c1c1a' },
      dark: { surface: '#141414', primary: '#a8cf98', accent: '#e3a78f', 'surface-sunken': '#0e0e0e', 'surface-sage': '#1c231b', 'surface-clay': '#271f1b', ink: '#efefec' },
    },
  },
  {
    id: 'ocean',
    name: 'Ocean & coral',
    idea: 'Fresh teal with a coral accent on a cool, airy ground. In dark mode: deep blue-green with bright teal, lively but soft.',
    swatches: {
      light: { surface: '#f5f8f8', primary: '#0e6371', accent: '#b0402b', 'surface-sunken': '#e9f0f0', 'surface-sage': '#dcecee', 'surface-clay': '#fbe7e1', ink: '#102a30' },
      dark: { surface: '#0d1719', primary: '#5fd0e0', accent: '#ff9b82', 'surface-sunken': '#091113', 'surface-sage': '#12292d', 'surface-clay': '#2c1a16', ink: '#e9f2f3' },
    },
  },
]

/** What each swatch is for, in the order the comparison page shows them. */
export const SWATCH_ROLES = [
  { token: 'surface', label: 'Page ground' },
  { token: 'primary', label: 'Action' },
  { token: 'accent', label: 'Accent' },
  { token: 'surface-sunken', label: 'Neutral band' },
  { token: 'surface-sage', label: 'Tinted band' },
  { token: 'surface-clay', label: 'Warm band' },
  { token: 'ink', label: 'Text' },
]

const ids = palettes.map((p) => p.id)
const valid = (id) => ids.includes(id)

let params = new URLSearchParams()
let inFrame = false
if (typeof window !== 'undefined') {
  params = new URLSearchParams(window.location.search)
  try { inFrame = window.self !== window.top } catch { inFrame = true }
}
const isPreview = inFrame || params.has('preview')

const readStored = () => {
  try {
    const v = localStorage.getItem(KEY)
    return valid(v) ? v : DEFAULT_PALETTE
  } catch {
    return DEFAULT_PALETTE
  }
}

function apply(id) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (id === BASE_PALETTE) root.removeAttribute('data-palette')
  else root.setAttribute('data-palette', id)
}

let current = DEFAULT_PALETTE

/** The palette on screen (an id from `palettes`). */
export function getPalette() {
  return current
}

/** The palette saved for the whole site (what visitors get outside previews). */
export function getSavedPalette() {
  return readStored()
}

/** Save a palette for the whole site and apply it. The default clears the saved choice. */
export function setPalette(id) {
  const next = valid(id) ? id : DEFAULT_PALETTE
  try {
    if (next === DEFAULT_PALETTE) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, next)
  } catch { /* storage blocked: applies to this page only */ }
  current = next
  apply(next)
}

/** The URL that previews a palette on any page without saving it. */
export function previewHref(id, theme, path = '/', style) {
  const q = new URLSearchParams({ palette: id, preview: '1' })
  if (theme === 'light' || theme === 'dark') q.set('theme', theme)
  if (style) q.set('style', style)
  return `${path}?${q.toString()}`
}

if (typeof window !== 'undefined') {
  const asked = params.get('palette')
  if (valid(asked)) {
    current = asked
    if (isPreview) apply(asked)
    else setPalette(asked)
  } else {
    current = readStored()
    apply(current)
  }

  // Keep other tabs in step with a choice made on /palettes (not previews: they show one palette).
  if (!isPreview) {
    window.addEventListener('storage', (e) => {
      if (e.key === KEY || e.key === null) {
        current = readStored()
        apply(current)
      }
    })
  }

  // Preview only: force the theme without saving it. The theme module re-applies the saved
  // theme when it loads, so hold the forced value while this page is open.
  const theme = params.get('theme')
  if (theme === 'light' || theme === 'dark') {
    const root = document.documentElement
    const hold = () => {
      if (root.getAttribute('data-theme') !== theme) root.setAttribute('data-theme', theme)
      if (root.style.colorScheme !== theme) root.style.colorScheme = theme
    }
    hold()
    new MutationObserver(hold).observe(root, { attributes: true, attributeFilter: ['data-theme', 'style'] })
  }
}
