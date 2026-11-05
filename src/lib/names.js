// Forms ask for a first name and a last name; the account keeps one name ("First Last").
export function splitName(name = '') {
  const [firstName = '', ...rest] = String(name).trim().split(/\s+/).filter(Boolean)
  return { firstName, lastName: rest.join(' ') }
}

export const joinName = (firstName, lastName) => [firstName, lastName].map((x) => String(x || '').trim()).filter(Boolean).join(' ')
