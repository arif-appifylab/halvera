import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SiteHeader, SiteFooter, Notice, Button } from '@/design-system'
import { school, nav, footerColumns, legal } from '@/data/school.js'
import { useViewer } from '@/app/viewer.jsx'
import { siteAccess } from '@/lib/access.js'
import MiniCart from '@/components/MiniCart.jsx'
import NewsletterForm from '@/components/NewsletterForm.jsx'
import PreviewBar from '@/components/PreviewBar.jsx'
import ThemeToggle from '@/components/ThemeToggle.jsx'
import GlobalSearch from '@/components/GlobalSearch.jsx'
import AccountMenu, { AccountMenuLinks } from '@/components/AccountMenu.jsx'
import '@/styles/pages.css'

// Which nav item a route belongs to.
const sectionFor = (pathname) => {
  const direct = nav.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'))
  if (direct) return direct.href
  if (/^\/(course|bundle|coaching|community|event|media-library|asset-library|newsletter)\//.test(pathname) || pathname === '/all-products') return '/courses'
  if (pathname === '/site-access') return '/memberships'
  return undefined
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const [language, setLanguage] = useState(() => document.documentElement.lang || 'en')
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])
  return [language, setLanguage]
}

// The site header. Signed in, the header button is Dashboard (none inside the dashboard) and the avatar
// opens the account menu, which holds the theme and Log out; visitors get the theme switch in the header
// and "Book a consultation".
export function SchoolHeader({ current, inDashboard = false }) {
  const { viewer, signedIn } = useViewer()
  const [language, setLanguage] = useLanguage()
  const dashboardCta = inDashboard ? null : { label: 'Dashboard', href: '/student/dashboard' }
  return (
    <SiteHeader
      schoolName={school.name}
      nav={nav}
      current={current}
      cta={signedIn ? dashboardCta : school.consultation}
      // The floating mini cart is the way to the cart, so the header has no cart icon.
      cartEnabled={false}
      signedIn={signedIn}
      userName={viewer.name}
      languages={school.languages}
      language={language}
      onLanguageChange={setLanguage}
      extraActions={<><GlobalSearch />{!signedIn && <ThemeToggle />}</>}
      menuTools={<><GlobalSearch shortcuts={false} label="Search" /><ThemeToggle /></>}
      account={<AccountMenu />}
      menuAccount={<AccountMenuLinks />}
    />
  )
}

export function AccountBanners() {
  const { viewer, signedIn } = useViewer()
  const { pathname } = useLocation()
  if (!signedIn) return null
  // The code page itself already asks for the code.
  if (!viewer.verified && pathname !== '/verify-email') {
    return (
      <div className="sg-container site-banner">
        <Notice tone="warning" title="Confirm your email to open your programmes" action={<Button size="sm" variant="secondary" href="/verify-email">Enter the code</Button>}>
          We sent a 6-digit code to {viewer.email || 'your email'}. The website stays open while you wait.
        </Notice>
      </div>
    )
  }
  // The site access page explains renewal itself.
  if (siteAccess.enabled && viewer.siteAccess === 'ended' && siteAccess.whenEnds === 'lock' && pathname !== '/site-access') {
    return (
      <div className="sg-container site-banner">
        <Notice tone="warning" title="Your site access ended on Sun 12 Oct" action={<Button size="sm" href="/site-access">Renew site access</Button>}>
          Your programmes are locked until you renew. Nothing you have done is lost.
        </Notice>
      </div>
    )
  }
  return null
}

export default function SiteLayout() {
  const { pathname } = useLocation()
  // The course player brings its own top bar, so the site chrome steps aside.
  const bare = /^\/course\/[^/]+\/learn\//.test(pathname)

  if (bare) {
    return (
      <>
        <main id="main">
          <Suspense fallback={null}><Outlet /></Suspense>
        </main>
        <MiniCart />
        <PreviewBar />
      </>
    )
  }

  return (
    <>
      <SchoolHeader current={sectionFor(pathname)} />
      <AccountBanners />
      <main id="main">
        <Suspense fallback={null}><Outlet /></Suspense>
      </main>
      <SiteFooter
        schoolName={school.name}
        tagline={school.tagline}
        columns={footerColumns}
        legal={legal}
        // No medical disclaimer line in the footer (the client asked to remove it).
        disclaimer={null}
        newsletter={<NewsletterForm />}
      />
      <MiniCart />
      <PreviewBar />
    </>
  )
}
