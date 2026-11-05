import { Suspense } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Avatar, Badge, Icon } from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { gamification } from '@/data/account.js'
import { getPlan } from '@/data/plans.js'
import MiniCart from '@/components/MiniCart.jsx'
import PreviewBar from '@/components/PreviewBar.jsx'
import { AccountBanners, SchoolHeader } from '@/layouts/SiteLayout.jsx'
import '@/styles/pages.css'
import './dashboard-layout.css'

const BASE = '/student/dashboard'

// The dashboard's tabs. Membership shows only to members. `match` covers a tab's sub-pages.
const tabs = (member) => [
  { label: 'Home', href: BASE, icon: 'home' },
  { label: 'My library', href: `${BASE}/profile/enrollments`, icon: 'book' },
  member && { label: 'Membership', href: `${BASE}/memberships`, icon: 'leaf' },
  { label: 'Bookings', href: `${BASE}/bookings`, icon: 'calendar' },
  { label: 'Profile', href: `${BASE}/profile`, icon: 'user' },
  { label: 'Payments', href: `${BASE}/profile/payments`, icon: 'card' },
  { label: 'Settings', href: `${BASE}/settings`, icon: 'settings' },
].filter(Boolean)

const level = gamification.enabled ? `Level ${gamification.level} · ${gamification.levelName}` : null

// The student dashboard: a tinted band with the student, then the pages as tabs; content full width.
export default function DashboardLayout() {
  const { pathname } = useLocation()
  const { viewer, signedIn } = useViewer()

  if (!signedIn) return <Navigate to={'/login?next=' + encodeURIComponent(pathname)} replace />

  const current = pathname.replace(/\/$/, '')
  const plan = viewer.plan ? getPlan(viewer.plan) : null

  return (
    <>
      <SchoolHeader inDashboard />
      <AccountBanners />
      <div className="dash-band">
        <div className="dash-band-inner">
          <div className="dash-band-who">
            <Avatar name={viewer.name} size="lg" />
            <div>
              <p className="t-heading-3">{viewer.name}</p>
              <p className="t-body-sm t-muted">{[plan && `${plan.name} member`, level].filter(Boolean).join(' · ') || viewer.email}</p>
            </div>
            {gamification.enabled && (
              <Badge tone="primary" icon="star">{gamification.points.toLocaleString('en-GB')} points</Badge>
            )}
          </div>
          <nav className="dash-tabs" aria-label="Dashboard">
            {tabs(Boolean(plan)).map((t) => {
              const on = current === t.href
              return (
                <a key={t.href} href={t.href} className={'dash-tab' + (on ? ' is-current' : '')} aria-current={on ? 'page' : undefined}>
                  <Icon name={t.icon} size={18} />{t.label}
                </a>
              )
            })}
          </nav>
        </div>
      </div>
      <main id="main" className="dash-wide">
        <Suspense fallback={null}><Outlet /></Suspense>
      </main>
      <MiniCart />
      <PreviewBar />
    </>
  )
}
