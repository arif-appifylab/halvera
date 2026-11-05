import { useEffect, useId, useRef, useState } from 'react'
import { cx, IconButton } from '@/design-system'
import { LtIcon } from './icons.jsx'
import { readCollapsed, saveCollapsed } from './layout.js'

// The three ways the lesson tools open (./layout.js). Each takes `api` from useLessonTools and only
// arranges the same tool content: ToolsPanel beside the lesson on wide screens, ToolsBar + drawer below that.

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'

const countLabel = (t) => (t.count ? `${t.label}, ${t.count} ${t.count === 1 ? 'question' : 'questions'}` : t.label)

/* ---------- 1. Drawer: buttons above the lesson, one side drawer at a time ---------- */

export function ToolsBar({ api, initialTool }) {
  const [open, setOpen] = useState(initialTool || null)
  const [focusOnOpen, setFocusOnOpen] = useState(false)
  const triggers = useRef({})
  const lastTrigger = useRef(null)
  const current = api.tools.find((t) => t.id === open)

  const toggle = (id) => {
    lastTrigger.current = triggers.current[id]
    setFocusOnOpen(true)
    setOpen((o) => (o === id ? null : id))
  }
  const close = () => {
    setOpen(null)
    lastTrigger.current?.focus({ preventScroll: true })
  }

  return (
    <>
      <div className="lt-bar" role="group" aria-label="Lesson tools">
        {api.tools.map((t) => (
          <button
            key={t.id}
            ref={(el) => { triggers.current[t.id] = el }}
            type="button"
            className={cx('lt-bar-btn', open === t.id && 'is-active')}
            aria-expanded={open === t.id}
            aria-controls={open === t.id ? 'lt-drawer' : undefined}
            aria-haspopup="dialog"
            aria-label={countLabel(t)}
            onClick={() => toggle(t.id)}
          >
            <LtIcon name={t.icon} size={18} />
            <span>{t.label}</span>
            {t.count > 0 && <span className="lt-count" aria-hidden="true">{t.count}</span>}
          </button>
        ))}
      </div>
      {current && (
        <ToolDrawer tool={current} tools={api.tools} onSelect={(id) => { lastTrigger.current = triggers.current[id]; setOpen(id) }} onClose={close} autoFocus={focusOnOpen}>
          {api.render(current.id, { fill: true })}
        </ToolDrawer>
      )}
    </>
  )
}

function ToolDrawer({ tool, tools, onSelect, onClose, autoFocus, children }) {
  const ref = useRef(null)
  const headRef = useRef(null)
  const titleId = useId()
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })

  // Focus the drawer when the student opens it (not when a preview opens it on load).
  const focusFirst = useRef(autoFocus)
  useEffect(() => {
    if (focusFirst.current) headRef.current?.focus({ preventScroll: true })
  }, [])

  // Escape closes, wherever focus is (unless a player is full screen).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.fullscreenElement) return
      closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Keep Tab inside the drawer.
  const onKeyDown = (e) => {
    if (e.key !== 'Tab') return
    const items = [...ref.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement)
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === headRef.current)) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }

  return (
    <>
      <div className="lt-scrim" aria-hidden="true" onClick={onClose} />
      <div id="lt-drawer" ref={ref} className="lt-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
        <div className="lt-drawer-head">
          <h2 id={titleId} ref={headRef} tabIndex={-1} className="lt-title">
            <LtIcon name={tool.icon} size={20} />{tool.label}
          </h2>
          <IconButton icon="x" label={`Close ${tool.label.toLowerCase()}`} onClick={onClose} />
        </div>
        {/* Switch tools without leaving the drawer (the buttons above the lesson may sit under it). */}
        <div
          className="lt-drawer-switch"
          role="tablist"
          aria-label="Lesson tools"
          onKeyDown={(e) => onTabKeys(e, tools.map((t) => t.id), tool.id, onSelect)}
        >
          {tools.map((t) => {
            const on = t.id === tool.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                data-tab={t.id}
                aria-selected={on}
                aria-controls={`${titleId}-body`}
                tabIndex={on ? 0 : -1}
                className={cx('lt-switch-btn', on && 'is-active')}
                onClick={() => onSelect(t.id)}
              >
                <LtIcon name={t.icon} size={16} />{t.label}
                {t.count > 0 && <span className="lt-count" aria-hidden="true">{t.count}</span>}
              </button>
            )
          })}
        </div>
        <div id={`${titleId}-body`} role="tabpanel" aria-labelledby={titleId} className={cx('lt-drawer-body', tool.id === 'transcript' && 'is-fill')}>{children}</div>
      </div>
    </>
  )
}

/* ---------- 2. Tabs under the lesson ---------- */

function onTabKeys(e, ids, current, select) {
  const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
  const vertical = e.currentTarget.getAttribute('aria-orientation') === 'vertical'
  const i = ids.indexOf(current)
  const step = {
    ArrowRight: vertical ? 0 : rtl ? -1 : 1,
    ArrowLeft: vertical ? 0 : rtl ? 1 : -1,
    ArrowDown: vertical ? 1 : 0,
    ArrowUp: vertical ? -1 : 0,
  }[e.key]
  let next = null
  if (step) next = ids[(i + step + ids.length) % ids.length]
  else if (e.key === 'Home') next = ids[0]
  else if (e.key === 'End') next = ids[ids.length - 1]
  if (!next) return
  e.preventDefault()
  select(next)
  e.currentTarget.querySelector(`[data-tab="${next}"]`)?.focus()
}

export function ToolsPanel({ api, initialTool }) {
  const [picked, setPicked] = useState(initialTool || 'resources')
  const [collapsed, setCollapsedState] = useState(() => (initialTool ? false : readCollapsed()))
  const active = api.tools.some((t) => t.id === picked) ? picked : api.tools[0].id
  const tool = api.tools.find((t) => t.id === active)
  const base = useId()
  const railRef = useRef(null)

  const setCollapsed = (on) => { setCollapsedState(on); saveCollapsed(on) }
  const choose = (id) => {
    if (id === active && !collapsed) { setCollapsed(true); return }
    setPicked(id)
    if (collapsed) setCollapsed(false)
  }

  return (
    <aside className={cx('lt-panel', collapsed && 'is-collapsed')} aria-label="Lesson tools">
      {!collapsed && (
        <div
          id={`${base}-panel`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${active}`}
          className="lt-panel-main"
        >
          <div className="lt-panel-head">
            <h2 className="lt-title"><LtIcon name={tool.icon} size={20} />{tool.label}</h2>
            <button type="button" className="lt-iconbtn" aria-label="Hide lesson tools" title="Hide lesson tools" onClick={() => { setCollapsed(true); railRef.current?.querySelector('[aria-selected="true"]')?.focus() }}>
              <LtIcon name="panel-close" size={20} />
            </button>
          </div>
          <div className={cx('lt-panel-body', active === 'transcript' && 'is-fill')}>{api.render(active, { fill: true })}</div>
        </div>
      )}
      <div className="lt-rail">
      <div
        ref={railRef}
        className="lt-rail-tabs"
        role="tablist"
        aria-orientation="vertical"
        aria-label="Lesson tools"
        onKeyDown={(e) => onTabKeys(e, api.tools.map((t) => t.id), active, setPicked)}
      >
        {api.tools.map((t) => {
          const on = t.id === active
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${base}-tab-${t.id}`}
              data-tab={t.id}
              aria-selected={on}
              aria-controls={collapsed ? undefined : `${base}-panel`}
              aria-label={countLabel(t)}
              tabIndex={on ? 0 : -1}
              className={cx('lt-rail-btn', on && !collapsed && 'is-active')}
              onClick={() => choose(t.id)}
            >
              <span className="lt-rail-icon">
                <LtIcon name={t.icon} size={20} />
                {t.count > 0 && <span className="lt-count is-dot" aria-hidden="true">{t.count}</span>}
              </span>
              <span className="lt-rail-label" aria-hidden="true">{t.label}</span>
            </button>
          )
        })}
      </div>
      {collapsed && (
        <button type="button" className="lt-iconbtn lt-rail-open" aria-label="Show lesson tools" title="Show lesson tools" onClick={() => setCollapsed(false)}>
          <LtIcon name="panel-open" size={20} />
        </button>
      )}
      </div>
    </aside>
  )
}
