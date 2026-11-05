import React, { useRef, useState } from 'react';
import { cx, Icon, Button, Badge } from './core.jsx';

// Every amount arrives from the server already formatted (R-PRICE-10). Never compute totals here.
export function PriceTag({ amount, interval, installments, total, strike, note, size = 'md' }) {
  const free = amount === 0 || amount === '0' || amount === 'Free';
  return (
    <div className={cx('sg-price', 'sg-price-' + size)}>
      <span className="sg-price-main">
        {strike && <s className="sg-price-strike"><span className="sg-sr">Was </span>{strike}</s>}
        {installments ? (
          <span className="sg-price-amount">{installments} × {amount}</span>
        ) : (
          <span className="sg-price-amount">{free ? 'Free' : amount}</span>
        )}
        {interval && !free && <span className="sg-price-interval">/ {interval}</span>}
      </span>
      {installments && total && <span className="sg-price-note">{total} total</span>}
      {note && <span className="sg-price-note">{note}</span>}
    </div>
  );
}

const TYPE_LABEL = {
  course: 'Course', cohort: 'Cohort', bundle: 'Bundle', membership: 'Membership', coaching: 'Coaching', community: 'Community',
  'asset-library': 'Asset library', event: 'Event', appointment: 'Appointment', 'media-library': 'Media library', newsletter: 'Newsletter', blog: 'Blog'
};

// visibility: public | membership | private. availability: available | sold-out | sales-ended | enrolment-closed | owned
export function ProductCard({ type = 'course', title, href, image, summary, meta = [], price, visibility = 'public', availability = 'available', access, onPrimary }) {
  const unavailable = { 'sold-out': 'Sold out', 'sales-ended': 'Sales ended', 'enrolment-closed': 'Enrolment closed' }[availability];
  let cta = { label: 'View details', variant: 'secondary' };
  if (availability === 'owned') cta = { label: 'Open', variant: 'primary' };
  else if (visibility === 'membership') cta = { label: 'Get access with a membership', variant: 'secondary' };
  else if (visibility === 'private') cta = { label: 'Request access', variant: 'secondary' };
  return (
    <article className={cx('sg-pcard', unavailable && 'is-unavailable')}>
      <a href={href} className="sg-pcard-media" tabIndex={-1} aria-hidden="true">
        {image ? <img src={image} alt="" /> : <span className="sg-pcard-ph"><Icon name="leaf" size={32} /></span>}
        <span className="sg-pcard-tags">
          <Badge>{TYPE_LABEL[type] || type}</Badge>
          {unavailable && <Badge tone="warning">{unavailable}</Badge>}
          {availability === 'owned' && <Badge tone="success" icon="check">Owned</Badge>}
        </span>
      </a>
      <div className="sg-pcard-body">
        <h3 className="sg-pcard-title"><a href={href}>{title}</a></h3>
        {summary && <p className="sg-pcard-summary">{summary}</p>}
        {meta.length > 0 && <ul className="sg-pcard-meta">{meta.map((m) => <li key={m.label}><Icon name={m.icon || 'clock'} size={16} />{m.label}</li>)}</ul>}
        <div className="sg-pcard-foot">
          {visibility === 'membership' ? <span className="sg-pcard-incl">Included in a membership</span>
            : visibility === 'private' ? <span className="sg-pcard-incl"><Icon name="lock" size={16} />By application</span>
              : price && <PriceTag {...price} size="sm" />}
          {access && <span className="sg-pcard-access">{access}</span>}
        </div>
        <Button variant={cta.variant} block onClick={onPrimary} href={onPrimary ? undefined : href}>{cta.label}</Button>
      </div>
    </article>
  );
}

export function PlanCard({ name, description, price, featured, featuredLabel = 'Most chosen', features = [], allowances = [], cta = 'Choose plan', ctaHref, current, upgrade, trial }) {
  return (
    <article className={cx('sg-plan', featured && 'is-featured')}>
      {featured && <span className="sg-plan-flag">{featuredLabel}</span>}
      <h3 className="sg-plan-name">{name}</h3>
      {description && <p className="sg-plan-desc">{description}</p>}
      {price && <PriceTag {...price} size="lg" />}
      {trial && <p className="sg-plan-trial"><Icon name="sparkle" size={16} />{trial}</p>}
      {current ? <Button variant="secondary" block disabled>Your current plan</Button>
        : <Button variant={featured ? 'primary' : 'secondary'} block href={ctaHref}>{upgrade ? 'Upgrade' : cta}</Button>}
      {features.length > 0 && <ul className="sg-plan-list">{features.map((f) => <li key={f}><Icon name="check" size={18} />{f}</li>)}</ul>}
      {allowances.length > 0 && <ul className="sg-plan-allow">{allowances.map((a) => <li key={a}><Icon name="calendar" size={16} />{a}</li>)}</ul>}
    </article>
  );
}

export function OrderSummary({ lines = [], discounts = [], subtotal, tax, total, currencyNote, footer }) {
  return (
    <aside className="sg-summary" aria-label="Order summary">
      <h2 className="sg-summary-title">Order summary</h2>
      <ul className="sg-summary-lines">
        {lines.map((l, i) => (
          <li key={i}>
            {l.image && <img src={l.image} alt="" />}
            <span className="sg-summary-name">{l.name}{l.kind && <Badge tone={l.kind === 'Bonus' ? 'success' : 'neutral'}>{l.kind}</Badge>}{l.detail && <small>{l.detail}</small>}</span>
            <span className="sg-summary-amt">{l.amount}</span>
          </li>
        ))}
      </ul>
      <dl className="sg-summary-totals">
        {subtotal && <><dt>Subtotal</dt><dd>{subtotal}</dd></>}
        {discounts.map((d) => <React.Fragment key={d.code}><dt>Coupon <span className="sg-code">{d.code}</span></dt><dd className="sg-summary-saving">−{d.saving}</dd></React.Fragment>)}
        {tax && <><dt>Tax</dt><dd>{tax}</dd></>}
        <dt className="sg-summary-total">Total</dt><dd className="sg-summary-total">{total}</dd>
      </dl>
      {currencyNote && <p className="sg-summary-note">{currencyNote}</p>}
      {footer}
    </aside>
  );
}

export function SlotPicker({ days = [], value, onChange, timezone = 'your time zone' }) {
  const [day, setDay] = useState(0);
  const d = days[day] || { slots: [] };
  return (
    <div className="sg-slots">
      <div className="sg-slots-days" role="tablist" aria-label="Choose a day">
        {days.map((x, i) => (
          <button key={x.date} type="button" role="tab" aria-selected={i === day} className={cx('sg-slots-day', i === day && 'is-active')} onClick={() => setDay(i)} disabled={!x.slots.length}>
            <span>{x.weekday}</span><strong>{x.day}</strong>
          </button>
        ))}
      </div>
      <p className="sg-slots-tz"><Icon name="globe" size={16} />Times shown in {timezone}</p>
      {d.slots.length ? (
        <div className="sg-slots-grid" role="radiogroup" aria-label={'Times on ' + (d.label || d.date)}>
          {d.slots.map((s) => {
            const v = typeof s === 'string' ? { time: s } : s;
            const key = d.date + ' ' + v.time;
            return (
              <button key={key} type="button" role="radio" aria-checked={value === key} disabled={v.full} className={cx('sg-slot', value === key && 'is-selected')} onClick={() => onChange && onChange(key)}>
                {v.time}{v.spots != null && <small>{v.spots} spots left</small>}
              </button>
            );
          })}
        </div>
      ) : <p className="sg-slots-none">No times left on this day. Try the next available date.</p>}
    </div>
  );
}

export function DataTable({ columns = [], rows = [], empty, caption }) {
  if (!rows.length && empty) return empty;
  return (
    <div className="sg-table-wrap" tabIndex={0} role="region" aria-label={caption}>
      <table className="sg-table">
        {caption && <caption className="sg-sr">{caption}</caption>}
        <thead><tr>{columns.map((c) => <th key={c.key} scope="col" className={c.align === 'end' ? 'is-end' : undefined}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}>{columns.map((c) => <td key={c.key} className={c.align === 'end' ? 'is-end' : undefined}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LessonRow({ title, type = 'video', duration, state = 'open', unlockDate, preview, current, href }) {
  // Local change (send upstream): icons for every lesson type the EzyCourse admin offers.
  const icon = { video: 'video', audio: 'headphones', text: 'file', pdf: 'file', download: 'download', live: 'users', quiz: 'check-circle', assignment: 'file', slide: 'card', survey: 'heart', embedded: 'globe', scorm: 'play', multiple: 'menu', ai: 'sparkle', ebook: 'book', interactive: 'play' }[type] || 'file';
  const locked = state === 'drip' || state === 'prereq';
  return (
    <a href={locked ? undefined : href} aria-disabled={locked || undefined} aria-current={current ? 'true' : undefined} className={cx('sg-lesson', 'is-' + state, current && 'is-current')}>
      <span className="sg-lesson-state">
        {state === 'done' ? <Icon name="check-circle" size={20} label="Completed" /> : locked ? <Icon name="lock" size={18} label="Locked" /> : <Icon name={icon} size={18} />}
      </span>
      <span className="sg-lesson-text">
        <span className="sg-lesson-title">{title}</span>
        <span className="sg-lesson-meta">
          {duration}
          {state === 'drip' && unlockDate && <> · Unlocks on {unlockDate}</>}
          {state === 'prereq' && <> · Complete the previous lesson first</>}
        </span>
      </span>
      {preview && <Badge tone="accent">Free preview</Badge>}
    </a>
  );
}

export function AudioPlayer({ title, subtitle, src, duration = '12:30', cover }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [pct, setPct] = useState(0);
  const toggle = () => { const a = ref.current; if (!a) { setPlaying(!playing); return; } if (a.paused) { a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); } };
  return (
    <div className="sg-audio">
      {cover ? <img src={cover} alt="" className="sg-audio-cover" /> : <span className="sg-audio-cover sg-audio-cover-ph"><Icon name="headphones" size={24} /></span>}
      <div className="sg-audio-main">
        <p className="sg-audio-title">{title}</p>
        {subtitle && <p className="sg-audio-sub">{subtitle}</p>}
        <div className="sg-audio-bar" dir="ltr">
          <span className="sg-audio-track"><span style={{ inlineSize: pct + '%' }} /></span>
          <span className="sg-audio-time">{duration}</span>
        </div>
      </div>
      <button type="button" className="sg-audio-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
        <Icon name={playing ? 'pause' : 'play'} size={22} />
      </button>
      {src && <audio ref={ref} src={src} preload="none" onTimeUpdate={(e) => setPct((e.target.currentTime / (e.target.duration || 1)) * 100)} onEnded={() => setPlaying(false)} />}
    </div>
  );
}

export function StatTile({ label, value, hint, icon }) {
  return (
    <div className="sg-stat">
      <span className="sg-stat-label">{icon && <Icon name={icon} size={16} />}{label}</span>
      <span className="sg-stat-value">{value}</span>
      {hint && <span className="sg-stat-hint">{hint}</span>}
    </div>
  );
}
