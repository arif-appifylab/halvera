import React from 'react';

export const cx = (...a) => a.filter(Boolean).join(' ');

const P = {
  check: ['M20 6 9 17l-5-5'],
  'chevron-right': ['m9 18 6-6-6-6'],
  'chevron-left': ['m15 18-6-6 6-6'],
  'chevron-down': ['m6 9 6 6 6-6'],
  'arrow-right': ['M5 12h14', 'm12 5 7 7-7 7'],
  'arrow-left': ['M19 12H5', 'm12 19-7-7 7-7'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm21 21-4.3-4.3'],
  cart: ['M8 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z', 'M19 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z', 'M2 2h2l2.7 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 7H5.1'],
  user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'],
  lock: ['M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  calendar: ['M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 6v6l4 2'],
  play: ['M6 3l14 9-14 9V3Z'],
  pause: ['M6 4h4v16H6z', 'M14 4h4v16h-4z'],
  headphones: ['M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3'],
  video: ['m22 8-6 4 6 4V8Z', 'M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 16v-4', 'M12 8h.01'],
  alert: ['m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z', 'M12 9v4', 'M12 17h.01'],
  'check-circle': ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'm9 12 2 2 4-4'],
  'x-circle': ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'm15 9-6 6', 'm9 9 6 6'],
  leaf: ['M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z', 'M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 12 13 13 12'],
  heart: ['M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z'],
  globe: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M2 12h20', 'M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z'],
  mail: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'm22 6-10 7L2 6'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  'eye-off': ['M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.2 3.2', 'M6.6 6.6C3.9 8.4 2 12 2 12s3.5 8 10 8c1.9 0 3.6-.6 5-1.4', 'M2 2l20 20', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
  star: ['m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z'],
  sparkle: ['M12 3v4', 'M12 17v4', 'M3 12h4', 'M17 12h4', 'm5.6 5.6 2.8 2.8', 'm15.6 15.6 2.8 2.8', 'm5.6 18.4 2.8-2.8', 'm15.6 8.4 2.8-2.8'],
  home: ['m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z', 'M9 22V12h6v10'],
  book: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z', 'M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5'],
  settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z'],
  bell: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.9 1.9 0 0 0 3.4 0'],
  card: ['M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z', 'M2 10h20'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
  'map-pin': ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z', 'M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M22 21v-2a4 4 0 0 0-3-3.9', 'M16 3.1a4 4 0 0 1 0 7.8']
};

const DIRECTIONAL = { 'chevron-right': 1, 'chevron-left': 1, 'arrow-right': 1, 'arrow-left': 1, logout: 1 };

export const iconNames = Object.keys(P);

export function Icon({ name, size = 20, className, label, ...rest }) {
  const d = P[name] || P.info;
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      className={cx('sg-icon', DIRECTIONAL[name] && 'sg-icon-dir', className)}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} {...rest}
    >
      {d.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

export function Button({ variant = 'primary', size = 'md', href, iconStart, iconEnd, block, loading, className, children, type, ...rest }) {
  const cls = cx('sg-btn', 'sg-btn-' + variant, 'sg-btn-' + size, block && 'sg-btn-block', loading && 'is-loading', className);
  const inner = (
    <>
      {loading ? <span className="sg-spinner" aria-hidden="true" /> : iconStart && <Icon name={iconStart} size={18} />}
      <span>{children}</span>
      {iconEnd && <Icon name={iconEnd} size={18} />}
    </>
  );
  if (href) return <a href={href} className={cls} aria-busy={loading || undefined} {...rest}>{inner}</a>;
  return <button type={type || 'button'} className={cls} aria-busy={loading || undefined} disabled={rest.disabled || loading} {...rest}>{inner}</button>;
}

export function IconButton({ icon, label, variant = 'ghost', size = 'md', badge, className, ...rest }) {
  return (
    <button type="button" className={cx('sg-iconbtn', 'sg-iconbtn-' + variant, 'sg-iconbtn-' + size, className)} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={size === 'sm' ? 18 : 20} />
      {badge != null && badge !== 0 && <span className="sg-iconbtn-badge">{badge}</span>}
    </button>
  );
}

export function Badge({ tone = 'neutral', icon, children, className }) {
  return (
    <span className={cx('sg-badge', 'sg-badge-' + tone, className)}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}

const STATUS = {
  Active: ['success', 'check'], Paid: ['success', 'check'], Completed: ['success', 'check'], Graded: ['success', 'check'], Accepted: ['success', 'check'], Redeemed: ['success', 'check'], Verified: ['success', 'check'], Renewed: ['success', 'check'],
  Trialing: ['info', 'sparkle'], 'Pre-order': ['info', 'clock'], Invited: ['info', 'mail'], 'In review': ['info', 'clock'], 'Needs review': ['info', 'clock'],
  Pending: ['warning', 'clock'], 'Partly paid': ['warning', 'clock'], 'Past due': ['warning', 'alert'], Cancelling: ['warning', 'clock'], Paused: ['warning', 'pause'], 'Expiring soon': ['warning', 'alert'], Late: ['warning', 'alert'], Retraining: ['warning', 'alert'], 'Partially refunded': ['warning', 'arrow-left'],
  Failed: ['danger', 'x-circle'], Revoked: ['danger', 'x-circle'], Disputed: ['danger', 'alert'], Rejected: ['danger', 'x-circle'],
  Cancelled: ['neutral', 'x'], Expired: ['neutral', 'clock'], Refunded: ['neutral', 'arrow-left'], Inactive: ['neutral', 'minus']
};

export function StatusBadge({ status, children }) {
  const [tone, icon] = STATUS[status] || ['neutral', null];
  return <Badge tone={tone} icon={icon}>{children || status}</Badge>;
}

export function Avatar({ src, name = '', size = 'md', className }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();
  return (
    <span className={cx('sg-avatar', 'sg-avatar-' + size, className)} aria-label={name || undefined} role={name ? 'img' : undefined}>
      {src ? <img src={src} alt="" /> : <span aria-hidden="true">{initials}</span>}
    </span>
  );
}

export function Card({ as: Tag = 'div', tone = 'raised', padding = 'md', interactive, className, children, ...rest }) {
  return <Tag className={cx('sg-card', 'sg-card-' + tone, 'sg-card-pad-' + padding, interactive && 'sg-card-interactive', className)} {...rest}>{children}</Tag>;
}

export function ProgressBar({ value = 0, max = 100, label, showValue = true, tone = 'primary' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="sg-progress">
      {(label || showValue) && (
        <div className="sg-progress-head">
          {label && <span>{label}</span>}
          {showValue && <span className="sg-progress-val">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={cx('sg-progress-track', 'sg-progress-' + tone)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <span style={{ inlineSize: pct + '%' }} />
      </div>
    </div>
  );
}

export function Skeleton({ width, height = 16, radius, className }) {
  return <span className={cx('sg-skeleton', className)} style={{ inlineSize: width, blockSize: height, borderRadius: radius }} aria-hidden="true" />;
}
