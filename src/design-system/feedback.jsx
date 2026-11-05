import React, { useEffect, useState } from 'react';
import { cx, Icon, Button, IconButton } from './core.jsx';

const NOTICE_ICON = { info: 'info', success: 'check-circle', warning: 'alert', danger: 'x-circle', neutral: 'info' };

export function Notice({ tone = 'info', title, children, action, onDismiss, className }) {
  return (
    <div className={cx('sg-notice', 'sg-notice-' + tone, className)} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={NOTICE_ICON[tone]} size={20} className="sg-notice-icon" />
      <div className="sg-notice-body">
        {title && <p className="sg-notice-title">{title}</p>}
        {children && <div className="sg-notice-text">{children}</div>}
        {action && <div className="sg-notice-action">{action}</div>}
      </div>
      {onDismiss && <IconButton icon="x" label="Dismiss" size="sm" onClick={onDismiss} />}
    </div>
  );
}

export function StateNotice({ reason = 'This event has ended', detail, title, image, actions, children }) {
  return (
    <section className="sg-state">
      {image && <img src={image} alt="" className="sg-state-img" />}
      <div className="sg-state-body">
        {title && <p className="sg-state-product">{title}</p>}
        <h2 className="sg-state-reason">{reason}</h2>
        {detail && <p className="sg-state-detail">{detail}</p>}
        {children}
        {actions && <div className="sg-state-actions">{actions}</div>}
      </div>
    </section>
  );
}

export function EmptyState({ icon = 'leaf', title, children, action }) {
  return (
    <div className="sg-empty">
      <span className="sg-empty-icon"><Icon name={icon} size={28} /></span>
      <h3 className="sg-empty-title">{title}</h3>
      {children && <p className="sg-empty-text">{children}</p>}
      {action && <div className="sg-empty-action">{action}</div>}
    </div>
  );
}

export function Stepper({ steps = [], current = 0, orientation = 'horizontal' }) {
  return (
    <ol className={cx('sg-stepper', 'sg-stepper-' + orientation)}>
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        const v = typeof s === 'string' ? { label: s } : s;
        return (
          <li key={i} className={'is-' + state} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="sg-step-dot">{state === 'done' ? <Icon name="check" size={14} /> : i + 1}</span>
            <span className="sg-step-text">
              <span className="sg-step-label">{v.label}</span>
              {v.description && <span className="sg-step-desc">{v.description}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="sg-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div className={cx('sg-modal', 'sg-modal-' + size)} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sg-modal-head">
          <h2 className="sg-modal-title">{title}</h2>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </div>
        <div className="sg-modal-body">{children}</div>
        {footer && <div className="sg-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, footer }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="sg-overlay sg-overlay-drawer" onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div className="sg-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sg-modal-head">
          <h2 className="sg-modal-title">{title}</h2>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </div>
        <div className="sg-drawer-body">{children}</div>
        {footer && <div className="sg-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Accordion({ items = [], defaultOpen = -1 }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="sg-accordion">
      {items.map((it, i) => {
        const on = open === i;
        return (
          <div key={i} className={cx('sg-acc-item', on && 'is-open')}>
            <h3 className="sg-acc-h">
              <button type="button" aria-expanded={on} className="sg-acc-btn" onClick={() => setOpen(on ? -1 : i)}>
                <span>{it.question}</span><Icon name={on ? 'minus' : 'plus'} size={20} />
              </button>
            </h3>
            {on && <div className="sg-acc-panel">{it.answer}</div>}
          </div>
        );
      })}
    </div>
  );
}

export function Countdown({ to, label = 'Starts in' }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = Math.max(0, new Date(to).getTime() - now);
  const parts = [['days', 86400000], ['hrs', 3600000], ['min', 60000], ['sec', 1000]];
  let rest = ms;
  return (
    <div className="sg-countdown" aria-label={label}>
      <span className="sg-countdown-label">{label}</span>
      <div className="sg-countdown-cells" dir="ltr">
        {parts.map(([u, d]) => { const v = Math.floor(rest / d); rest -= v * d; return <span key={u} className="sg-countdown-cell"><strong>{String(v).padStart(2, '0')}</strong><small>{u}</small></span>; })}
      </div>
    </div>
  );
}
