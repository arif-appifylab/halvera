// Light / dark theme.
// The visitor's choice is 'light', 'dark' or 'system' (follow the device). It is kept in
// localStorage under 'halvera-theme'; 'system' is stored by removing the key. index.html runs the
// same logic inline before first paint so there is no flash; this module keeps it in step after.
import { useSyncExternalStore } from 'react'
import './theme.css'

const KEY = 'halvera-theme'
export const THEME_PREFERENCES = ['light', 'dark', 'system']

const media = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null

const listeners = new Set()
// Used only when storage is blocked (some private modes): the choice lasts for this page.
let memoryPref = null

const readStored = () => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return memoryPref || 'system'
  }
}

const systemTheme = () => (media && media.matches ? 'dark' : 'light')
const resolve = (pref) => (pref === 'system' ? systemTheme() : pref)

let state = { preference: readStored(), theme: resolve(readStored()) }

function apply() {
  const preference = readStored()
  const theme = resolve(preference)
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    if (root.getAttribute('data-theme') !== theme) root.setAttribute('data-theme', theme)
    // tokens.css sets color-scheme per theme too; this covers the moment before CSS loads.
    root.style.colorScheme = theme
  }
  if (state.preference !== preference || state.theme !== theme) {
    state = { preference, theme }
    listeners.forEach((fn) => fn())
  }
}

/** The saved choice: 'light' | 'dark' | 'system'. */
export function getThemePreference() {
  return readStored()
}

/** The theme on screen right now: 'light' | 'dark'. */
export function getResolvedTheme() {
  return resolve(readStored())
}

/** Save a choice and apply it. 'system' follows the device from now on. */
export function setThemePreference(pref) {
  const next = THEME_PREFERENCES.includes(pref) ? pref : 'system'
  try {
    if (next === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, next)
  } catch {
    memoryPref = next
  }
  apply()
}

// Follow the device while on 'system', and keep other tabs in step.
if (media) {
  const onSystemChange = () => { if (readStored() === 'system') apply() }
  if (media.addEventListener) media.addEventListener('change', onSystemChange)
  else if (media.addListener) media.addListener(onSystemChange)
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === KEY || e.key === null) apply() })
  apply()
}

const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const getSnapshot = () => state

/** { preference, theme, setPreference } and re-renders when either changes. */
export function useTheme() {
  const { preference, theme } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { preference, theme, setPreference: setThemePreference }
}
