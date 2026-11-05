// Lesson tools open in a side panel beside the lesson on wide screens (≥ 1280px), and in a side
// drawer from buttons above the lesson below that (the client chose the side panel).
// ?tool=<id> opens one tool on load (used by links and previews).

export const TOOL_IDS = ['resources', 'discussion', 'notes', 'transcript']

export function readInitialTool() {
  const params = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search)
  return TOOL_IDS.includes(params.get('tool')) ? params.get('tool') : null
}

// Whether the student last closed the side panel: a per-viewer convenience in localStorage.
const PANEL_KEY = 'halvera-lesson-tools-panel'

export function readCollapsed() {
  try {
    return localStorage.getItem(PANEL_KEY) === 'collapsed'
  } catch {
    return false
  }
}

export function saveCollapsed(on) {
  try { localStorage.setItem(PANEL_KEY, on ? 'collapsed' : 'open') } catch { /* storage blocked: this page only */ }
}
