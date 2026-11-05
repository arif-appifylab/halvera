import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, StateNotice } from '@/design-system'
import { useCart } from '@/app/cart.jsx'
import { getCheckoutSession, isResumable, markRecovered, resumeHref } from '@/lib/checkout-session.js'
import { BackLink, CheckoutFooter } from '@/components/checkout/SummaryPanel.jsx'
import './checkout.css'

// /checkout/recover/<token>: the link in the abandoned-checkout email. Puts back that exact
// checkout (items, chosen prices, coupon, name and email) and continues it at
// /checkout/cart?session=<token> or the single-product checkout. See docs/cart-sessions.md.

const ENDED = {
  completed: {
    reason: 'This checkout was completed',
    detail: 'This order has already been placed, so there’s nothing left to pay. Your programmes are in your dashboard.',
  },
  expired: {
    reason: 'This link has expired',
    detail: 'Checkout links work for 30 days. Prices and places may have changed since, so start again from the programme you’d like.',
  },
}

export default function CheckoutRecover() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const cart = useCart()
  const [session] = useState(() => getCheckoutSession(token))
  const resumable = isResumable(session)
  const done = useRef(false)

  useEffect(() => {
    if (!resumable || done.current) return
    done.current = true
    if (session.kind === 'cart') {
      cart.restore(session.items, { token: session.cartToken, checkoutToken: session.token, email: session.email })
    }
    markRecovered(session.token)
    navigate(resumeHref(session), { replace: true })
  }, [resumable, session, cart, navigate])

  if (resumable) {
    return (
      <div className="co-shell co-shell-center">
        <div className="co-center">
          <BackLink />
          <h1 className="t-heading-3">Picking up your checkout</h1>
          <p className="t-body t-muted" role="status">One moment while we put your order back together.</p>
        </div>
      </div>
    )
  }

  // Unknown tokens read as expired: links only stay on our side for so long.
  const ended = ENDED[session?.status === 'completed' ? 'completed' : 'expired']
  return (
    <div className="co-shell co-shell-center">
      <div className="co-center">
        <BackLink />
        <h1 className="sg-sr">Checkout</h1>
        <StateNotice
          reason={ended.reason}
          detail={ended.detail}
          actions={<>
            <Button href={cart.items.length ? '/checkout/cart' : '/courses'}>Start again</Button>
            {session?.status === 'completed'
              ? <Button href="/student/dashboard" variant="ghost">Go to your dashboard</Button>
              : <Button href="/contact-us" variant="ghost">Contact us</Button>}
          </>}
        />
        <CheckoutFooter />
      </div>
    </div>
  )
}
