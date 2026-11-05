import { Fragment, useRef, useState } from 'react'
import { Badge, Button, Icon, LogoMark, TextField } from '@/design-system'
import { school, legal } from '@/data/school.js'
import { MAX_CODES } from '@/lib/commerce.js'

// Short labels for the footer; hrefs from the school's legal pages.
const FOOT_LINKS = [['Terms', legal[0].href], ['Privacy', legal[1].href], ['Refund policy', legal[2].href]]
const KIND_TONE = { Required: 'primary', Bonus: 'success', 'Pre-order': 'accent' }

// "← Halvera": the way out of checkout, back to the site.
export function BackLink() {
  return (
    <a href="/" className="co-back">
      <Icon name="arrow-left" size={18} className="co-back-arrow" />
      <LogoMark size={22} className="co-back-leaf" />
      <span className="co-back-name">{school.name}</span>
    </a>
  )
}

// Small print under the order: secure checkout and the legal links.
// children: extra small print (the preview's "Copy abandoned-checkout link").
export function CheckoutFooter({ className = '', children }) {
  return (
    <footer className={`co-foot t-caption ${className}`}>
      <span className="co-foot-secure"><Icon name="lock" size={14} />Secure checkout</span>
      <nav aria-label="Legal" className="co-foot-links">
        {FOOT_LINKS.map(([text, href]) => <a key={href} href={href}>{text}</a>)}
      </nav>
      {children}
    </footer>
  )
}

// The promotion code field, always shown while no code is applied. Its own small form, so Enter
// applies the code. The code stays in the field when it's refused, so the buyer can fix a typo.
//   onApply(code) → an error message, or null when the code was applied.
function PromoField({ error, onApply, onClear, inputRef, label = 'Promotion code' }) {
  const [code, setCode] = useState('')
  const submit = (e) => {
    e.preventDefault()
    const value = code.trim()
    if (!value) { inputRef.current?.focus(); return }
    if (!onApply(value)) setCode('')
    else inputRef.current?.focus()
  }
  return (
    <form className="co-promo" noValidate onSubmit={submit} aria-label="Promotion code">
      <div className="sg-coupon-row">
        <TextField
          ref={inputRef} label={label} value={code} error={error || undefined}
          autoComplete="off" autoCapitalize="characters" spellCheck={false} enterKeyHint="go"
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === 'Escape' && error) { e.preventDefault(); onClear() } }}
        />
        <Button type="submit" variant="secondary">Apply</Button>
      </div>
    </form>
  )
}

// The order panel (left, on the brand-tinted ground): what you're buying, the amount due today
// in the display face, the lines, an inline promotion code and the totals.
// On small screens the lines and totals fold behind "Show order summary".
//   promo: { error, onApply, onRemove, onCancel? (clears the error) } or null when coupons don't apply (free orders,
//     thank-you). onApply(code) returns an error message, or null once the code is applied.
//   extras: aligned with q.lines; each { sub, note, below } or null. sub sits after the line's detail
//     (the "Change" toggle), note is its own row ("Includes …"), below spans the line (price options).
//   detailsOpen / onDetailsOpen: optionally control "Show order summary" (so a step can open it).
//   top: shown right under the back link (the "How you pay" price picker for one-product checkouts).
//   footer: extra small print for the footer.
export default function SummaryPanel({
  q, label, labelAs = 'h1', status, amount, notes = [], promo, totalLabel = 'Total due today',
  extras = [], detailsOpen, onDetailsOpen, top, footer,
}) {
  const [ownOpen, setOwnOpen] = useState(false)
  const open = detailsOpen ?? ownOpen
  const setOpen = onDetailsOpen || setOwnOpen
  const [promoStatus, setPromoStatus] = useState('')
  const promoInputRef = useRef(null)
  const Label = labelAs
  // Typed codes: up to MAX_CODES when they combine. The automatic discount sits beside them and needs no code.
  const codeCount = q.discounts.filter((d) => !d.automatic).length

  const apply = (code) => {
    const error = promo.onApply(code)
    if (!error) setPromoStatus(`${code} applied.`)
    return error
  }
  const remove = (code) => {
    promo.onRemove(code)
    setPromoStatus(`${code} removed.`)
    requestAnimationFrame(() => promoInputRef.current?.focus())
  }

  return (
    <div className={`co-order${open ? ' is-open' : ''}`}>
      <BackLink />
      {top}

      <div className="co-hero">
        <Label className="co-label">{label}{status}</Label>
        <p className="co-amount">{amount}</p>
        {notes.map((n) => <p key={n} className="co-amount-note t-body-sm t-muted">{n}</p>)}
      </div>

      <button
        type="button" className="co-details-toggle" aria-expanded={open} aria-controls="co-details"
        onClick={() => setOpen(!open)}
      >
        {open ? 'Hide order summary' : 'Show order summary'}
        <Icon name="chevron-down" size={18} className="co-details-chev" />
      </button>

      <div className="co-details" id="co-details">
        <h2 className="sg-sr">Order summary</h2>
        <ul className="co-lines">
          {q.lines.map((l, i) => {
            const x = extras[i] || {}
            return (
              <li key={`${l.name}-${i}`} className="co-line">
                <span className="co-line-main">
                  <span className="co-line-name">
                    {l.name}
                    {l.kind && <Badge tone={KIND_TONE[l.kind] || 'neutral'}>{l.kind}</Badge>}
                  </span>
                  {(l.detail || x.sub) && (
                    <span className="co-line-sub">
                      {l.detail && <span className="co-line-detail t-body-sm t-muted">{l.detail}</span>}
                      {x.sub}
                    </span>
                  )}
                  {x.note}
                </span>
                <span className="co-line-amount">{l.amount}</span>
                {x.below && <div className="co-line-below">{x.below}</div>}
              </li>
            )
          })}
        </ul>

        {promo && codeCount < MAX_CODES && (
          <PromoField
            error={promo.error} onApply={apply} onClear={() => promo.onCancel?.()} inputRef={promoInputRef}
            label={codeCount ? 'Add another code' : 'Promotion code'}
          />
        )}

        <dl className="co-totals">
          <dt>Subtotal</dt><dd>{q.subtotal}</dd>
          {q.discounts.map((d) => (
            <Fragment key={d.code}>
              <dt className="co-discount">
                {d.automatic ? <span>{d.code} <span className="co-tax-note">· applied automatically</span></span> : <span className="sg-code">{d.code}</span>}
                {promo && !d.automatic && (
                  <button type="button" className="sg-linkbtn" onClick={() => remove(d.code)}>
                    Remove<span className="sg-sr"> {d.code}</span>
                  </button>
                )}
              </dt>
              <dd className="co-saving">−{d.saving}</dd>
            </Fragment>
          ))}
          <dt>Tax <span className="co-tax-note">· {q.taxLabel || 'VAT'}, included in prices</span></dt><dd>{q.tax}</dd>
          {q.afterTrial && <><dt>Total after trial</dt><dd>{q.afterTrial}</dd></>}
          <dt className="co-total">{totalLabel}</dt><dd className="co-total">{q.total}</dd>
        </dl>

        {q.then.length > 1 && (
          <div className="co-then">
            <p className="co-then-title t-body-sm t-strong"><Icon name="calendar" size={16} />After today</p>
            <ul className="t-body-sm t-muted">
              {q.then.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        )}
      </div>

      {promo && <p className="sg-sr" role="status">{promoStatus}</p>}
      <CheckoutFooter className="co-foot-order">{footer}</CheckoutFooter>
    </div>
  )
}
