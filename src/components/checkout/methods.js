// Payment methods (Settings → Checkout → Payment methods).
export const METHODS = {
  card: { title: 'Card', description: 'Visa, Mastercard and American Express.', icon: 'card' },
  // Wallets are their own options (no "Wallet" step first). They come through the card gateway (Stripe),
  // which says which ones this device and browser can use; only those are listed.
  'apple-pay': { title: 'Apple Pay', description: 'Confirm with Face ID, Touch ID or your passcode.', icon: 'card' },
  'google-pay': { title: 'Google Pay', description: 'Pay with a card saved in your Google account.', icon: 'card' },
  paypal: { title: 'PayPal', description: 'You’ll confirm on PayPal, then come back here.', icon: 'globe' },
  bank: { title: 'Bank transfer', description: 'Pay from your bank. Your access opens once we confirm it.', icon: 'home' },
  klarna: { title: 'Klarna', description: 'Pay later or in instalments. Klarna shows the plans you can use.', icon: 'calendar' },
}

// Which methods this order can use. Buy now pay later is for one-time prices only;
// a trial needs a card or PayPal on file, so bank transfer is off.
export function availableMethods({ oneTimeOrder, trial }) {
  return ['card', ...deviceWallets(), 'paypal', !trial && 'bank', oneTimeOrder && 'klarna'].filter(Boolean)
}

// The wallets this device can use. The live page asks the gateway (Stripe's canMakePayment); the preview lists
// both so they can be tried.
export const deviceWallets = () => ['apple-pay', 'google-pay']
