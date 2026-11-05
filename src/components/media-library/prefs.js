// Per-viewer conveniences (autoplay next, playback speed) kept in this browser only.
// Storage can be missing or blocked (private windows, previews), so every call is guarded.
export function getPref(key) {
  try { return globalThis.localStorage?.getItem(key) ?? null } catch { return null }
}
export function setPref(key, value) {
  try { globalThis.localStorage?.setItem(key, value) } catch { /* storage blocked: keep it for this visit only */ }
}
