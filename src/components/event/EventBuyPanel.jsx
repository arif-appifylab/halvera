// The product page's buy panel for events (BuyPanel hands events here). One state per view and
// one primary action per state:
//   cancelled · ended (replay or "This event has ended") · registered (join / ticket) · waitlisted ·
//   membership (plan picker, or a member's event place) · registration closed · full (waitlist) ·
//   free (account or guest registration) · paid (ticket, subscription or installments)
import { useEffect, useRef, useState } from 'react'
import {
  cx, Badge, Button, Card, Checkbox, Icon, Notice, PriceTag, RadioCard, StateNotice, TextField,
} from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { useCart } from '@/app/cart.jsx'
import { school } from '@/data/school.js'
import { openHref, productHref, ownsProduct } from '@/lib/products.js'
import PlanPicker from '@/components/PlanPicker.jsx'
import { perDateQuote } from '@/lib/commerce.js'
import { localTime } from '@/components/product/time.js'
import {
  eventStatus, registrationInfo, joinState, dateLine, timeLine, whereLine, venueNote, at,
  defaultPrice, isFreeEvent, dateOptions, pickDates, perDatePrice, datesSummary, datesCount, occurrenceLine,
  JOIN_EARLY_MINUTES, YOUR_TIME,
} from './eventState.js'
import { useRegistration, useNow } from './useRegistration.js'
import { CountLine } from './parts.jsx'
import AddToCalendar from './AddToCalendar.jsx'
import './event.css'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EVENTS_HREF = '/all-products?type=event'
const shortPrice = ({ amount, interval, installments, strike }) => ({ amount, interval, installments, strike })

function priceDescription(p) {
  const bits = []
  if (p.price.installments && p.price.total) bits.push(`${p.price.total} in total`)
  if (p.price.note) bits.push(p.price.note)
  if (p.note) bits.push(p.note)
  return bits.join(' · ') || undefined
}

function Action({ action, size = 'lg', block = true, variant }) {
  if (!action) return null
  const { label, href, onClick, disabled, iconEnd, iconStart, download, external } = action
  const extra = external ? { target: '_blank', rel: 'noopener noreferrer' } : {}
  if (href && !disabled) {
    return <Button size={size} block={block} variant={variant} href={href} iconStart={iconStart} iconEnd={iconEnd} download={download} {...extra}>{label}</Button>
  }
  return <Button size={size} block={block} variant={variant} onClick={onClick} disabled={disabled} iconStart={iconStart} iconEnd={iconEnd}>{label}</Button>
}

function Assurances({ items }) {
  const list = items.filter((i) => i && i.label)
  if (!list.length) return null
  return <ul className="pd-assure">{list.map((i) => <li key={i.label}><Icon name={i.icon} size={16} />{i.label}</li>)}</ul>
}

// Date, time and place at a glance, in the visitor's zone (the venue's own time as secondary text).
function When({ ev, registered, now }) {
  const venue = venueNote(ev, now)
  return (
    <ul className="ev-when">
      <li><Icon name="calendar" size={16} /><span>{dateLine(ev, now)}</span></li>
      <li>
        <Icon name="clock" size={16} />
        <span>{timeLine(ev, now)}{venue && <span className="ev-when-note">{venue}</span>}</span>
      </li>
      <li><Icon name={ev.format === 'virtual' ? 'video' : 'map-pin'} size={16} /><span>{whereLine(ev, { registered })}</span></li>
    </ul>
  )
}

// "Per date": a checkbox for each upcoming date with places, and the running total.
const SHOW_DATES = 6
function DatePicker({ product, chosen, onChange, booked = [], legend = 'Choose your dates', now }) {
  const [all, setAll] = useState(false)
  const options = dateOptions(product, now).filter((o) => !booked.includes(o.key))
  const shown = all ? options : options.slice(0, SHOW_DATES)
  const toggle = (key) => onChange(chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key])
  if (!options.length) return <p className="pd-note">There are no more dates to book in this run.</p>
  return (
    <fieldset className="ev-pick">
      <legend className="pd-legend">{legend}</legend>
      <p className="t-body-sm t-muted">Times are in your time zone.</p>
      <div className="ev-pick-list">
        {shown.map((o) => (
          <Checkbox
            key={o.key} className="ev-pick-date" checked={chosen.includes(o.key)} disabled={o.full}
            onChange={() => toggle(o.key)} label={occurrenceLine(o)}
            description={o.full ? 'Full' : o.left == null ? undefined : o.left === 1 ? '1 place left' : `${o.left} places left`}
          />
        ))}
      </div>
      {options.length > SHOW_DATES && (
        <button type="button" className="ev-text-button" aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? 'Show fewer dates' : `Show all ${options.length} dates`}
        </button>
      )}
    </fieldset>
  )
}

// "$12 per date · 3 dates · $36"
function PerDateTotal({ product, chosen }) {
  const q = perDateQuote(product.slug, chosen)
  if (!q) return null
  return (
    <p className="ev-pick-total" aria-live="polite">
      {q.count ? `${q.each} per date · ${q.countLabel} · ${q.total}` : `${q.each} per date · choose at least one date`}
    </p>
  )
}

function MobileBar({ product, summary, action, watchRef }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const el = watchRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([entry]) => setShow(!entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [watchRef])
  if (!action) return null
  return (
    <div className={cx('pd-bar', show && 'is-shown')} aria-hidden={!show || undefined} inert={!show || undefined}>
      <div className="pd-bar-info">
        <span className="pd-bar-title">{product.title}</span>
        {summary}
      </div>
      <Action action={action} size="md" block={false} />
    </div>
  )
}

function GuestForm({ onSubmit, live }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState({})
  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!name.trim()) next.name = 'Enter your name'
    if (!EMAIL.test(email.trim())) next.email = 'Enter an email address like name@example.com'
    setErrors(next)
    if (!Object.keys(next).length) onSubmit({ name: name.trim(), email: email.trim() })
  }
  return (
    <form className="ev-form" onSubmit={submit} noValidate aria-label="Register as a guest">
      <TextField label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} hint="We’ll email your ticket here." />
      <Button type="submit" size="lg" block>{live ? 'Register and join' : 'Register'}</Button>
    </form>
  )
}

function WaitlistForm({ onSubmit }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!EMAIL.test(email.trim())) { setError('Enter an email address like name@example.com'); return }
    onSubmit(email.trim())
  }
  return (
    <form className="ev-form" onSubmit={submit} noValidate aria-label="Join the waitlist">
      <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} error={error} hint="We’ll only email you about this event." />
      <Button type="submit">Join the waitlist</Button>
    </form>
  )
}

export default function EventBuyPanel({ product }) {
  const { viewer, signedIn } = useViewer()
  const cart = useCart()
  const now = useNow()
  const reg = useRegistration(product, viewer)
  const first = defaultPrice(product)
  const [priceId, setPriceId] = useState(first?.id)
  // Per date: the next date with places is ticked to start with.
  const [chosen, setChosen] = useState(() => {
    const firstOpen = dateOptions(product).find((o) => !o.full && !(reg.ticket?.dates || []).includes(o.key))
    return firstOpen ? [firstOpen.key] : []
  })
  const [form, setForm] = useState(null) // 'guest' | 'waitlist'
  const panelRef = useRef(null)
  const watchRef = useRef(null)

  const ev = product.event || {}
  const status = eventStatus(product, now)
  const live = status === 'live'
  const info = registrationInfo(product, now)
  const join = joinState(ev, now)
  const price = product.prices.find((p) => p.id === priceId) || first
  const perDate = Boolean(price?.perDate)
  const free = isFreeEvent(product)
  const ticket = reg.ticket
  const back = encodeURIComponent(productHref(product))
  const reveal = () => panelRef.current?.scrollIntoView({ block: 'start' })
  const upcoming = (variant) => <Button variant={variant} href={EVENTS_HREF}>See upcoming events</Button>

  const view = decide()
  if (view.notice) return view.notice
  return (
    <>
      <Card as="section" className="pd-buy" padding="lg" ref={panelRef} id="buy" aria-label="Tickets and registration">
        <div className="pd-buy-stack">
          {view.body}
        </div>
      </Card>
      <MobileBar product={product} summary={view.summary} action={view.primary} watchRef={watchRef} />
    </>
  )

  function primaryBlock(action) {
    return <div ref={watchRef} className="pd-buy-action"><Action action={action} /></div>
  }

  function decide() {
    // Cancelled by the school.
    if (status === 'cancelled') {
      return {
        notice: (
          <StateNotice
            reason="This event was cancelled" title={product.title}
            detail={`${ev.cancelled?.note || ''} It was due to take place on ${dateLine(ev)}.`.trim()}
            actions={upcoming()}
          />
        ),
      }
    }

    // Ended: the replay if it was recorded, else the ended notice.
    if (status === 'ended') {
      if (!ev.recordings?.length) {
        return {
          notice: (
            <StateNotice
              reason="This event has ended" title={product.title}
              detail={`It took place on ${dateLine(ev)}${ticket ? '. Thank you for coming' : ''}. It wasn’t recorded, but we run new events every month.`}
              actions={upcoming()}
            />
          ),
        }
      }
      const action = ticket
        ? { label: 'Watch the replay', href: `${openHref(product)}#replay`, iconStart: 'play' }
        : free
          ? { label: 'Get the replay', href: signedIn ? undefined : `/signup?next=${back}`, onClick: signedIn ? () => reg.register() : undefined }
          : { label: 'Get the replay', href: `/checkout/${product.slug}?price=${price.id}` }
      return {
        primary: action,
        summary: ticket ? <span className="pd-bar-label">Replay available</span> : <PriceTag {...shortPrice(price.price)} size="sm" />,
        body: (
          <>
            <div className="pg-row"><Badge icon="clock">Ended</Badge><Badge tone="primary" icon="play">Replay available</Badge></div>
            <h2 className="t-heading-3">{ticket ? 'Watch the replay' : 'Catch the replay'}</h2>
            <p className="t-muted">
              {ticket
                ? `Thank you for registering. The ${ev.recordings.length} recordings are on your ticket page.`
                : `The live event took place on ${dateLine(ev)}. Get the recordings and watch at your own pace.`}
            </p>
            {!ticket && <PriceTag {...price.price} size="lg" />}
            <ul className="ev-when">
              {ev.recordings.map((r) => <li key={r.id}><Icon name="play" size={16} /><span>{r.title} · {r.duration}</span></li>)}
            </ul>
            {primaryBlock(action)}
            {!ticket && <Assurances items={[{ icon: 'check-circle', label: '14-day refund' }, { icon: 'lock', label: 'Secure checkout' }]} />}
          </>
        ),
      }
    }

    // Holding a ticket.
    if (ticket) {
      // Per-date tickets join on the dates they bought; everyone else on the next date.
      const booked = ticket.dates ? pickDates(product, ticket.dates, now) : null
      const occ = booked ? booked[0] : join.occ
      const opensAt = booked ? (occ ? occ.start - JOIN_EARLY_MINUTES * 60000 : null) : join.opensAt
      const open = booked ? Boolean(occ && now >= opensAt) : join.state === 'open'
      const liveNow = booked ? Boolean(occ && now >= occ.start) : live
      const guest = !signedIn
      const primary = open
        ? { label: liveNow ? 'Join now' : 'Join', href: ev.joinUrl, external: true, iconEnd: 'arrow-right' }
        : guest ? null : { label: 'View your ticket', href: openHref(product), iconEnd: 'arrow-right' }
      const perDateOption = perDatePrice(product)
      const more = booked && perDateOption ? chosen.filter((k) => !ticket.dates.includes(k)) : null
      return {
        primary,
        summary: <Badge tone="success" icon="check">Registered</Badge>,
        body: (
          <>
            <div className="pg-row">
              <Badge tone="success" icon="check">{ticket.status === 'Paid' ? 'You have a ticket' : 'You’re registered'}</Badge>
              {liveNow && <Badge tone="success" icon="video">Happening now</Badge>}
            </div>
            <h2 className="t-heading-3">{liveNow ? 'Happening now' : open ? 'The room is open' : 'See you there'}</h2>
            {booked ? (
              <ul className="ev-when">
                <li><Icon name="calendar" size={16} /><span>Your dates: {booked.length ? datesSummary(booked) : 'all have passed'}</span></li>
                {occ && <li><Icon name="clock" size={16} /><span>Next: {occurrenceLine(occ)} {YOUR_TIME}</span></li>}
                <li><Icon name="video" size={16} /><span>{whereLine(ev, { registered: true })}</span></li>
              </ul>
            ) : <When ev={ev} now={now} registered />}
            {ev.format === 'virtual' && !open && opensAt && (
              <p className="pd-note">The join link appears here and on your ticket {JOIN_EARLY_MINUTES} minutes before the start, from {at(opensAt)}.</p>
            )}
            {open && !liveNow && <p className="pd-note">Starts at {localTime(occ.start, { zone: true })}. You can join now and settle in.</p>}
            {ticket.viaPlace && <p className="ev-places"><Icon name="leaf" size={16} />Used 1 of your {reg.places.perMonth} event places this month</p>}
            {guest && ticket.guest && (
              <Notice tone="success" title="You’re registered">We’ve emailed your ticket to {ticket.guest.email}. No account needed.</Notice>
            )}
            {primary ? primaryBlock(primary) : (
              <div ref={watchRef}><AddToCalendar product={product} dates={ticket.dates} variant="primary" size="lg" block /></div>
            )}
            {open && !guest && <a className="pd-link" href={openHref(product)}>View your ticket</a>}
            {primary && <AddToCalendar product={product} dates={ticket.dates} variant="ghost" block />}
            {more && (
              <div className="ev-more pg-stack-sm">
                <DatePicker product={product} chosen={more} onChange={setChosen} booked={ticket.dates} legend="Book more dates" now={now} />
                <PerDateTotal product={product} chosen={more} />
                <Button variant="secondary" block disabled={!more.length} href={more.length ? `/checkout/${product.slug}?price=${perDateOption.id}&dates=${more.join(',')}` : undefined}>
                  {more.length ? `Book ${datesCount(more.length)}` : 'Choose a date to book'}
                </Button>
              </div>
            )}
          </>
        ),
      }
    }

    // On the waitlist.
    if (reg.waitlist) {
      return {
        notice: (
          <StateNotice
            reason="This event is full" title={product.title}
            detail="When a place opens, the next person on the waitlist gets it automatically and we email them. There’s nothing to pay until then."
            actions={upcoming()}
          >
            <Notice tone="success" title="You’re on the waitlist">
              We’ll email you{reg.waitlist.email ? ` at ${reg.waitlist.email}` : ''} the moment a place is yours.
            </Notice>
          </StateNotice>
        ),
      }
    }

    // Membership only: members use one of their monthly event places.
    if (product.visibility === 'membership') {
      const included = ownsProduct(product, viewer)
      if (!included) {
        return {
          primary: { label: viewer.plan ? 'Choose a plan' : 'Choose a membership', onClick: reveal },
          summary: <span className="pd-bar-label">Included in a membership</span>,
          body: (
            <>
              <Badge tone="primary" icon="leaf">Membership</Badge>
              <h2 className="t-heading-3">Included in a membership</h2>
              <When ev={ev} now={now} />
              <p className="t-muted">
                {viewer.plan
                  ? 'Your current plan doesn’t include this event. Upgrade to register, along with everything else in the plan.'
                  : 'This event can’t be bought on its own. Members register with one of their monthly event places.'}
              </p>
              <div ref={watchRef}><PlanPicker product={product} forRef={product.slug} compact /></div>
              {!signedIn && <p className="pd-small">Already a member? <a href={`/login?next=${back}`}>Log in</a></p>}
              <Assurances items={[{ icon: 'check-circle', label: 'Cancel any time' }]} />
            </>
          ),
        }
      }
      const cost = ev.places || 1
      const left = reg.places.perMonth - reg.places.used
      const enough = left >= cost
      const action = enough
        ? { label: live ? 'Register and join' : 'Register with a membership place', onClick: () => reg.register({ viaPlace: true }) }
        : { label: 'Register with a membership place', disabled: true }
      return {
        primary: action,
        summary: <span className="pd-bar-label">In your membership</span>,
        body: (
          <>
            <div className="pg-row">
              <Badge tone="success" icon="check">In your membership</Badge>
              {live && <Badge tone="success" icon="video">Happening now</Badge>}
            </div>
            <h2 className="t-heading-3">Register with your membership</h2>
            <When ev={ev} now={now} />
            <CountLine product={product} now={now} />
            {enough ? (
              <p className="ev-places"><Icon name="leaf" size={16} />Uses {cost} of your {reg.places.perMonth} event places this month · {left} left</p>
            ) : (
              <Notice tone="warning" title="You’ve used your event places this month">Your places reset on {reg.places.resets}. Nothing to pay.</Notice>
            )}
            {primaryBlock(action)}
            <Assurances items={[{ icon: 'check-circle', label: 'Nothing extra to pay' }, { icon: 'mail', label: 'Joining details by email' }]} />
          </>
        ),
      }
    }

    // Registration deadline passed.
    if (info.deadlinePassed && status === 'scheduled') {
      return {
        notice: (
          <StateNotice
            reason="Registration has closed" title={product.title}
            detail={`Registration closed on ${at(info.deadline)}. The event goes ahead on ${dateLine(ev)} for everyone who registered.`}
            actions={upcoming()}
          />
        ),
      }
    }

    // Full: the waitlist, with auto-promotion.
    if (info.full) {
      const position = info.waiting + 1
      const joinList = () => (signedIn ? reg.joinWaitlist(position) : setForm('waitlist'))
      return {
        notice: (
          <StateNotice
            reason="This event is full" title={product.title}
            detail={info.waitlist
              ? `All ${info.limit} places have been taken. Join the waitlist: when a place opens, the next person gets it automatically and we email them.`
              : `All ${info.limit} places have been taken. We often run this event again, so keep an eye on what’s coming up.`}
            actions={info.waitlist && form !== 'waitlist'
              ? <><Button onClick={joinList}>Join the waitlist</Button>{upcoming('secondary')}</>
              : upcoming(info.waitlist ? 'secondary' : undefined)}
          >
            {info.waitlist && <p className="t-body-sm t-muted">There’s nothing to pay unless a place becomes yours.</p>}
            {form === 'waitlist' && <WaitlistForm onSubmit={(email) => reg.joinWaitlist(position, email)} />}
          </StateNotice>
        ),
      }
    }

    // Free events: one click when signed in, a guest form when guest registration is on.
    if (free) {
      let action
      if (signedIn) action = { label: live ? 'Register and join' : 'Register for free', onClick: () => reg.register() }
      else if (info.guest) action = form === 'guest' ? { label: 'Register', onClick: reveal } : { label: 'Register for free', onClick: () => { setForm('guest'); reveal() } }
      else action = { label: live ? 'Sign up to join' : 'Sign up to register', href: `/signup?next=${back}` }
      return {
        primary: action,
        summary: <PriceTag amount={0} size="sm" />,
        body: (
          <>
            {live && <div><Badge tone="success" icon="video">Happening now</Badge></div>}
            <PriceTag amount={0} size="lg" />
            <When ev={ev} now={now} />
            <CountLine product={product} now={now} />
            {info.deadline && <p className="pd-note">Registration closes {at(info.deadline)}.</p>}
            {form === 'guest' && !signedIn
              ? <div ref={watchRef}><GuestForm live={live} onSubmit={(guest) => reg.register({ guest })} /></div>
              : primaryBlock(action)}
            {!signedIn && (
              <p className="pd-small">
                {info.guest ? 'No account needed. ' : ''}Already have an account? <a href={`/login?next=${back}`}>Log in</a>
              </p>
            )}
            <Assurances items={[
              { icon: 'check-circle', label: 'No card needed' },
              info.guest && !signedIn && { icon: 'user', label: 'Guest registration: just your name and email' },
              { icon: 'mail', label: ev.format === 'virtual' ? 'Joining details by email' : 'Ticket by email' },
            ]} />
          </>
        ),
      }
    }

    // Paid: ticket, subscription ("Ongoing access") or installments.
    const subscription = price.kind === 'subscription'
    const picked = perDate ? pickDates(product, chosen, now).map((o) => o.key) : null
    const checkoutHref = perDate
      ? `/checkout/${product.slug}?price=${price.id}&dates=${picked.join(',')}`
      : `/checkout/${product.slug}?price=${price.id}`
    const label = subscription ? 'Subscribe' : perDate ? (picked.length ? `Book ${datesCount(picked.length)}` : 'Choose a date to book') : live ? 'Buy ticket and join' : 'Buy ticket'
    const action = perDate && !picked.length ? { label, disabled: true } : { label, href: checkoutHref }
    const canCart = !subscription && school.features.cart && !(perDate && !picked.length)
    const inCart = cart.items.some((i) => i.productId === product.slug)
    return {
      primary: action,
      summary: <PriceTag {...shortPrice(price.price)} size="sm" />,
      body: (
        <>
          {live && <div><Badge tone="success" icon="video">Happening now</Badge></div>}
          <PriceTag {...price.price} size="lg" />
          {price.note && <p className="pd-sale">{price.note}</p>}
          <When ev={ev} now={now} />
          <CountLine product={product} now={now} />
          {info.deadline && <p className="pd-note">Registration closes {at(info.deadline)}.</p>}
          {product.prices.length > 1 && (
            <fieldset className="pd-prices">
              <legend className="pd-legend">Choose how to pay</legend>
              {product.prices.map((p) => (
                <RadioCard
                  key={p.id} name={`price-${product.slug}`} value={p.id} checked={p.id === price.id}
                  onChange={() => setPriceId(p.id)} title={p.label} description={priceDescription(p)}
                  meta={<PriceTag {...shortPrice(p.price)} size="sm" />}
                />
              ))}
            </fieldset>
          )}
          {perDate && (
            <>
              <DatePicker product={product} chosen={chosen} onChange={setChosen} now={now} />
              <PerDateTotal product={product} chosen={picked} />
            </>
          )}
          {primaryBlock(action)}
          {canCart && (inCart ? (
            <Button variant="secondary" size="lg" block iconStart="cart" onClick={cart.openCart}>View cart</Button>
          ) : (
            <Button variant="secondary" size="lg" block iconStart="cart" onClick={() => cart.add(perDate ? { productId: product.slug, priceId: price.id, dates: picked } : { productId: product.slug, priceId: price.id })}>Add to cart</Button>
          ))}
          <Assurances items={[
            { icon: 'check-circle', label: subscription ? 'Cancel any time' : 'Full refund up to 14 days before' },
            { icon: 'lock', label: 'Secure checkout' },
            { icon: 'mail', label: 'Ticket and joining details by email' },
          ]} />
        </>
      ),
    }
  }
}
