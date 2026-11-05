// Checks for the registrant form (admin field types). Returns { [fieldId]: message }.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CHOICE = ['select', 'radio-group']
const MULTI = ['checkbox-group', 'multiselect']

export const isEmail = (v) => EMAIL_RE.test(String(v || '').trim())

const empty = (v) => v == null || v === false || (Array.isArray(v) && !v.length) || (typeof v === 'string' && !v.trim())

export function validateIntake(fields, answers) {
  const e = {}
  fields.forEach((f) => {
    const v = answers[f.id]
    if (f.required && empty(v)) {
      e[f.id] = CHOICE.includes(f.type) ? 'Choose an answer'
        : MULTI.includes(f.type) ? 'Choose at least one'
          : f.type === 'checkbox' ? 'Tick this box to continue'
            : f.type === 'address' ? 'Enter your postal address'
              : 'Answer this question'
      return
    }
    if (empty(v)) return
    const s = typeof v === 'string' ? v.trim() : v
    if (f.type === 'phone' && !/^[+\d][\d\s()-]{6,}$/.test(s)) e[f.id] = 'Enter a phone number like +44 7700 900123'
    if (f.type === 'email' && !isEmail(s)) e[f.id] = 'Enter an email address like name@example.com'
    if (f.type === 'multi-email' && s.split(/[,;\s]+/).filter(Boolean).some((x) => !isEmail(x))) e[f.id] = 'Check each address. Separate them with commas'
    if (f.type === 'url' && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(s)) e[f.id] = 'Enter a link like https://example.com/results'
    if (f.type === 'number') {
      const n = Number(s)
      if (!Number.isFinite(n)) e[f.id] = 'Enter a number'
      else if ((f.min != null && n < f.min) || (f.max != null && n > f.max)) e[f.id] = `Enter a number from ${f.min} to ${f.max}`
    }
  })
  return e
}
