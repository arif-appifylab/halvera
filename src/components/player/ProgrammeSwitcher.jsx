import { useEffect, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { cx, Icon, ProgressBar } from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { listProducts, ownsProduct, productHref, TYPE_LABEL } from '@/lib/products.js'
import { progress } from '@/data/account.js'
import { lessonHref } from '@/components/player/lesson-types.js'
import './player-tools.css'

const MY_PROGRAMMES = '/student/dashboard/profile/enrollments'

// The current programme's title as a menu button that jumps to the viewer's other programmes.
// Visitors, and students with one programme, see the title (linking to its page) and "Browse
// programmes". `query` (e.g. '?player=focus') is kept on every programme link.
export default function ProgrammeSwitcher({ product, query = '', className }) {
  const { viewer, signedIn } = useViewer()
  const id = useId()
  const menuId = `${id}-menu`
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const [open, setOpen] = useState(false)

  const mine = signedIn
    ? listProducts().filter((p) => ['course', 'cohort'].includes(p.type) && p.curriculum?.length && ownsProduct(p, viewer))
    : []
  const others = mine.filter((p) => p.slug !== product.slug)

  const items = () => [...(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])]

  // Close on a click outside.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  if (!signedIn || others.length === 0) {
    return (
      <div className={cx('pt-prog', 'is-plain', className)}>
        <a className="pt-prog-title" href={productHref(product)} title={product.title}>{product.title}</a>
        <a className="pt-prog-browse" href="/courses">Browse programmes</a>
      </div>
    )
  }

  // Open the menu and focus its first (or last) item.
  const show = (at) => {
    flushSync(() => setOpen(true))
    const list = items()
    ;(at === 'last' ? list[list.length - 1] : list[0])?.focus()
  }
  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }

  const onTriggerKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show('first') }
    else if (e.key === 'ArrowUp') { e.preventDefault(); show('last') }
  }

  const onMenuKey = (e) => {
    const list = items()
    const at = list.indexOf(document.activeElement)
    const go = (i) => list[(i + list.length) % list.length]?.focus()
    if (e.key === 'ArrowDown') { e.preventDefault(); go(at + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); go(at - 1) }
    else if (e.key === 'Home') { e.preventDefault(); go(0) }
    else if (e.key === 'End') { e.preventDefault(); go(list.length - 1) }
    else if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'Tab') setOpen(false)
    else if (e.key === ' ' && document.activeElement?.matches('a[role="menuitem"]')) { e.preventDefault(); document.activeElement.click() }
  }

  // Links route through the app's link handler; close the menu once one is chosen.
  const onMenuClick = (e) => {
    const item = e.target.closest('[role="menuitem"]')
    if (!item) return
    if (item.getAttribute('aria-disabled') === 'true') { e.preventDefault(); return }
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className={cx('pt-prog', open && 'is-open', className)}>
      <button
        ref={triggerRef}
        type="button"
        className="pt-prog-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${product.title}, switch programme`}
        title={product.title}
        onClick={() => (open ? close(false) : show('first'))}
        onKeyDown={onTriggerKey}
      >
        <span className="pt-prog-title">{product.title}</span>
        <Icon name="chevron-down" size={18} className="pt-prog-chevron" />
      </button>

      <div
        id={menuId}
        ref={menuRef}
        role="menu"
        aria-label="Your programmes"
        className="pt-menu"
        hidden={!open}
        onKeyDown={onMenuKey}
        onClick={onMenuClick}
      >
        <p className="pt-menu-label" aria-hidden="true">Your other programmes</p>
        {others.map((p) => {
          const prog = progress[p.slug]
          const type = TYPE_LABEL[p.type]
          if (p.availability === 'pre-order') {
            return (
              <div key={p.slug} role="menuitem" tabIndex={-1} aria-disabled="true" className="pt-menu-item pt-prog-item is-disabled">
                <span className="pt-prog-item-title">{p.title}</span>
                <span className="pt-prog-item-meta">{type} · Opens {p.releases}</span>
              </div>
            )
          }
          const first = p.curriculum[0]?.lessons[0]?.id
          const percent = prog?.percent ?? 0
          const label = percent >= 100 ? 'Completed' : percent > 0 ? `${percent}% complete` : 'Not started'
          return (
            <a key={p.slug} role="menuitem" tabIndex={-1} className="pt-menu-item pt-prog-item" href={lessonHref(p.slug, prog?.next || first) + query}>
              <span className="pt-prog-item-title">{p.title}</span>
              <span className="pt-prog-item-meta">{type} · {label}</span>
              <span className="pt-prog-item-bar" aria-hidden="true"><ProgressBar value={percent} showValue={false} /></span>
            </a>
          )
        })}
        <div role="separator" className="pt-menu-sep" />
        <a role="menuitem" tabIndex={-1} className="pt-menu-item pt-menu-link" href={productHref(product)}>
          <Icon name="info" size={18} />About this programme
        </a>
        <a role="menuitem" tabIndex={-1} className="pt-menu-item pt-menu-link" href={MY_PROGRAMMES}>
          <Icon name="book" size={18} />All my programmes
        </a>
        <a role="menuitem" tabIndex={-1} className="pt-menu-item pt-menu-link" href="/courses">
          <Icon name="search" size={18} />Browse programmes
        </a>
      </div>
    </div>
  )
}
