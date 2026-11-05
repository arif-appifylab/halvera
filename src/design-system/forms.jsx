import React, { useId, useRef, useState } from 'react';
import { cx, Icon, Button } from './core.jsx';

function Field({ id, label, hint, error, optional, children, className }) {
  return (
    <div className={cx('sg-field', error && 'has-error', className)}>
      {label && (
        <label className="sg-label" htmlFor={id}>
          {label}{optional && <span className="sg-optional"> (optional)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="sg-field-msg sg-field-error" id={id + '-msg'}><Icon name="alert" size={16} />{error}</p>
      ) : hint ? (
        <p className="sg-field-msg" id={id + '-msg'}>{hint}</p>
      ) : null}
    </div>
  );
}

export function TextField({ label, hint, error, optional, type = 'text', multiline, rows = 4, iconStart, className, id, ...rest }) {
  const auto = useId();
  const fid = id || auto;
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  const common = {
    id: fid, className: 'sg-input', 'aria-invalid': error ? true : undefined,
    'aria-describedby': error || hint ? fid + '-msg' : undefined, ...rest
  };
  return (
    <Field id={fid} label={label} hint={hint} error={error} optional={optional} className={className}>
      <div className={cx('sg-input-wrap', iconStart && 'has-icon', isPw && 'has-action')}>
        {iconStart && <Icon name={iconStart} size={18} className="sg-input-icon" />}
        {multiline ? <textarea rows={rows} {...common} /> : <input type={isPw && show ? 'text' : type} {...common} />}
        {isPw && (
          <button type="button" className="sg-input-action" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
            <Icon name={show ? 'eye-off' : 'eye'} size={18} />
          </button>
        )}
      </div>
    </Field>
  );
}

// Local change: the rules appear once the person starts typing (or when `show` is set, e.g. after a
// failed submit), not before.
export function PasswordRules({ value = '', show = false }) {
  if (!value && !show) return null;
  const rules = [
    ['8–64 characters', value.length >= 8 && value.length <= 64],
    ['An uppercase letter', /[A-Z]/.test(value)],
    ['A lowercase letter', /[a-z]/.test(value)],
    ['A number', /\d/.test(value)]
  ];
  return (
    <ul className="sg-pwrules" aria-live="polite">
      {rules.map(([t, ok]) => (
        <li key={t} className={ok ? 'is-met' : undefined}>
          <Icon name={ok ? 'check-circle' : 'minus'} size={16} />
          <span>{t}</span><span className="sg-sr">{ok ? ' — met' : ' — not met'}</span>
        </li>
      ))}
    </ul>
  );
}

export function Select({ label, hint, error, optional, options = [], placeholder, className, id, ...rest }) {
  const auto = useId();
  const fid = id || auto;
  return (
    <Field id={fid} label={label} hint={hint} error={error} optional={optional} className={className}>
      <div className="sg-select-wrap">
        <select id={fid} className="sg-input sg-select" aria-invalid={error ? true : undefined} aria-describedby={error || hint ? fid + '-msg' : undefined} {...rest}>
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => {
            const v = typeof o === 'string' ? { value: o, label: o } : o;
            return <option key={v.value} value={v.value}>{v.label}</option>;
          })}
        </select>
        <Icon name="chevron-down" size={18} className="sg-select-icon" />
      </div>
    </Field>
  );
}

export function Checkbox({ label, description, error, className, id, ...rest }) {
  const auto = useId();
  const fid = id || auto;
  return (
    <div className={cx('sg-check', error && 'has-error', className)}>
      <input type="checkbox" id={fid} className="sg-check-input" aria-invalid={error ? true : undefined} {...rest} />
      <span className="sg-check-box" aria-hidden="true"><Icon name="check" size={14} /></span>
      <label htmlFor={fid} className="sg-check-label">
        {label}
        {description && <span className="sg-check-desc">{description}</span>}
        {error && <span className="sg-field-error"><Icon name="alert" size={16} />{error}</span>}
      </label>
    </div>
  );
}

export function RadioCard({ name, value, checked, onChange, title, description, meta, badge, disabled, className }) {
  const id = useId();
  return (
    <label htmlFor={id} className={cx('sg-radiocard', checked && 'is-checked', disabled && 'is-disabled', className)}>
      <input type="radio" id={id} name={name} value={value} checked={checked} onChange={onChange} disabled={disabled} className="sg-radiocard-input" />
      <span className="sg-radiocard-dot" aria-hidden="true" />
      <span className="sg-radiocard-body">
        <span className="sg-radiocard-title">{title}{badge}</span>
        {description && <span className="sg-radiocard-desc">{description}</span>}
      </span>
      {meta && <span className="sg-radiocard-meta">{meta}</span>}
    </label>
  );
}

export function Switch({ label, description, checked, onChange, disabled, id }) {
  const auto = useId();
  const fid = id || auto;
  return (
    <div className="sg-switch-row">
      <div className="sg-switch-text">
        <label htmlFor={fid} className="sg-label">{label}</label>
        {description && <p className="sg-field-msg">{description}</p>}
      </div>
      <button type="button" role="switch" id={fid} aria-checked={!!checked} disabled={disabled} onClick={() => onChange && onChange(!checked)} className={cx('sg-switch', checked && 'is-on')}>
        <span className="sg-switch-thumb" />
      </button>
    </div>
  );
}

export function OtpInput({ length = 6, value = '', onChange, error, label = 'Verification code' }) {
  const refs = useRef([]);
  const chars = value.split('').concat(Array(length).fill('')).slice(0, length);
  const set = (i, c) => {
    const next = chars.slice();
    next[i] = c;
    onChange && onChange(next.join('').slice(0, length));
  };
  return (
    <fieldset className={cx('sg-otp', error && 'has-error')}>
      <legend className="sg-label">{label}</legend>
      <div className="sg-otp-cells" dir="ltr">
        {chars.map((c, i) => (
          <input
            key={i} ref={(el) => (refs.current[i] = el)} className="sg-otp-cell" inputMode="numeric" maxLength={1}
            autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={'Digit ' + (i + 1)} value={c}
            onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(-1); set(i, d); if (d && refs.current[i + 1]) refs.current[i + 1].focus(); }}
            onKeyDown={(e) => { if (e.key === 'Backspace' && !c && refs.current[i - 1]) refs.current[i - 1].focus(); }}
            onPaste={(e) => { const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length); if (t) { e.preventDefault(); onChange && onChange(t); } }}
          />
        ))}
      </div>
      {error && <p className="sg-field-msg sg-field-error"><Icon name="alert" size={16} />{error}</p>}
    </fieldset>
  );
}

export function CouponField({ applied = [], onApply, onRemove, error }) {
  const [code, setCode] = useState('');
  return (
    <div className="sg-coupon">
      <div className="sg-coupon-row">
        <TextField label="Coupon code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} error={error} placeholder="SPRING25" />
        <Button variant="secondary" onClick={() => { if (code && onApply) { onApply(code); setCode(''); } }}>Apply</Button>
      </div>
      {applied.length > 0 && (
        <ul className="sg-coupon-list">
          {applied.map((c) => (
            <li key={c.code}>
              <span className="sg-code">{c.code}</span>
              <span className="sg-coupon-saving">−{c.saving}</span>
              <button type="button" className="sg-linkbtn" onClick={() => onRemove && onRemove(c.code)}>Remove<span className="sg-sr"> {c.code}</span></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
