import { createContext, useContext, useMemo, useState } from 'react'
import { readCart, writeCart, newCart, emptyCart, cartStatus } from '@/lib/checkout-session.js'
import { allowsQuantity, quantityOf, isKnownItem, MAX_QUANTITY } from '@/lib/commerce.js'

// The cart session: a token (c_…) made on the first add, the items (which product and which of
// its prices), the buyer's email once checkout knows it, timestamps and a status
// (active → checkout_started → completed, or abandoned). Amounts and totals come from quote()
// in src/lib/commerce.js, which stands in for the server. See docs/cart-sessions.md.
//
// Items are { productId, priceId, amount?, dates?, quantity? }. quantity (1–10) is only kept for
// library items at a one-time price (quantityOf() in src/lib/commerce.js); older carts without it read as 1.
//
// useCart() → { items, count, token, email, status, checkoutToken, open, anchor, notice,
//   add(item, { solo }), setQuantity(productId, n), remove(productId), clear(), openCart(event?), closeCart(),
//   startCheckout(checkoutToken, email), complete(), restore(items, { token, checkoutToken, email }) }

const CartContext = createContext(null)

// A saved cart keeps only what the school still sells (see isKnownItem in src/lib/commerce.js).
const clean = (c) => (c && c.items.some((i) => !isKnownItem(i)) ? { ...c, items: c.items.filter(isKnownItem) } : c)

// A fresh preview starts with one paid library folder in the cart (src/data/library.js).
const initial = () => {
  const saved = readCart()
  const cart = clean(saved)
  if (cart && cart !== saved) writeCart(cart)
  return cart || newCart([{ productId: 'library:folder:cooking-demos', priceId: 'once' }])
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(initial)
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState(null) // the control that opened the mini cart
  const [notice, setNotice] = useState(null)

  const value = useMemo(() => {
    const save = (next) => {
      const stamped = { ...next, updatedAt: Date.now() }
      setCart(stamped)
      writeCart(stamped)
    }
    // A completed (or missing) cart starts a new session on the next add.
    const live = () => (cart.token && cart.status !== 'completed' ? cart : newCart())
    return {
      items: cart.items,
      // How many things are in the cart, counting each copy.
      count: cart.items.reduce((n, i) => n + quantityOf(i), 0),
      token: cart.token,
      email: cart.email,
      status: cartStatus(cart),
      checkoutToken: cart.checkoutToken,
      open,
      anchor,
      notice,
      // event: the click that opened it, so the popup sits next to that control.
      openCart: (event) => {
        setAnchor(event?.currentTarget instanceof Element ? event.currentTarget : null)
        setOpen(true)
      },
      closeCart: () => { setOpen(false); setNotice(null) },
      // Products that must be bought on their own (subscriptions, memberships) replace the cart.
      // Adding a library item that's already in the cart at the same price adds a copy instead.
      add: (item, { solo } = {}) => {
        const others = cart.items.filter((i) => i.productId !== item.productId)
        if (solo && others.length) {
          setNotice('This must be bought on its own, so we went straight to checkout.')
          return false
        }
        const base = live()
        const same = base === cart && cart.items.find((i) => i.productId === item.productId && i.priceId === item.priceId)
        if (same && allowsQuantity(item)) {
          const was = quantityOf(same)
          const quantity = Math.min(MAX_QUANTITY, was + quantityOf(item))
          setNotice(quantity === was ? `You can buy up to ${MAX_QUANTITY} of each.` : null)
          save({ ...cart, items: cart.items.map((i) => (i === same ? { ...i, quantity } : i)) })
        } else {
          const rest = { ...item }
          delete rest.quantity
          const next = allowsQuantity(item) ? { ...rest, quantity: quantityOf(item) } : rest
          save({ ...base, items: [...(base === cart ? others : []), next] })
        }
        setAnchor(null)
        setOpen(true)
        return true
      },
      // Library items at a one-time price only; anything else stays at one.
      setQuantity: (productId, n) => {
        const item = cart.items.find((i) => i.productId === productId)
        if (!item || !allowsQuantity(item)) return
        const quantity = quantityOf({ ...item, quantity: n })
        if (quantity === quantityOf(item)) return
        save({ ...cart, items: cart.items.map((i) => (i === item ? { ...i, quantity } : i)) })
      },
      remove: (productId) => save({ ...cart, items: cart.items.filter((i) => i.productId !== productId) }),
      clear: () => save({ ...cart, items: [] }),
      // Checkout made a checkout session for this cart.
      startCheckout: (checkoutToken, email) => {
        if (!cart.token || cart.status === 'completed') return
        if (cart.checkoutToken === checkoutToken && cart.status === 'checkout_started' && (!email || cart.email === email)) return
        save({ ...cart, status: 'checkout_started', checkoutToken, email: email || cart.email })
      },
      // The order went through: the cart is done, and the next add starts a new one.
      complete: () => save({ ...(cart.token ? cart : newCart()), items: [], status: 'completed' }),
      // A recovery link put back the cart behind an abandoned checkout.
      restore: (items, { token, checkoutToken, email } = {}) => {
        const base = cart.token ? cart : newCart()
        save({ ...emptyCart(), ...base, token: token || base.token, items: items.filter(isKnownItem), checkoutToken: checkoutToken || null, email: email || base.email, status: 'checkout_started' })
      },
    }
  }, [cart, open, anchor, notice])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext)
