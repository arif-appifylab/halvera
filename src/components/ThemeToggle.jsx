// Header theme switch: an icon button that opens a small menu (Light / Dark / Match system).
// Uses the design-system IconButton look (sg-iconbtn classes); the Icon set has no sun or moon,
// so they are drawn here on the same 24px grid, 1.75px stroke, round caps, currentColor.
import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from '@/design-system'
import { useTheme } from '@/app/theme.js'
import './ThemeToggle.css'

const GLYPHS = {
  sun: ['M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M12 2v2', 'M12 20v2', 'm4.9 4.9 1.4 1.4', 'm17.7 17.7 1.4 1.4', 'M2 12h2', 'M20 12h2', 'm6.3 17.7-1.4 1.4', 'm19.1 4.9-1.4 1.4'],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'],
  monitor: ['M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', 'M8 21h8', 'M12 17v4'],
}

export function ThemeGlyph({ name, size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="sg-icon" aria-hidden="true">
      {GLYPHS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  )
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', glyph: 'sun' },
  { value: 'dark', label: 'Dark', glyph: 'moon' },
  { value: 'system', label: 'Match system', glyph: 'monitor' },
]

export default function ThemeToggle() {
  const { preference, theme, setPreference } = useTheme()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const itemsRef = useRef([])
  const menuId = useId()

  const current = THEME_OPTIONS.find((o) => o.value === preference) || THEME_OPTIONS[2]
  const label = 'Theme: ' + current.label + (preference === 'system' ? ' (' + (theme === 'dark' ? 'dark' : 'light') + ')' : '')

  const focusItem = (i) => {
    const list = itemsRef.current.filter(Boolean)
    if (list.length) list[(i + list.length) % list.length].focus()
  }

  // On open, focus the checked option.
  useEffect(() => {
    if (open) focusItem(THEME_OPTIONS.findIndex((o) => o.value === preference))
  }, [open, preference])

  // Close on a click or focus outside.
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('focusin', onDown)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('focusin', onDown)
    }
  }, [open])

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }

  const choose = (value) => {
    setPreference(value)
    close()
  }

  const onButtonKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
    }
  }

  const onMenuKey = (e) => {
    const list = itemsRef.current.filter(Boolean)
    const i = list.indexOf(document.activeElement)
    if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(i + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(i - 1) }
    else if (e.key === 'Home') { e.preventDefault(); focusItem(0) }
    else if (e.key === 'End') { e.preventDefault(); focusItem(list.length - 1) }
    else if (e.key === 'Tab') close(false)
  }

  return (
    <div className="tt" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="sg-iconbtn sg-iconbtn-ghost sg-iconbtn-md"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKey}
      >
        <ThemeGlyph name={theme === 'dark' ? 'moon' : 'sun'} />
      </button>
      {open && (
        <div id={menuId} className="tt-menu" role="menu" aria-label="Theme" onKeyDown={onMenuKey}>
          {THEME_OPTIONS.map((o, i) => {
            const checked = o.value === preference
            return (
              <button
                key={o.value}
                ref={(el) => { itemsRef.current[i] = el }}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                className="tt-item"
                onClick={() => choose(o.value)}
              >
                <ThemeGlyph name={o.glyph} size={18} />
                <span className="tt-item-label">{o.label}</span>
                <span className="tt-item-check">{checked && <Icon name="check" size={16} />}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
