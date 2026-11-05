import React, { useId, useState } from 'react';
import { cx, Icon, Button, IconButton, Avatar } from './core.jsx';

const DEFAULT_NAV = [
  { label: 'Programmes', href: '/courses' },
  { label: 'What we help with', href: '/conditions' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Membership', href: '/memberships' },
  { label: 'Blog', href: '/blog' },
  { label: 'About us', href: '/about-us' },
  { label: 'Contact us', href: '/contact-us' }
];

// Local change: the Halvera mark (two leaves leaning apart like a sprout, joined into an "H"), in place of
// the leaf icon. The first leaf and the bar take the text colour; the second leaf is gold (--honey) in every
// theme. The leaf veins are cut out with a mask, so they show whatever is behind the mark.
export function LogoMark({ size = 24, className }) {
  const id = 'sg-logo-vein-' + useId().replace(/:/g, '');
  return (
    <svg className={cx('sg-logomark', className)} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect width="32" height="32" fill="#fff" />
          <path d="M10 7v18" stroke="#000" strokeWidth="1.1" strokeLinecap="round" transform="rotate(-10 10 16)" />
          <path d="M22 7v18" stroke="#000" strokeWidth="1.1" strokeLinecap="round" transform="rotate(10 22 16)" />
        </mask>
      </defs>
      <g mask={`url(#${id})`}>
        <path fill="currentColor" d="M10 3C5 9 5 23 10 29c5-6 5-20 0-26Z" transform="rotate(-10 10 16)" />
        <path fill="currentColor" d="M12.6 14.6h6.8v2.8h-6.8z" />
        <path fill="var(--honey)" d="M22 3c-5 6-5 20 0 26 5-6 5-20 0-26Z" transform="rotate(10 22 16)" />
      </g>
    </svg>
  );
}

export function Wordmark({ name = 'Halvera', href = '/', logoSrc }) {
  return (
    <a href={href} className="sg-wordmark">
      {logoSrc ? <img src={logoSrc} alt={name} /> : <><LogoMark size={26} /><span>{name}</span></>}
    </a>
  );
}

export function SiteHeader({ schoolName, logoSrc, nav = DEFAULT_NAV, current, cta = { label: 'Book a consultation', href: '/appointment/consultation' }, cartCount, cartEnabled = false, onCartClick, signedIn, userName, languages, language, onLanguageChange, extraActions, menuTools, account, menuAccount }) {
  // Local change: optional `account` replaces the signed-in avatar link (e.g. an account menu), and
  // `menuAccount` replaces the "My dashboard" link in the menu panel.
  // Local change: optional `extraActions` (e.g. the theme switch) render in the header actions before the cart.
  // Local change: optional `menuTools` (search, theme) render at the top of the menu panel, which also gets
  // the language picker and, when signed in, the dashboard link (on phones the header shows only the logo and menu).
  const [open, setOpen] = useState(false);
  return (
    <header className="sg-header">
      <div className="sg-header-inner">
        <Wordmark name={schoolName} logoSrc={logoSrc} />
        <nav className="sg-header-nav" aria-label="Main">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className={cx('sg-navlink', current === n.href && 'is-current')} aria-current={current === n.href ? 'page' : undefined}>{n.label}</a>
          ))}
        </nav>
        <div className="sg-header-actions">
          {languages && languages.length > 1 && (
            <label className="sg-lang">
              <Icon name="globe" size={18} />
              <span className="sg-sr">Language</span>
              <select value={language} onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}>
                {languages.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </label>
          )}
          {extraActions}
          {cartEnabled && <IconButton icon="cart" label={'Cart' + (cartCount ? ', ' + cartCount + ' items' : '')} badge={cartCount} onClick={onCartClick} />}
          {signedIn ? (account ||
            <a href="/student/dashboard" className="sg-header-user"><Avatar name={userName} size="sm" /><span className="sg-sr">Dashboard</span></a>
          ) : (
            <a href="/login" className="sg-navlink sg-header-login">Log in</a>
          )}
          {cta && <Button href={cta.href} size="sm" className="sg-header-cta">{cta.label}</Button>}
          <IconButton icon={open ? 'x' : 'menu'} label={open ? 'Close menu' : 'Open menu'} className="sg-header-burger" aria-expanded={open} onClick={() => setOpen(!open)} />
        </div>
      </div>
      {open && (
        <nav className="sg-header-mobile" aria-label="Main">
          {(menuTools || (languages && languages.length > 1)) && (
            <div className="sg-header-mobile-tools">
              {menuTools}
              {languages && languages.length > 1 && (
                <label className="sg-lang sg-lang-menu">
                  <Icon name="globe" size={18} />
                  <span className="sg-sr">Language</span>
                  <select value={language} onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}>
                    {languages.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}
          {nav.map((n) => <a key={n.href} href={n.href} className="sg-navlink">{n.label}</a>)}
          {signedIn
            ? (menuAccount || <a href="/student/dashboard" className="sg-navlink sg-header-mobile-user"><Avatar name={userName} size="sm" />My dashboard</a>)
            : <a href="/login" className="sg-navlink">Log in</a>}
          {cta && <Button href={cta.href} block>{cta.label}</Button>}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter({ schoolName = 'Halvera', tagline = 'Gentle, practitioner-led care for body and mind.', columns, legal = [{ label: 'Terms of use', href: '/terms-of-use' }, { label: 'Privacy policy', href: '/privacy-policy' }, { label: 'Refund policy', href: '/refund-policy' }, { label: 'Medical disclaimer', href: '/disclaimer' }], disclaimer = 'The information on this site is for education only and is not a substitute for medical advice. Always speak to your doctor before changing medication or treatment.', newsletter }) {
  const cols = columns || [
    { title: 'Programmes', links: [{ label: 'All programmes', href: '/courses' }, { label: 'Membership', href: '/memberships' }, { label: 'Guided audio', href: '/all-products' }] },
    { title: 'About', links: [{ label: 'About us', href: '/about-us' }, { label: 'How it works', href: '/how-it-works' }, { label: 'Blog', href: '/blog' }, { label: 'FAQ', href: '/faqs' }] },
    { title: 'Help', links: [{ label: 'Contact us', href: '/contact-us' }, { label: 'Verify a certificate', href: '/verify' }, { label: 'Log in', href: '/login' }] }
  ];
  return (
    <footer className="sg-footer">
      <div className="sg-footer-inner">
        <div className="sg-footer-brand">
          <span className="sg-wordmark sg-wordmark-inverse"><LogoMark size={26} /><span>{schoolName}</span></span>
          <p>{tagline}</p>
          {newsletter}
        </div>
        {cols.map((c) => (
          <div key={c.title} className="sg-footer-col">
            <h2 className="sg-footer-title">{c.title}</h2>
            <ul>{c.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
          </div>
        ))}
      </div>
      {disclaimer && <p className="sg-footer-disclaimer">{disclaimer}</p>}
      <div className="sg-footer-legal">
        <span>© {new Date().getFullYear()} {schoolName}</span>
        <ul>{legal.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
      </div>
    </footer>
  );
}

export function Tabs({ tabs = [], value, onChange, variant = 'underline', label }) {
  return (
    <div className={cx('sg-tabs', 'sg-tabs-' + variant)} role="tablist" aria-label={label}>
      {tabs.map((t) => {
        const v = typeof t === 'string' ? { value: t, label: t } : t;
        const on = v.value === value;
        return (
          <button key={v.value} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} className={cx('sg-tab', on && 'is-active')} onClick={() => onChange && onChange(v.value)}>
            {v.label}{v.count != null && <span className="sg-tab-count">{v.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SegmentedToggle({ options = [], value, onChange, label }) {
  return (
    <div className="sg-segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const v = typeof o === 'string' ? { value: o, label: o } : o;
        return (
          <button key={v.value} type="button" role="radio" aria-checked={v.value === value} className={cx('sg-seg', v.value === value && 'is-active')} onClick={() => onChange && onChange(v.value)}>
            {v.label}{v.note && <span className="sg-seg-note">{v.note}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Breadcrumbs({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="sg-crumbs">
      <ol>
        {items.map((it, i) => (
          <li key={i}>
            {i < items.length - 1 ? <a href={it.href}>{it.label}</a> : <span aria-current="page">{it.label}</span>}
            {i < items.length - 1 && <Icon name="chevron-right" size={14} />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Pagination({ page = 1, pages = 1, onChange }) {
  const nums = [];
  for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
  return (
    <nav className="sg-pagination" aria-label="Pagination">
      <button type="button" className="sg-page" disabled={page <= 1} onClick={() => onChange && onChange(page - 1)} aria-label="Previous page"><Icon name="chevron-left" size={18} /></button>
      {nums.map((n, i) => n === '…' ? <span key={'e' + i} className="sg-page-gap">…</span> : (
        <button key={n} type="button" className={cx('sg-page', n === page && 'is-current')} aria-current={n === page ? 'page' : undefined} onClick={() => onChange && onChange(n)}>{n}</button>
      ))}
      <button type="button" className="sg-page" disabled={page >= pages} onClick={() => onChange && onChange(page + 1)} aria-label="Next page"><Icon name="chevron-right" size={18} /></button>
    </nav>
  );
}

export function DashboardNav({ items, current, userName = 'Amina Rahman', level, logout = true }) {
  // Local change: `logout={false}` hides Log out (the header's account menu has it).
  const list = items || [
    { label: 'Home', href: '/student/dashboard', icon: 'home' },
    { label: 'My programmes', href: '/student/dashboard/profile/enrollments', icon: 'book' },
    { label: 'Appointments', href: '/student/dashboard/appointments', icon: 'calendar' },
    { label: 'Guided audio', href: '/student/dashboard/media-libraries', icon: 'headphones' },
    { label: 'Payments', href: '/student/dashboard/profile/payments', icon: 'card' },
    { label: 'Notifications', href: '/notifications', icon: 'bell' },
    { label: 'Settings', href: '/student/dashboard/setting/emails', icon: 'settings' }
  ];
  return (
    <aside className="sg-dashnav">
      <div className="sg-dashnav-user">
        <Avatar name={userName} />
        <div><strong>{userName}</strong>{level && <span>{level}</span>}</div>
      </div>
      <nav aria-label="Dashboard">
        {list.map((it) => (
          <a key={it.href} href={it.href} className={cx('sg-dashnav-link', current === it.href && 'is-current')} aria-current={current === it.href ? 'page' : undefined}>
            <Icon name={it.icon} size={18} />{it.label}
          </a>
        ))}
      </nav>
      {logout && <a href="/logout" className="sg-dashnav-link sg-dashnav-logout"><Icon name="logout" size={18} />Log out</a>}
    </aside>
  );
}
