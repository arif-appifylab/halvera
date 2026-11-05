// Signed-in header: the avatar opens a small panel with the account's pages, the theme and Log out.
// (Visitors get the theme switch in the header instead.) On phones the same things sit in the menu
// panel: see AccountMenuLinks.
import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Icon, SegmentedToggle } from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { useTheme } from '@/app/theme.js'
import './account-menu.css'

const LINKS = [
  { label: 'Dashboard', href: '/student/dashboard', icon: 'home' },
  { label: 'My programmes', href: '/student/dashboard/profile/enrollments', icon: 'book' },
  { label: 'Profile settings', href: '/student/dashboard/settings', icon: 'settings' },
  { label: 'Payments', href: '/student/dashboard/profile/payments', icon: 'card' },
]

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

function useLogOut() {
  const { signOut } = useViewer()
  const navigate = useNavigate()
  return () => { signOut(); navigate('/') }
}

export default function AccountMenu() {
  const { viewer } = useViewer()
  const { preference, setPreference } = useTheme()
  const logOut = useLogOut()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus() } }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('focusin', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('focusin', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="am" ref={wrapRef}>
      <button
        ref={buttonRef} type="button" className="am-button"
        aria-label={`Account: ${viewer.name}`} aria-expanded={open} aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar name={viewer.name} size="sm" />
      </button>
      {open && (
        <div id={panelId} className="am-panel">
          <div className="am-who">
            <Avatar name={viewer.name} size="md" />
            <p className="am-who-text">
              <strong>{viewer.name}</strong>
              <span className="t-body-sm t-muted">{viewer.email}</span>
            </p>
          </div>
          <ul className="am-links">
            {LINKS.map((l) => (
              <li key={l.href}><a href={l.href} className="am-link"><Icon name={l.icon} size={18} />{l.label}</a></li>
            ))}
          </ul>
          <div className="am-theme">
            <span className="t-body-sm">Theme</span>
            <SegmentedToggle label="Theme" options={THEMES} value={preference} onChange={setPreference} />
          </div>
          <button type="button" className="am-link am-logout" onClick={logOut}><Icon name="logout" size={18} />Log out</button>
        </div>
      )}
    </div>
  )
}

// The same pages and Log out, for the phone menu panel (its tools row already has the theme switch).
export function AccountMenuLinks() {
  const { viewer } = useViewer()
  const logOut = useLogOut()
  return (
    <div className="am-mobile">
      <div className="am-who">
        <Avatar name={viewer.name} size="sm" />
        <p className="am-who-text"><strong>{viewer.name}</strong><span className="t-body-sm t-muted">{viewer.email}</span></p>
      </div>
      {LINKS.map((l) => <a key={l.href} href={l.href} className="am-link"><Icon name={l.icon} size={18} />{l.label}</a>)}
      <button type="button" className="am-link am-logout" onClick={logOut}><Icon name="logout" size={18} />Log out</button>
    </div>
  )
}
