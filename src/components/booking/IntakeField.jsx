// One registrant-form question, for every field type the admin offers.
import { cx, Checkbox, Icon, RadioCard, Select, TextField } from '@/design-system'

function Group({ field, error, children, className }) {
  return (
    <fieldset className={cx('bk-fieldset', error && 'has-error')}>
      <legend className="sg-label">{field.label}{!field.required && <span className="sg-optional"> (optional)</span>}</legend>
      {field.hint && <p className="sg-field-msg">{field.hint}</p>}
      <div className={className}>{children}</div>
      {error && <p className="sg-field-msg sg-field-error"><Icon name="alert" size={16} />{error}</p>}
    </fieldset>
  )
}

export default function IntakeField({ field, value, error, onChange }) {
  const optional = !field.required
  const text = (extra) => (
    <TextField label={field.label} hint={field.hint} optional={optional} value={value || ''} onChange={(e) => onChange(e.target.value)} error={error} {...extra} />
  )
  const toggle = (o) => {
    const cur = value || []
    onChange(cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o])
  }

  switch (field.type) {
    case 'long-text': return text({ multiline: true, rows: 4 })
    case 'address': return text({ multiline: true, rows: 3, autoComplete: 'street-address' })
    case 'email': return text({ type: 'email', autoComplete: 'off', inputMode: 'email' })
    case 'multi-email': return text({ type: 'text', inputMode: 'email', autoComplete: 'off', placeholder: 'name@example.com, other@example.com' })
    case 'phone': return text({ type: 'tel', autoComplete: 'tel', inputMode: 'tel' })
    case 'number': return text({ type: 'number', inputMode: 'numeric', min: field.min, max: field.max, className: 'bk-number' })
    case 'url': return text({ type: 'url', inputMode: 'url', placeholder: 'https://' })
    case 'select':
      return <Select label={field.label} hint={field.hint} optional={optional} options={field.options} placeholder="Choose one" value={value || ''} onChange={(e) => onChange(e.target.value)} error={error} />
    case 'multiselect':
      return (
        <Group field={field} error={error} className="bk-chips">
          {field.options.map((o) => {
            const on = (value || []).includes(o)
            return (
              <button key={o} type="button" aria-pressed={on} className={cx('bk-chip', on && 'is-on')} onClick={() => toggle(o)}>
                {on && <Icon name="check" size={16} />}{o}
              </button>
            )
          })}
        </Group>
      )
    case 'checkbox-group':
      return (
        <Group field={field} error={error} className="bk-checks">
          {field.options.map((o) => <Checkbox key={o} label={o} checked={(value || []).includes(o)} onChange={() => toggle(o)} />)}
        </Group>
      )
    case 'radio-group':
      return (
        <Group field={field} error={error} className="bk-radios">
          {field.options.map((o) => <RadioCard key={o} name={field.id} value={o} checked={value === o} onChange={() => onChange(o)} title={o} />)}
        </Group>
      )
    case 'checkbox':
      return (
        <Checkbox
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          error={error}
          label={field.label}
          description={field.hint || (optional ? 'Optional' : undefined)}
        />
      )
    default: return text({})
  }
}
