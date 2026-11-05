import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, EmptyState, Icon, IconButton, Notice } from '@/design-system'
import { useCart } from '@/app/cart.jsx'
import { useViewer } from '@/app/viewer.jsx'
import { quote, resolveItem } from '@/lib/commerce.js'
import { siteAccess } from '@/lib/access.js'
import { cartCheckoutHref } from '@/lib/checkout-session.js'
import QuantityStepper from '@/components/QuantityStepper.jsx'
import { school } from '@/data/school.js'
import './mini-cart.css'

// The floating mini cart: a cart bubble with the item count that can be dragged anywhere
// (it snaps to the nearest side and remembers where it was), and a short popup anchored to it,
// or to the control that opened it. Just the items and the way to the cart and checkout; totals
// live at checkout. The bubble shows whenever the cart has something in it, except on the cart
// page, at checkout and in the course player.

const POS_KEY = 'halvera-mini-cart'
const HOME = { side: 'end', y: 1 } // inline-end, bottom
const NUDGE = 0.05
const DRAG_FROM = 6 // px before a press becomes a drag
const GAP = 8

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))
const readPos = () => {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY))
    if (p && (p.side === 'start' || p.side === 'end') && Number.isFinite(p.y)) return { side: p.side, y: clamp(p.y, 0, 1) }
  } catch { /* storage unavailable */ }
  return HOME
}
const savePos = (p) => {
  try { localStorage.setItem(POS_KEY, JSON.stringify(p)) } catch { /* storage unavailable */ }
}
const isRtl = () => document.documentElement.dir === 'rtl'
// A physical side of the screen → the logical side the bubble sits on.
const logicalSide = (physicalRight) => (physicalRight !== isRtl() ? 'end' : 'start')
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const plural = (n) => `${n} ${n === 1 ? 'item' : 'items'}`

export default function MiniCart() {
  const cart = useCart()
  const { pathname } = useLocation()
  const [pos, setPos] = useState(readPos)
  const [dragging, setDragging] = useState(false)
  const bubbleRef = useRef(null)
  const trackRef = useRef(null)
  const drag = useRef(null)
  const flipFrom = useRef(null)
  const skipClick = useRef(false)
  const hintId = useId()
  const popId = useId()

  const count = cart.count
  // Never over the cart page, the checkout or the course player.
  const hiddenHere = /^\/cart\/?$/.test(pathname) || /^\/checkout(\/|$)/.test(pathname) || /^\/course\/[^/]+\/learn\//.test(pathname)
  const showBubble = school.features.cart && count > 0 && !hiddenHere
  const { open, closeCart } = cart

  // A new page closes the popup.
  const lastPath = useRef(pathname)
  useEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    closeCart()
  }, [pathname, closeCart])

  const place = (next) => {
    setPos(next)
    savePos(next)
  }

  // After a drop, slide from where it was let go to the side it snapped to.
  useLayoutEffect(() => {
    const el = bubbleRef.current
    const from = flipFrom.current
    flipFrom.current = null
    if (!el || !from || reducedMotion()) return
    const to = el.getBoundingClientRect()
    el.style.transition = 'none'
    el.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`
    void el.offsetWidth
    el.style.transition = ''
    el.style.transform = ''
  }, [pos])

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    const r = bubbleRef.current.getBoundingClientRect()
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, r, dx: 0, dy: 0, moved: false }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_FROM) return
      d.moved = true
      setDragging(true)
      if (open) closeCart()
    }
    const t = trackRef.current.getBoundingClientRect()
    d.dx = clamp(d.r.left + dx, t.left, t.right - d.r.width) - d.r.left
    d.dy = clamp(d.r.top + dy, t.top, t.bottom - d.r.height) - d.r.top
    bubbleRef.current.style.transition = 'none'
    bubbleRef.current.style.transform = `translate(${d.dx}px, ${d.dy}px)`
  }

  const endDrag = (e, cancelled) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (!d.moved) return
    skipClick.current = !cancelled
    setDragging(false)
    const el = bubbleRef.current
    const t = trackRef.current.getBoundingClientRect()
    const left = d.r.left + d.dx
    const top = d.r.top + d.dy
    el.style.transition = ''
    el.style.transform = ''
    flipFrom.current = { left, top }
    const room = t.height - d.r.height
    place({ side: logicalSide(left + d.r.width / 2 > t.left + t.width / 2), y: room > 0 ? clamp((top - t.top) / room, 0, 1) : 1 })
  }

  const onKeyDown = (e) => {
    const keys = {
      ArrowUp: () => ({ ...pos, y: clamp(pos.y - NUDGE, 0, 1) }),
      ArrowDown: () => ({ ...pos, y: clamp(pos.y + NUDGE, 0, 1) }),
      ArrowLeft: () => ({ ...pos, side: logicalSide(false) }),
      ArrowRight: () => ({ ...pos, side: logicalSide(true) }),
      Home: () => HOME,
    }
    if (!keys[e.key]) return
    e.preventDefault()
    if (open) closeCart()
    place(keys[e.key]())
  }

  const onClick = (e) => {
    if (skipClick.current) { skipClick.current = false; return }
    if (open && (!cart.anchor || cart.anchor === bubbleRef.current)) closeCart()
    else cart.openCart(e)
  }

  return (
    <>
      {showBubble && (
        <div className="mc-track" ref={trackRef}>
          <button
            ref={bubbleRef} type="button"
            className={`mc-bubble${dragging ? ' is-dragging' : ''}`}
            data-side={pos.side} style={{ '--mc-y': pos.y }}
            aria-label={`Your cart, ${plural(count)}`} aria-describedby={hintId}
            aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? popId : undefined}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove}
            onPointerUp={(e) => endDrag(e, false)} onPointerCancel={(e) => endDrag(e, true)}
            onKeyDown={onKeyDown} onClick={onClick}
          >
            <Icon name="cart" size={24} />
            <span className="mc-count" aria-hidden="true">{count}</span>
          </button>
          <span id={hintId} className="sg-sr">Drag it, or use the arrow keys, to move it. Home puts it back.</span>
        </div>
      )}
      {open && <MiniCartPopup id={popId} bubble={showBubble ? bubbleRef : null} />}
    </>
  )
}

// Where the popup goes: beside its anchor, on the anchor's side of the screen, opening
// towards the larger space (below the header icon, above a bubble near the bottom).
function placement(anchor) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const r = anchor?.getBoundingClientRect()
  if (!r || !r.width) {
    const top = document.querySelector('.sg-header')?.getBoundingClientRect().bottom || 0
    return { insetInlineEnd: 16, insetBlockStart: top + GAP, maxBlockSize: vh - top - GAP * 3 }
  }
  const right = r.left + r.width / 2 > vw / 2
  const fromEdge = Math.max(GAP, right ? vw - r.right : r.left)
  const style = { [logicalSide(right) === 'end' ? 'insetInlineEnd' : 'insetInlineStart']: fromEdge }
  if (r.top + r.height / 2 < vh / 2) {
    style.insetBlockStart = r.bottom + GAP
    style.maxBlockSize = vh - r.bottom - GAP * 3
  } else {
    style.insetBlockEnd = vh - r.top + GAP
    style.maxBlockSize = r.top - GAP * 3
  }
  return style
}

// What the popup sits next to: the control that opened it, else the bubble, else the header cart icon.
const findAnchor = (anchor, bubble) => (anchor?.isConnected ? anchor
  : bubble?.current || document.querySelector('.sg-header button[aria-label^="Cart"]'))

function MiniCartPopup({ id, bubble }) {
  const cart = useCart()
  const { viewer } = useViewer()
  const popRef = useRef(null)
  const titleId = useId()
  const [style, setStyle] = useState(null)
  const { anchor, closeCart } = cart
  const count = cart.count
  const anchorEl = () => findAnchor(anchor, bubble)

  useLayoutEffect(() => {
    const update = () => setStyle(placement(findAnchor(anchor, bubble)))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [anchor, bubble, count])

  // Focus moves in when it opens.
  useEffect(() => { popRef.current?.focus({ preventScroll: true }) }, [])

  // Escape and clicks outside close it; Escape sends focus back to what opened it.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      closeCart()
      findAnchor(anchor, bubble)?.focus?.({ preventScroll: true })
    }
    const onDown = (e) => {
      if (popRef.current?.contains(e.target) || findAnchor(anchor, bubble)?.contains(e.target)) return
      closeCart()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [anchor, bubble, closeCart])

  const q = cart.items.length ? quote(cart.items, viewer) : null
  const offset = q?.siteAccessAdded ? 1 : 0
  // Pick up the checkout already started for this cart (coupon, email), if it's still open.
  const checkoutHref = cartCheckoutHref(cart.checkoutToken)
  const close = () => cart.closeCart()

  return (
    <div
      ref={popRef} id={id} className="mc-pop" role="dialog" aria-labelledby={titleId} tabIndex={-1}
      style={style || { visibility: 'hidden' }}
    >
      <div className="mc-head">
        <div>
          <h2 id={titleId} className="t-heading-4">Your cart</h2>
          {count > 0 && <p className="t-body-sm t-muted">{plural(count)}</p>}
        </div>
        <IconButton icon="x" label="Close cart" size="sm" onClick={() => { close(); anchorEl()?.focus?.() }} />
      </div>

      <div className="mc-body">
        {cart.notice && <Notice tone="info">{cart.notice}</Notice>}
        {!q ? (
          <EmptyState icon="cart" title="Your cart is empty" action={<Button variant="secondary" href="/courses" onClick={close}>Explore programmes</Button>}>
            Programmes, workshop tickets and downloads you add will show here.
          </EmptyState>
        ) : (
          <>
            <ul className="mc-list">
              {cart.items.map((item, i) => {
                const r = resolveItem(item)
                const image = r.product?.image || r.image
                return (
                  <li key={item.productId} className="mc-item">
                    {image
                      ? <img className="mc-thumb" src={image} alt="" loading="lazy" />
                      : <span className="mc-thumb mc-thumb-icon" aria-hidden="true"><Icon name="leaf" size={20} /></span>}
                    <span className="mc-name">
                      <span className="t-body-sm t-strong">{r.title}</span>
                      {r.maxQuantity > 1 && (
                        <QuantityStepper
                          name={r.title} value={r.quantity} max={r.maxQuantity}
                          onChange={(n) => cart.setQuantity(item.productId, n)}
                        />
                      )}
                      <button type="button" className="sg-linkbtn mc-remove" onClick={() => cart.remove(item.productId)}>
                        Remove<span className="sg-sr"> {r.title}</span>
                      </button>
                    </span>
                    <span className="mc-price">{q.lines[i + offset]?.amount}</span>
                  </li>
                )
              })}
            </ul>
            {q.siteAccessAdded && (
              <p className="mc-note t-caption t-muted">
                <Icon name="info" size={16} />
                {siteAccess.name} is added at checkout, in one payment with your order.
              </p>
            )}
          </>
        )}
      </div>

      {q && (
        <div className="mc-foot">
          <Button variant="secondary" href="/cart" onClick={close}>View cart</Button>
          <Button href={checkoutHref} onClick={close}>Checkout</Button>
        </div>
      )}
    </div>
  )
}
