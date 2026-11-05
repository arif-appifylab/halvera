// Checkout settings and copy (Settings → Checkout, Sell → Offers). Display strings only;
// prices and totals always come from quote() in src/lib/commerce.js.

export const signedInEmail = 'adnan@example.com'

// The order number the mock server hands back; bank transfers use it as the payment reference.
export const orderNumber = 'HH-10511'

// Card number the mock processor declines (Stripe-style test number).
export const declinedCard = '4000000000000002'

export const countries = [
  'United Kingdom', 'Ireland', 'United States', 'Canada', 'Australia', 'New Zealand',
  'Germany', 'France', 'Netherlands', 'Spain', 'Sweden', 'Bangladesh', 'India',
  'Pakistan', 'United Arab Emirates', 'Saudi Arabia', 'South Africa', 'Other',
]

// Settings → Checkout → Payment methods → Bank transfer (manual).
export const bankTransfer = {
  accountName: 'Halvera Ltd',
  bank: 'Example Bank',
  sortCode: '00-00-00',
  account: '00000000',
  iban: 'GB00 EXMP 0000 0000 0000 00',
  confirmTime: 'usually within 1–2 working days',
}

// Product agreements (Settings → Checkout → Agreements), keyed by product type.
export const productAgreements = {
  coaching: 'I understand this doesn’t replace medical care',
  event: 'I understand this doesn’t replace medical care',
}

// Sell → Offers → Upsell, shown once after a paid checkout.
export const upsell = {
  title: 'Add 1:1 follow-up for $65',
  text: 'A 30-minute video call with a practitioner to talk through how you’re getting on. Book any time in the next three months.',
  added: 'We’ve added your 1:1 follow-up and charged $65 to the same payment method. We’ll email you a link to choose a time.',
}

export const couponNotApplicable = 'This code doesn’t apply to anything in your order.'

// Emails that already have an account at the school. Checkout asks for the email first; the server answers
// whether it has an account (then the buyer logs in) or not (then they create one). In the preview, these
// addresses have accounts; any other is new.
export const knownAccounts = [
  { email: 'adnan@example.com', name: 'Adnan Rahman' },
  { email: 'karim@example.com', name: 'Karim Hossain' },
]
export const accountFor = (email) => knownAccounts.find((a) => a.email === String(email || '').trim().toLowerCase()) || null
