import { Checkbox, Button, Icon } from '@/design-system'

// The end of the pay panel: save details (optional), the required service agreement, any product
// agreement, optional marketing consent (never pre-ticked), the authorisation note for later
// payments, then the one primary button.
export default function AgreementsStep({ agreement, form, set, errors, buttonLabel, processing, note, authorisation, canSave, blocked }) {
  const check = (key) => ({ checked: form[key], onChange: (e) => set(key, e.target.checked), error: errors[key] })
  return (
    <div className="co-confirm" id="co-confirm">
      <div className="co-checks">
        {canSave && (
          <Checkbox
            label="Save my details for next time"
            description="Optional. Pay faster at Halvera. We never store your full card number."
            checked={form.saveDetails} onChange={(e) => set('saveDetails', e.target.checked)}
          />
        )}
        <Checkbox
          label={<span>I agree to the <a href="/terms-of-use" target="_blank" rel="noreferrer">Terms of use</a> and <a href="/refund-policy" target="_blank" rel="noreferrer">Refund policy</a></span>}
          {...check('terms')}
        />
        {agreement && (
          <Checkbox
            label={agreement}
            {...check('agreement')}
          />
        )}
        <Checkbox
          label="Email me about new programmes and offers"
          description="Optional. Occasional emails, and you can unsubscribe any time."
          checked={form.marketing} onChange={(e) => set('marketing', e.target.checked)}
        />
      </div>

      {authorisation && <p className="co-auth t-body-sm t-muted">{authorisation}</p>}

      <div className="co-pay">
        <Button type="submit" size="lg" block loading={processing} disabled={Boolean(blocked)} aria-describedby={blocked ? 'co-blocked' : undefined}>{processing ? 'Processing…' : buttonLabel}</Button>
        {blocked && <p id="co-blocked" className="t-body-sm co-pay-note">{blocked}</p>}
        {note && <p className="t-body-sm t-muted co-pay-note">{note}</p>}
        <p className="co-secure t-caption t-muted">
          <Icon name="lock" size={14} />
          <span>Secure payment · Powered by EzyCourse</span>
        </p>
      </div>
    </div>
  )
}
