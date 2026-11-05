import { TextField, Notice, Icon } from '@/design-system'
import { bankTransfer, orderNumber } from '@/data/checkout.js'
import StepCard from './StepCard.jsx'
import { METHODS } from './methods.js'
import './payment.css'

// The card number, expiry and CVC as one grouped control: three inputs sharing borders.
function CardGroup({ field }) {
  const parts = [
    { key: 'cardNumber', label: 'Card number', autoComplete: 'cc-number', placeholder: '1234 1234 1234 1234' },
    { key: 'cardExpiry', label: 'Expiry date, month and year', autoComplete: 'cc-exp', placeholder: 'MM / YY' },
    { key: 'cardCvc', label: 'Security code, the 3 digits on the back', autoComplete: 'cc-csc', placeholder: 'CVC' },
  ].map((p) => ({ ...p, ...field(p.key) }))
  const errors = parts.filter((p) => p.error)

  const input = ({ key, label, autoComplete, placeholder, value, onChange, error }) => (
    <input
      key={key} id={`co-${key}`} className="co-cardgroup-input" type="text" inputMode="numeric" dir="ltr"
      aria-label={label} autoComplete={autoComplete} placeholder={placeholder}
      value={value} onChange={onChange}
      aria-invalid={error ? true : undefined} aria-describedby={error ? `co-${key}-msg` : undefined}
    />
  )

  return (
    <div className="co-cardgroup-field">
      <span className="sg-label" id="co-card-label">Card information</span>
      <div className={`co-cardgroup${errors.length ? ' has-error' : ''}`} role="group" aria-labelledby="co-card-label">
        <div className="co-cardgroup-row">
          {input(parts[0])}
          <Icon name="card" size={20} className="co-cardgroup-icon" />
        </div>
        <div className="co-cardgroup-row co-cardgroup-split">
          {input(parts[1])}
          {input(parts[2])}
        </div>
      </div>
      {errors.map((p) => (
        <p key={p.key} className="sg-field-msg sg-field-error" id={`co-${p.key}-msg`}><Icon name="alert" size={16} />{p.error}</p>
      ))}
    </div>
  )
}

function MethodBody({ method, field }) {
  if (method === 'card') {
    return (
      <>
        <CardGroup field={field} />
        <TextField
          label="Name on card" optional autoComplete="cc-name"
          hint="Leave it blank if it’s the same as the name on your account." {...field('cardName')}
        />
      </>
    )
  }
  if (method === 'bank') {
    return (
      <div className="co-bank">
        <p className="t-body-sm">
          After you place your order, send the total to this account. Use the reference so we can match your payment.
        </p>
        <dl className="pg-facts">
          <dt>Reference</dt><dd><span className="sg-code">{orderNumber}</span></dd>
          <dt>Account name</dt><dd>{bankTransfer.accountName}</dd>
          <dt>Bank</dt><dd>{bankTransfer.bank}</dd>
          <dt>Sort code</dt><dd>{bankTransfer.sortCode}</dd>
          <dt>Account number</dt><dd>{bankTransfer.account}</dd>
          <dt>IBAN</dt><dd>{bankTransfer.iban}</dd>
        </dl>
        <p className="t-body-sm t-muted">
          We’ll email these details too. Your order stays Pending until we confirm your transfer, {bankTransfer.confirmTime}.
          You can upload proof of payment from your dashboard to speed things up.
        </p>
      </div>
    )
  }
  if (method === 'apple-pay' || method === 'google-pay') {
    return <p className="t-body-sm t-muted">When you pay, {METHODS[method].title} opens to confirm. Nothing else to fill in.</p>
  }
  if (method === 'paypal') return <p className="t-body-sm t-muted">When you continue, a PayPal window opens to confirm the payment.</p>
  if (method === 'klarna') return <p className="t-body-sm t-muted">When you continue, Klarna shows the ways you can pay and the payment dates before you confirm.</p>
  return null
}

// The payment methods: an accordion-style radio group. The chosen method opens below its row (the card
// method opens the card field). Also used on the appointment booking page.
//   field(key) → { value, onChange, error } for cardNumber, cardExpiry, cardCvc, cardName.
export function PaymentMethods({ methods, method, onMethod, field, label = 'Payment method' }) {
  return (
    <fieldset className="co-methods">
      <legend className="sg-sr">{label}</legend>
      {methods.map((m) => {
        const open = method === m
        return (
          <div key={m} className={`co-method${open ? ' is-open' : ''}`}>
            <label className="co-method-head">
              <input
                type="radio" className="co-method-input" name="payment-method" value={m}
                checked={open} onChange={() => onMethod(m)}
              />
              <span className="co-method-dot" aria-hidden="true" />
              <span className="co-method-title">{METHODS[m].title}</span>
              <Icon name={METHODS[m].icon} size={20} className="co-method-icon" />
            </label>
            {open && (
              <div className="co-method-body">
                <p className="t-body-sm t-muted">{METHODS[m].description}</p>
                <MethodBody method={m} field={field} />
              </div>
            )}
          </div>
        )
      })}
    </fieldset>
  )
}

// Checkout's payment step: the methods, with the trial note.
export default function PaymentStep({ methods, method, onMethod, field, trial }) {
  return (
    <StepCard id="co-payment" title="Payment method">
      {trial && (
        <Notice tone="info" title="You won’t be charged for the trial">
          We’ll remind you 2 days before it ends. Cancel from your dashboard any time before then.
        </Notice>
      )}
      <PaymentMethods methods={methods} method={method} onMethod={onMethod} field={field} />
    </StepCard>
  )
}
