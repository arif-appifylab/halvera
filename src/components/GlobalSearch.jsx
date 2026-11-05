// Header search: an icon button that opens a command-palette dialog. ⌘K / Ctrl+K or "/" open it from
// anywhere (except "/" while typing in a field). Results come from src/lib/site-search.js, grouped by
// kind, as an ARIA combobox (the input) controlling a listbox (the results). Arrow keys move the active
// option, Enter opens it, Escape closes. The last option is "See all results", which opens /search?q=.
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { Icon } from '@/design-system'

// The dialog and the search index load the first time someone opens search.
const Palette = lazy(() => import('./GlobalSearchPalette.jsx'))

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '')
const SHORTCUT_LABEL = isMac ? '⌘K' : 'Ctrl K'

const typingIn = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))

// shortcuts: false for a second copy (the one in the menu panel), so ⌘K and "/" open only one.
// label: show a text label next to the icon (used in the menu panel).
export default function GlobalSearch({ shortcuts = true, label } = {}) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const { pathname } = useLocation()

  // Shortcuts: ⌘K / Ctrl+K toggles, "/" opens when you aren't typing somewhere.
  useEffect(() => {
    if (!shortcuts) return undefined
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !typingIn(document.activeElement)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [shortcuts])

  // Moving to another page closes the palette.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    if (open) setOpen(false)
  }

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={label ? 'sg-btn sg-btn-secondary sg-btn-sm gs-menu-button' : 'sg-iconbtn sg-iconbtn-ghost sg-iconbtn-md'}
        aria-label={label ? undefined : 'Search the site'}
        title={shortcuts ? `Search (${SHORTCUT_LABEL})` : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts={shortcuts ? 'Meta+K Control+K /' : undefined}
        onClick={() => setOpen(true)}
      >
        <Icon name="search" size={label ? 18 : 20} />
        {label && <span>{label}</span>}
      </button>
      {open && createPortal(<Suspense fallback={null}><Palette onClose={close} /></Suspense>, document.body)}
    </>
  )
}

