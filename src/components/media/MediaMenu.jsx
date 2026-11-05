import { useEffect, useId, useRef, useState } from 'react'
import { cx, Icon } from '@/design-system'
import './media-menu.css'

// A small single-choice menu for media controls (audio track, playback speed) outside Video.js:
// a menu button (aria-haspopup="menu") and a list of role="menuitemradio" items, the active one
// checked. Keyboard: Enter, Space or the arrow keys open it on the active item; arrows, Home and End
// move; Enter or Space choose; Escape closes and returns focus to the button; Tab closes.
//
// Props: label (the menu's name, e.g. "Audio"), value, options [{ value, label, lang?, hint? }],
// onChange(value), text (visible button text, defaults to the selected label), icon, placement
// ("bottom" | "top"), className.
export default function MediaMenu({ label, value, options, onChange, text, icon, placement = 'bottom', className }) {
  const [open, setOpen] = useState(false)
  const [focusAt, setFocusAt] = useState(-1)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const itemRefs = useRef([])
  const id = useId()
  const selected = options.find((o) => o.value === value) || options[0]
  const selectedIndex = Math.max(0, options.indexOf(selected))

  useEffect(() => {
    if (open && focusAt >= 0) itemRefs.current[focusAt]?.focus()
  }, [open, focusAt])

  // A pointer down anywhere else closes the menu.
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  if (!options.length) return null

  const show = (at = selectedIndex) => { setFocusAt(at); setOpen(true) }
  const close = (refocus = true) => { setOpen(false); if (refocus) buttonRef.current?.focus() }
  const choose = (o) => { if (o.value !== value) onChange?.(o.value); close() }

  const onButtonKey = (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show() }
  }
  const onMenuKey = (e) => {
    const last = options.length - 1
    const moves = { ArrowDown: focusAt >= last ? 0 : focusAt + 1, ArrowUp: focusAt <= 0 ? last : focusAt - 1, Home: 0, End: last }
    if (e.key in moves) { e.preventDefault(); setFocusAt(moves[e.key]) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
    else if (e.key === 'Tab') close(false)
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(options[focusAt]) }
  }

  return (
    <div className={cx('mm', open && 'is-open', className)} ref={rootRef}>
      <button
        type="button"
        ref={buttonRef}
        className="mm-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        aria-label={`${label}: ${selected.label}`}
        onClick={() => (open ? close(false) : show())}
        onKeyDown={onButtonKey}
      >
        {icon && <Icon name={icon} size={18} />}
        <span className="mm-text" lang={text ? undefined : selected.lang}>{text ?? selected.label}</span>
        <Icon name="chevron-down" size={16} className="mm-chevron" />
      </button>
      {open && (
        <ul id={`${id}-menu`} className={cx('mm-menu', placement === 'top' && 'is-top')} role="menu" aria-label={label} onKeyDown={onMenuKey}>
          {options.map((o, i) => (
            <li
              key={o.value}
              ref={(el) => { itemRefs.current[i] = el }}
              role="menuitemradio"
              aria-checked={o.value === selected.value}
              tabIndex={i === focusAt ? 0 : -1}
              className="mm-item"
              onClick={() => choose(o)}
              onFocus={() => setFocusAt(i)}
            >
              <Icon name="check" size={16} className="mm-check" />
              <span className="mm-item-text">
                <span lang={o.lang}>{o.label}</span>
                {o.hint && <span className="mm-hint">{o.hint}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
