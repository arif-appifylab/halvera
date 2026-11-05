import React from 'react';
import { cx, Icon, Button, Avatar } from './core.jsx';

export function Section({ tone = 'surface', eyebrow, title, intro, align = 'start', width = 'default', id, className, children }) {
  return (
    <section id={id} className={cx('sg-section', 'sg-section-' + tone, className)}>
      <div className={cx('sg-container', width !== 'default' && 'sg-container-' + width)}>
        {(eyebrow || title || intro) && (
          <header className={cx('sg-section-head', align === 'center' && 'is-center')}>
            {eyebrow && <p className="sg-eyebrow">{eyebrow}</p>}
            {title && <h2 className="sg-section-title">{title}</h2>}
            {intro && <p className="sg-section-intro">{intro}</p>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

export function Hero({ eyebrow, title, highlight, subtitle, primary, secondary, image, imageAlt = '', trust, layout = 'split' }) {
  const parts = highlight && typeof title === 'string' ? title.split(highlight) : null;
  return (
    <section className={cx('sg-hero', 'sg-hero-' + layout)}>
      <div className="sg-container sg-hero-inner">
        <div className="sg-hero-copy">
          {eyebrow && <p className="sg-eyebrow">{eyebrow}</p>}
          <h1 className="sg-hero-title">
            {parts ? <>{parts[0]}<em className="sg-highlight">{highlight}</em>{parts.slice(1).join(highlight)}</> : title}
          </h1>
          {subtitle && <p className="sg-hero-sub">{subtitle}</p>}
          {(primary || secondary) && (
            <div className="sg-hero-ctas">
              {primary && <Button size="lg" href={primary.href} iconEnd="arrow-right">{primary.label}</Button>}
              {secondary && <Button size="lg" variant="secondary" href={secondary.href}>{secondary.label}</Button>}
            </div>
          )}
          {trust && <p className="sg-hero-trust">{trust}</p>}
        </div>
        {image && <div className="sg-hero-media"><img src={image} alt={imageAlt} /></div>}
      </div>
    </section>
  );
}

export function FeatureSteps({ steps = [] }) {
  return (
    <ol className="sg-steps">
      {steps.map((s, i) => (
        <li key={i} className="sg-steps-item">
          <span className="sg-steps-num">{String(i + 1).padStart(2, '0')}</span>
          <h3 className="sg-steps-title">{s.title}</h3>
          <p className="sg-steps-text">{s.text}</p>
        </li>
      ))}
    </ol>
  );
}

export function FeatureCard({ icon = 'leaf', title, text, href, linkLabel = 'Learn more' }) {
  return (
    <article className="sg-feature">
      <span className="sg-feature-icon"><Icon name={icon} size={24} /></span>
      <h3 className="sg-feature-title">{title}</h3>
      <p className="sg-feature-text">{text}</p>
      {href && <a className="sg-arrowlink" href={href}>{linkLabel}<Icon name="arrow-right" size={16} /></a>}
    </article>
  );
}

export function FitList({ forTitle = 'This is for you if', notTitle = 'This is not for you if', fits = [], notFits = [] }) {
  return (
    <div className="sg-fit">
      <div className="sg-fit-col sg-fit-yes">
        <h3>{forTitle}</h3>
        <ul>{fits.map((f, i) => <li key={i}><Icon name="check-circle" size={20} />{f}</li>)}</ul>
      </div>
      <div className="sg-fit-col sg-fit-no">
        <h3>{notTitle}</h3>
        <ul>{notFits.map((f, i) => <li key={i}><Icon name="x-circle" size={20} />{f}</li>)}</ul>
      </div>
    </div>
  );
}

export function Testimonial({ quote, name, detail, avatar, rating }) {
  return (
    <figure className="sg-testimonial">
      {rating && (
        <div className="sg-stars" role="img" aria-label={rating + ' out of 5'}>
          {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={16} className={i < rating ? 'is-on' : undefined} />)}
        </div>
      )}
      <blockquote className="sg-testimonial-quote">“{quote}”</blockquote>
      <figcaption className="sg-testimonial-by">
        <Avatar src={avatar} name={name} size="sm" />
        <span><strong>{name}</strong>{detail && <span>{detail}</span>}</span>
      </figcaption>
    </figure>
  );
}

export function PractitionerCard({ name, role, credentials = [], photo, bio, href }) {
  return (
    <article className="sg-practitioner">
      {photo ? <img className="sg-practitioner-photo" src={photo} alt="" /> : <Avatar name={name} size="xl" />}
      <div>
        <h3 className="sg-practitioner-name">{name}</h3>
        {role && <p className="sg-practitioner-role">{role}</p>}
        {credentials.length > 0 && <ul className="sg-practitioner-creds">{credentials.map((c) => <li key={c}><Icon name="check" size={14} />{c}</li>)}</ul>}
        {bio && <p className="sg-practitioner-bio">{bio}</p>}
        {href && <a className="sg-arrowlink" href={href}>Full profile<Icon name="arrow-right" size={16} /></a>}
      </div>
    </article>
  );
}

export function CtaBand({ title = 'Ready to feel like yourself again?', text = 'Book a free 20-minute consultation. No pressure, just a conversation about where you are and what could help.', primary = { label: 'Book a consultation', href: '/appointment/consultation' }, secondary, tone = 'inverse' }) {
  return (
    <section className={cx('sg-ctaband', 'sg-ctaband-' + tone)}>
      <div className="sg-ctaband-inner">
        <div>
          <h2 className="sg-ctaband-title">{title}</h2>
          {text && <p className="sg-ctaband-text">{text}</p>}
        </div>
        <div className="sg-ctaband-actions">
          {primary && <Button size="lg" variant={tone === 'inverse' ? 'inverse' : 'primary'} href={primary.href} iconStart="calendar">{primary.label}</Button>}
          {secondary && <Button size="lg" variant={tone === 'inverse' ? 'inverse-ghost' : 'secondary'} href={secondary.href}>{secondary.label}</Button>}
        </div>
      </div>
    </section>
  );
}

export function Disclaimer({ children = 'Our programmes support, and never replace, care from your doctor. Nothing here is a diagnosis or treatment. If you have a medical emergency, call your local emergency number.', href = '/disclaimer' }) {
  return (
    <aside className="sg-disclaimer" aria-label="Medical disclaimer">
      <Icon name="info" size={18} />
      <p>{children} {href && <a href={href}>Read the full disclaimer</a>}</p>
    </aside>
  );
}

export function LeadMagnet({ title = 'Free guide: 7 gentle habits for steadier energy', text = 'A printable guide with the daily routines our clients start with.', image, children }) {
  return (
    <div className="sg-leadmagnet">
      {image && <img src={image} alt="" className="sg-leadmagnet-img" />}
      <div className="sg-leadmagnet-body">
        <p className="sg-eyebrow">Free guide</p>
        <h3 className="sg-leadmagnet-title">{title}</h3>
        <p>{text}</p>
        {children}
      </div>
    </div>
  );
}
