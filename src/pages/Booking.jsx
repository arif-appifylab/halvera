import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  Avatar, Badge, Button, Card, Checkbox, Icon, Modal, Notice, OrderSummary, PriceTag,
  StateNotice, TextField,
} from '@/design-system'
import { getPractitioner } from '@/data/people.js'
import { allowance, appointmentAllowances } from '@/data/account.js'
import { PaymentMethods } from '@/components/checkout/PaymentStep.jsx'
import { deviceWallets } from '@/components/checkout/methods.js'
import { getAppointmentType, practitionerZone } from '@/data/appointments.js'
import { useViewer } from '@/app/viewer.jsx'
import PlanPicker, { PlanPickerModal } from '@/components/PlanPicker.jsx'
import SchedulePicker from '@/components/booking/SchedulePicker.jsx'
import PollPicker from '@/components/booking/PollPicker.jsx'
import IntakeField from '@/components/booking/IntakeField.jsx'
import BookingRules from '@/components/booking/BookingRules.jsx'
import TimeZoneBox from '@/components/booking/TimeZoneBox.jsx'
import { isEmail, validateIntake } from '@/components/booking/intake.js'
import { assignHost, pollOptions, prepareSlots, slotOpen, slotsByDay } from '@/components/booking/slots.js'
import { detectZone, isValidZone, timeIn, whenIn, zoneLabel, zonedToUtc } from '@/components/booking/time.js'
import NotFound from '@/pages/NotFound.jsx'
import '@/components/booking/booking-ui.css'
import './booking.css'
import { splitName } from '@/lib/names.js'

// Book an appointment: /appointment/:slug
// Standard (1:1 or group slots) and Round robin: Date and time → Your details → Payment → Confirmed.
// Magic slot: the one pre-set time → details → payment → confirmed. Meetup poll: vote → details → submitted.
// Free types skip the payment step; members use their allowance ("Membership slot").
// Preview params:
//   ?state=no-times | day-limit | allowance-used | taken (magic slot)
//   ?step=details | payment | confirmed | submitted   jump ahead with the first open time
//   ?view=calendar | week   ?tz=Asia/Dhaka   ?host=leah (round robin)   ?as=member (viewer)

export default function Booking() {
  const { slug } = useParams()
  const type = getAppointmentType(slug)
  if (!type) return <NotFound />
  return <BookingFlow key={slug} type={type} />
}

const VIEW_KEY = 'halvera-booking-view'
const readViews = () => { try { return JSON.parse(localStorage.getItem(VIEW_KEY)) || {} } catch { return {} } }
const saveView = (format, view) => {
  try { localStorage.setItem(VIEW_KEY, JSON.stringify({ ...readViews(), [format]: view })) } catch { /* storage unavailable */ }
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

const calendarHref = (type, utc, location, host) => {
  const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Halvera//Booking//EN', 'BEGIN:VEVENT',
    `UID:${type.slug}-${stamp(utc)}@halvera.example`, `DTSTAMP:${stamp(utc)}`, `DTSTART:${stamp(utc)}`,
    `DTEND:${stamp(utc + type.durationMin * 60000)}`,
    `SUMMARY:${type.title} with ${host.name}`, `LOCATION:${location.address || location.url || location.title}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics)
}

function BookingFlow({ type }) {
  const { viewer, signedIn } = useViewer()
  const [params] = useSearchParams()
  const state = params.get('state')
  const stepParam = params.get('step')

  const isPoll = type.kind === 'meetup-poll'
  const isMagic = type.kind === 'magic-slot'
  const isRR = type.kind === 'round-robin'
  const hosts = type.hosts.map(getPractitioner)
  const inc = type.includedIn

  // Pricing: Free · Registrants pay · Included in membership (allowance) · membership only.
  const onPlan = Boolean(inc) && inc.plans.includes(viewer.plan)
  // Each included appointment has its own limit per billing period.
  const own = appointmentAllowances.find((a) => a.slug === type.slug)
  const allowanceLeft = state === 'allowance-used' ? 0 : own ? own.perPeriod - own.used : allowance.total - allowance.used
  const mode = inc && inc.only ? (onPlan ? (allowanceLeft > 0 ? 'allowance' : 'used') : 'plan')
    : type.price === 0 ? 'free' : onPlan && allowanceLeft > 0 ? 'allowance' : 'paid'
  const allowanceLine = `Uses 1 of your ${own ? plural(own.perPeriod, `${type.title.toLowerCase()} session`) : plural(allowance.total, 'consultation')} this month`

  // A paid meetup poll saves a card at the payment step and charges only if the voter's time wins.
  const paidPoll = isPoll && mode === 'paid'
  const stages = ['time', 'details', ...(mode === 'free' ? [] : ['payment']), 'confirmed']

  // Time zones: practitioner's is fixed; the visitor's is detected, and they can switch.
  const visitorZone = useMemo(() => detectZone(), [])
  const [zone, setZone] = useState(() => (isValidZone(params.get('tz')) ? params.get('tz') : visitorZone))

  // Round robin: "any" or one practitioner.
  // Round robin: the system assigns the host at booking (the free host with the fewest bookings), so the
  // registrant doesn't choose one and the page doesn't say who it will be until it's booked.
  const allSlots = useMemo(() => prepareSlots(type), [type])
  const slots = useMemo(() => prepareSlots(type, { host: 'any' }), [type])
  const firstOpen = allSlots.find(slotOpen)

  const [view, setView] = useState(() => {
    const v = params.get('view')
    if (v === 'calendar' || v === 'week') return v
    return readViews()[type.format] || (type.format === 'group' ? 'week' : 'calendar')
  })
  const changeView = (v) => { setView(v); saveView(type.format, v) }

  const jump = stepParam === 'submitted' ? 'confirmed' : stepParam
  const canJump = stages.includes(jump) && jump !== 'time' && mode !== 'plan' && mode !== 'used' && (isPoll || firstOpen)
  const [stage, setStage] = useState(canJump ? jump : 'time')
  // ?slot=<date>T<time> picks a time chosen elsewhere (the dashboard's Membership tab).
  const wanted = allSlots.find((s) => s.id === params.get('slot') && slotOpen(s))
  const [slot, setSlot] = useState(wanted ? wanted.id : canJump && !isPoll ? firstOpen.id : isMagic && firstOpen ? firstOpen.id : '')
  const [votes, setVotes] = useState(canJump && isPoll ? [type.poll.options[2].id] : [])
  const [form, setForm] = useState(() => ({
    ...splitName(signedIn ? viewer.name : canJump ? 'Sam Taylor' : ''),
    email: signedIn ? viewer.email : canJump ? 'sam@example.com' : '',
    answers: {},
    consent: canJump,
    marketing: false,
  }))
  const [errors, setErrors] = useState({})
  const [voteError, setVoteError] = useState('')
  const [payMethod, setPayMethod] = useState('card')
  // The card field, as at checkout (src/components/checkout/PaymentStep.jsx).
  const [card, setCard] = useState({ cardNumber: '', cardExpiry: '', cardCvc: '', cardName: '' })
  const [cardErrors, setCardErrors] = useState({})
  const cardField = (key) => ({
    value: card[key], error: cardErrors[key],
    onChange: (e) => { const v = e.target.value; setCard((c) => ({ ...c, [key]: v })); setCardErrors((x) => ({ ...x, [key]: undefined })) },
  })
  const [paying, setPaying] = useState(false)
  const [rescheduling, setRescheduling] = useState(null) // the slot being moved from
  const [cancelOpen, setCancelOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [moved, setMoved] = useState(false)

  // One location per appointment (the admin's Location). A hidden venue is only shown once booked.
  const location = type.location
  const lower = (t) => t.charAt(0).toLowerCase() + t.slice(1)
  const whereLine = location.kind === 'person' && !location.hidden ? location.address : lower(location.description)
  const chosen = allSlots.find((s) => s.id === slot) || null
  const hostId = isRR ? assignHost(type, chosen) : type.hosts[0]
  const host = getPractitioner(hostId)
  const zoneNow = (utc) => zoneLabel(zone, utc)
  const when = chosen ? `${whenIn(chosen.utc, zone)} · ${zoneNow(chosen.utc)}` : ''
  const deadline = chosen && type.changeHours ? whenIn(chosen.utc - type.changeHours * 3600000, zone) : null
  const go = (next) => { setStage(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const noTimes = state === 'no-times' || (!isPoll && !firstOpen)
  const taken = isMagic && state === 'taken'

  // ?state=day-limit opens on a day that has reached its "Bookings a day" cap.
  const limitDay = useMemo(() => {
    if (state !== 'day-limit') return null
    const days = slotsByDay(slots, zone)
    return [...days.keys()].sort().find((k) => days.get(k).status === 'limit') || null
  }, [state, slots, zone])

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }
  const setAnswer = (id, value) => {
    setForm((f) => ({ ...f, answers: { ...f.answers, [id]: value } }))
    if (errors[id]) setErrors((e) => ({ ...e, [id]: undefined }))
  }

  const validate = () => {
    const e = validateIntake(type.intake, form.answers)
    if (!form.firstName.trim()) e.firstName = 'Enter your first name'
    if (!form.lastName.trim()) e.lastName = 'Enter your last name'
    if (!form.email.trim()) e.email = 'Enter your email address'
    else if (!isEmail(form.email)) e.email = 'Enter an email address like name@example.com'
    if (!form.consent) e.consent = 'Tick this box to continue'
    return e
  }

  const submitDetails = (ev) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) {
      requestAnimationFrame(() => {
        const first = document.querySelector('.bk-form [aria-invalid="true"], .bk-form .bk-fieldset.has-error input, .bk-form .bk-fieldset.has-error button')
        if (first) first.focus()
      })
      return
    }
    go(mode === 'free' ? 'confirmed' : 'payment')
  }

  const continueFromTime = () => {
    if (isPoll && !votes.length) { setVoteError('Choose at least one time'); return }
    go('details')
  }

  const book = () => {
    if (mode === 'paid' && (paidPoll || payMethod === 'card')) {
      const n = card.cardNumber.replace(/\D/g, '')
      const e = {}
      if (n.length < 13 || n.length > 19) e.cardNumber = 'Enter the long number on the front of your card.'
      if (!/^\s*(0[1-9]|1[0-2])\s*\/?\s*\d{2}\s*$/.test(card.cardExpiry)) e.cardExpiry = 'Enter the expiry date as MM / YY.'
      if (!/^\d{3,4}$/.test(card.cardCvc.trim())) e.cardCvc = 'Enter the 3 or 4 digit code.'
      setCardErrors(e)
      const first = ['cardNumber', 'cardExpiry', 'cardCvc'].find((k) => e[k])
      if (first) { document.getElementById(`co-${first}`)?.focus(); return }
    }
    setPaying(true)
    setTimeout(() => { setPaying(false); go('confirmed') }, 900)
  }

  const startReschedule = () => { setRescheduling(slot); go('time') }
  const keepOriginal = () => { setSlot(rescheduling); setRescheduling(null); go('confirmed') }
  const confirmNewTime = () => { setRescheduling(null); setMoved(true); go('confirmed') }

  const cancelBooking = () => { setCancelOpen(false); setCancelled(true) }
  const bookAgain = () => { setCancelled(false); setMoved(false); setSlot(isMagic && firstOpen ? firstOpen.id : ''); go('time') }

  const pollChosen = isPoll ? pollOptions(type.poll).filter((o) => votes.includes(o.id)) : []
  const pollCloses = isPoll ? zonedToUtc(type.poll.closes.date, type.poll.closes.time, practitionerZone) : null
  const waitlistHref = `/contact-us?topic=waitlist&type=${type.slug}`
  const planProduct = inc ? { title: type.title, plans: inc.plans } : null

  /* ---------- step 1 ---------- */
  const timeStep = () => {
    if (mode === 'plan') {
      return (
        <Card padding="lg" className="pg-stack">
          <div className="pg-stack-sm">
            <h2 className="t-heading-3">Included in a membership</h2>
            <p className="t-body-sm t-muted">
              {type.title} is for {inc.planName} and Founding members. Each membership includes {own ? plural(own.perPeriod, `${type.title.toLowerCase()} session`) : 'a session'} a month.
            </p>
          </div>
          <PlanPicker product={planProduct} forRef={`appointment:${type.slug}`} />
          <p className="t-body-sm t-muted">Not sure yet? <a className="bk-inline-link" href="/appointment/consultation">Book a free 20-minute consultation</a> first.</p>
          <BookingRules type={type} zone={zone} />
        </Card>
      )
    }
    if (mode === 'used') {
      return (
        <Card padding="lg" className="pg-stack">
          <h2 className="t-heading-3">You’ve used this month’s consultation</h2>
          <Notice tone="info" title={`Your allowance resets on ${allowance.resets}`}>
            You can book your next check-in from then. If you’d like to talk sooner, a follow-up is $65.
          </Notice>
          <div className="bk-actions">
            <a className="bk-link" href="/student/dashboard/bookings">See my bookings <Icon name="arrow-right" size={16} /></a>
            <Button variant="secondary" href="/appointment/follow-up">Book a follow-up</Button>
          </div>
        </Card>
      )
    }

    const where = <p className="bk-where t-body-sm"><Icon name={location.icon} size={18} />{location.title} · {whereLine}</p>

    let title = rescheduling ? 'Choose a new time' : 'Choose a date and time'
    let intro = `${type.duration}, ${type.format === 'group' ? `up to ${type.capacity} people per session` : 'one to one'}. Times are shown in your time zone.`
    let body = null
    if (isPoll) {
      title = 'Choose the times you could make'
      intro = `${hosts[0].name} will run it at the time most people can make. Nothing is booked${paidPoll ? ' or charged' : ''} until voting ends.`
      body = (
        <>
          <PollPicker poll={type.poll} zone={zone} value={votes} onChange={(v) => { setVotes(v); setVoteError('') }} error={voteError} />
          <TimeZoneBox zone={zone} onZoneChange={setZone} practitionerZone={practitionerZone} visitorZone={visitorZone} at={pollCloses} />
        </>
      )
    } else if (isMagic) {
      title = 'This time is set aside for you'
      intro = `${hosts[0].name} shared this link with you. It isn’t listed on our site, so no one else can take it.`
      body = (
        <>
          <div className="bk-magic">
            <Icon name="calendar" size={24} />
            <div>
              <p className="bk-magic-when">{whenIn(firstOpen.utc, zone)}–{timeIn(firstOpen.utc + type.durationMin * 60000, zone)}</p>
              <p className="t-body-sm t-muted">{zoneNow(firstOpen.utc)} · {type.duration} with {hosts[0].name}</p>
            </div>
          </div>
          <TimeZoneBox zone={zone} onZoneChange={setZone} practitionerZone={practitionerZone} visitorZone={visitorZone} at={firstOpen.utc} />
        </>
      )
    } else {
      body = (
        <>
          <SchedulePicker
            slots={slots}
            zone={zone}
            onZoneChange={setZone}
            visitorZone={visitorZone}
            value={slot}
            onChange={setSlot}
            view={view}
            onViewChange={changeView}
            group={type.format === 'group'}
            dailyLimit={type.dailyLimit}
            hostName={isRR ? 'Each practitioner' : hosts[0].name}
            waitlistHref={waitlistHref}
            initialDay={limitDay}
          />
        </>
      )
    }

    const status = isPoll
      ? (votes.length ? `${plural(votes.length, 'time')} chosen` : 'Choose at least one time')
      : chosen ? when : 'Choose a time to continue'

    return (
      <Card padding="lg" className="pg-stack">
        <div className="pg-stack-sm">
          <h2 className="t-heading-3">{title}</h2>
          <p className="t-body-sm t-muted">{intro}</p>
        </div>
        {rescheduling && (
          <Notice tone="info" title={`You’re moving your booking on ${whenIn(allSlots.find((s) => s.id === rescheduling).utc, zone)}`}>
            Your details stay the same. Your current time is kept until you confirm a new one.
          </Notice>
        )}
        {body}
        {where}
        <BookingRules type={type} zone={zone} />
        <div className="bk-actions">
          {rescheduling ? (
            <>
              <Button variant="ghost" onClick={keepOriginal}>Keep my original time</Button>
              <Button onClick={confirmNewTime} disabled={!slot || slot === rescheduling}>Confirm new time</Button>
            </>
          ) : (
            <>
              <span className="t-body-sm t-muted" aria-live="polite">{status}</span>
              <Button onClick={continueFromTime} disabled={!isPoll && !chosen} iconEnd="arrow-right">Continue</Button>
            </>
          )}
        </div>
      </Card>
    )
  }

  /* ---------- confirmation ---------- */
  const confirmed = () => {
    if (isPoll) {
      return (
        <div className="pg-stack">
          <Notice
            tone="success"
            title="Your availability is in"
            action={<Button variant="secondary" size="sm" onClick={() => go('time')}>Change my answers</Button>}
          >
            <p>We’ll email you the final time at {form.email} when voting ends on {whenIn(pollCloses, zone)}.</p>
            {paidPoll && <p>If one of your times wins and you have a place, we charge {type.price} to your card then. Otherwise nothing is charged.</p>}
            <ul className="bk-picked">
              {pollChosen.map((o) => <li key={o.id}><Icon name="check" size={16} />{whenIn(o.utc, zone)} · {zoneNow(o.utc)}</li>)}
            </ul>
          </Notice>
          <p className="t-body-sm t-muted">
            Up to {type.poll.cap} people can join. If more choose the winning time, the first {type.poll.cap} to vote get a place and the rest join the waitlist.
          </p>
        </div>
      )
    }
    if (cancelled) {
      return (
        <Notice
          tone="neutral"
          title="Your booking is cancelled"
          action={<Button variant="secondary" size="sm" onClick={bookAgain}>{isMagic ? 'Book this time again' : 'Choose another time'}</Button>}
        >
          {mode === 'paid' && `Your refund of ${type.total} goes back to your original payment method. It can take 5–10 working days to arrive. `}
          {mode === 'allowance' && 'The consultation has gone back into this month’s allowance. '}
          We’ve let {host.name} know.
        </Notice>
      )
    }
    return (
      <div className="pg-stack">
        <Notice
          tone="success"
          title={moved ? 'Your new time is booked' : 'You’re booked'}
          action={
            <div className="bk-confirm-actions">
              <Button variant="secondary" size="sm" iconStart="calendar" href={calendarHref(type, chosen.utc, location, host)} download={`${type.slug}.ics`}>Add to calendar</Button>
              {!isMagic && <Button variant="link" size="sm" onClick={startReschedule}>Reschedule</Button>}
              <Button variant="link" size="sm" onClick={() => setCancelOpen(true)}>Cancel booking</Button>
            </div>
          }
        >
          <dl className="pg-facts bk-facts">
            <dt>When</dt><dd>{when}</dd>
            <dt>Length</dt><dd>{type.duration}</dd>
            <dt>Where</dt><dd>{location.kind === 'person' ? location.address : location.title}</dd>
            <dt>With</dt><dd>{host.name}</dd>
            {type.format === 'group' && <><dt>Your place</dt><dd>1 of {type.capacity} · {plural(Math.max(chosen.spots - 1, 0), 'spot')} left</dd></>}
            <dt>Paid</dt><dd>{mode === 'paid' ? type.total : mode === 'allowance' ? 'Membership slot' : 'Free'}</dd>
          </dl>
          <p>{location.confirm}</p>
          {location.url && <p><a className="bk-inline-link" href={location.url}>{location.url.replace('https://', '')}</a></p>}
          <p>We’ve sent the details to {form.email}.</p>
        </Notice>
        {deadline && <p className="t-body-sm t-muted">You can reschedule or cancel up to {plural(type.changeHours, 'hour')} before (until {deadline}).</p>}
        <p><a href="/student/dashboard/bookings" className="bk-link">See all my bookings <Icon name="arrow-right" size={16} /></a></p>
      </div>
    )
  }

  return (
    <div className="bk">
      <div className="pg-head">
        <div className="sg-container sg-container-narrow">
          <div className="bk-head">
            {!isRR && <Avatar src={hosts[0].photo} name={hosts[0].name} size="lg" />}
            <div className="bk-head-text">
              {!isRR && <p className="sg-eyebrow">With {hosts[0].name}</p>}
              <h1 className="t-heading-1">{type.title}</h1>
              <p className="t-muted">{type.summary}</p>
              <ul className="bk-meta t-body-sm">
                <li><Icon name="clock" size={18} />{type.duration}</li>
                <li>
                  <Icon name={location.icon} size={18} />
                  {location.title}
                </li>
                {type.format === 'group' && !isPoll && <li><Icon name="users" size={18} />Group session · up to {type.capacity} people</li>}
                {isPoll && <li><Icon name="users" size={18} />Vote on a time · up to {type.poll.cap} people</li>}
                {isMagic && <li><Icon name="lock" size={18} />Shared by link</li>}
              </ul>
              <div className="bk-price">
                {inc && inc.only ? (
                  onPlan
                    ? <Badge tone="success" icon="check">Included in your {inc.planName} membership</Badge>
                    : <p className="bk-incl"><Icon name="lock" size={18} />Included in a membership</p>
                ) : (
                  <PriceTag
                    amount={type.price}
                    strike={type.compareAt}
                    note={inc ? (onPlan ? `Included in your ${inc.planName} membership` : `Included in membership for ${inc.planName} members`) : undefined}
                  />
                )}
                {mode === 'allowance' && <Badge tone="success" icon="check">{allowanceLine}</Badge>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="sg-section sg-section-surface bk-body">
        <div className="sg-container sg-container-narrow">
          {taken ? (
            <StateNotice
              reason="This time has been booked"
              title={type.title}
              detail={`This link was for one time with ${hosts[0].name}, and it’s no longer free. Get in touch and we’ll find another time that suits you.`}
              actions={<>
                <Button href={`/contact-us?topic=booking&type=${type.slug}`}>Contact us</Button>
                <Button variant="secondary" href="/appointment/follow-up">Book a follow-up</Button>
              </>}
            />
          ) : noTimes ? (
            <StateNotice
              reason="No times left this month"
              title={type.title}
              detail={`${isRR ? 'Our practitioners’ calendars are' : `${hosts[0].name}’s calendar is`} full for now. Join the waitlist and we’ll email you as soon as a time opens up, or get in touch and we’ll find a way to help.`}
              actions={<>
                <Button href={waitlistHref}>Join the waitlist</Button>
                <Button variant="secondary" href="/contact-us">Contact us</Button>
              </>}
            />
          ) : (
            <div className="pg-stack-lg">
              {stage === 'time' && timeStep()}

              {stage === 'details' && (
                <Card padding="lg">
                  <form className="bk-form pg-stack" onSubmit={submitDetails} noValidate>
                    <div className="pg-stack-sm">
                      <h2 className="t-heading-3">Your details</h2>
                      <p className="t-body-sm t-muted">
                        {isPoll
                          ? `${plural(votes.length, 'time')} chosen · ${location.title}`
                          : `${when} · ${location.title}`}
                      </p>
                    </div>

                    <div className="pg-grid-2">
                      <TextField label="First name" autoComplete="given-name" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} error={errors.firstName} />
                      <TextField label="Last name" autoComplete="family-name" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} error={errors.lastName} />
                    </div>
                    <div className="pg-grid-2">
                      <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={(e) => setField('email', e.target.value)} error={errors.email} hint={isPoll ? 'We’ll email the final time here.' : signedIn ? 'We’ll send your confirmation here.' : undefined} />
                    </div>
                    {!signedIn && (
                      <Notice tone="info" title="Create my account with this email" action={<a href="/login">Already have an account? Log in</a>}>
                        {isPoll
                          ? 'Your answers are saved to a free account so you can change them until voting ends. We’ll email you a link to confirm it.'
                          : 'Your booking is saved to a free account so you can reschedule or cancel. We’ll email you a link to confirm it.'}
                      </Notice>
                    )}

                    {type.intake.length > 0 && (
                      <>
                        <hr className="pg-divider" />
                        <div className="pg-stack-sm">
                          <h3 className="t-heading-4">Before we meet</h3>
                          <p className="t-body-sm t-muted">Your answers go only to {isRR ? 'your practitioner' : host.name}, so the time is spent on what matters to you.</p>
                        </div>
                        {type.intake.map((f) => (
                          <IntakeField key={f.id} field={f} value={form.answers[f.id]} error={errors[f.id]} onChange={(v) => setAnswer(f.id, v)} />
                        ))}
                      </>
                    )}

                    <hr className="pg-divider" />
                    <div className="pg-stack-sm">
                      <Checkbox
                        checked={form.consent}
                        onChange={(e) => setField('consent', e.target.checked)}
                        error={errors.consent}
                        label="I understand this session is not a substitute for medical care"
                        description="If you have urgent symptoms, contact your GP or call 111."
                      />
                      <Checkbox
                        checked={form.marketing}
                        onChange={(e) => setField('marketing', e.target.checked)}
                        label="Send me occasional emails about new programmes and events"
                        description="Optional. You can unsubscribe at any time."
                      />
                    </div>

                    {Object.values(errors).some(Boolean) && (
                      <Notice tone="danger" title="Some answers need another look">Check the highlighted fields above.</Notice>
                    )}

                    <div className="bk-actions">
                      <Button variant="ghost" iconStart="arrow-left" onClick={() => go('time')}>Back</Button>
                      <Button type="submit" iconEnd={mode === 'free' ? undefined : 'arrow-right'}>
                        {mode === 'free' ? (isPoll ? 'Submit availability' : (type.bookLabel || 'Confirm booking')) : 'Continue'}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {stage === 'payment' && (
                <Card padding="lg" className="pg-stack">
                  <h2 className="t-heading-3">{mode === 'allowance' ? (inc.only ? 'Use your membership slot' : 'Use your allowance') : 'Payment'}</h2>
                  {mode === 'allowance' ? (
                    <>
                      <Notice tone="success" title={allowanceLine}>
                        Nothing to pay today. Your allowance resets on {allowance.resets}.
                      </Notice>
                      <dl className="pg-facts">
                        <dt>Appointment</dt><dd>{type.title} · {type.duration}</dd>
                        <dt>When</dt><dd>{when}</dd>
                        <dt>Where</dt><dd>{location.title}</dd>
                        <dt>With</dt><dd>{host.name}</dd>
                        <dt>Paid with</dt><dd>Membership slot</dd>
                      </dl>
                    </>
                  ) : (
                    <>
                      {onPlan && (
                        <Notice tone="info" title="You’ve used this month’s consultation">
                          Your allowance resets on {allowance.resets}. You can still book now at the usual price.
                        </Notice>
                      )}
                      {paidPoll && (
                        <Notice tone="info" title="You won’t be charged now">
                          We save your card and charge {type.price} once, only if one of your times wins and your place is confirmed when voting ends on {whenIn(pollCloses, zone)}. If your times don’t win, or the class is full, nothing is charged.
                        </Notice>
                      )}
                      <OrderSummary
                        lines={[{ ...type.summaryLine, detail: paidPoll ? `${plural(votes.length, 'time')} chosen · ${type.duration} · ${location.title}` : `${whenIn(chosen.utc, zone)} · ${type.duration} · ${location.title}` }]}
                        total={type.total}
                      />
                      <div className="pg-stack-sm">
                        <p className="sg-label" aria-hidden="true">{paidPoll ? 'Card to charge if your time wins' : 'Pay with'}</p>
                        <PaymentMethods methods={paidPoll ? ['card'] : ['card', ...deviceWallets(), 'paypal']} method={paidPoll ? 'card' : payMethod} onMethod={setPayMethod} field={cardField} label={paidPoll ? 'Card' : 'Pay with'} />
                      </div>
                      {inc && !onPlan && (
                        <p className="t-body-sm t-muted">
                          {inc.planName} members get {own ? plural(own.perPeriod, 'session') : 'sessions'} of this a month, included.{' '}
                          <Button variant="link" size="sm" onClick={() => setPlanOpen(true)}>Book it with a membership</Button>
                        </p>
                      )}
                      {!paidPoll && <p className="t-body-sm t-muted">You can reschedule or cancel up to {plural(type.changeHours, 'hour')} before for a full refund. See our <a href="/refund-policy">refund policy</a>.</p>}
                    </>
                  )}
                  <div className="bk-actions">
                    <Button variant="ghost" iconStart="arrow-left" onClick={() => go('details')} disabled={paying}>Back</Button>
                    <Button onClick={book} loading={paying} iconStart={mode === 'paid' ? 'lock' : undefined}>
                      {mode === 'allowance' ? 'Book with my allowance' : paidPoll ? 'Save card and submit availability' : payMethod === 'paypal' ? `Continue with PayPal · ${type.price}` : payMethod === 'apple-pay' || payMethod === 'google-pay' ? `Pay ${type.price} with ${payMethod === 'apple-pay' ? 'Apple Pay' : 'Google Pay'}` : `Pay ${type.price} and book`}
                    </Button>
                  </div>
                </Card>
              )}

              {stage === 'confirmed' && confirmed()}
            </div>
          )}
        </div>
      </section>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this booking?"
        size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setCancelOpen(false)}>Keep my booking</Button>
          <Button variant="danger" onClick={cancelBooking}>Cancel booking</Button>
        </>}
      >
        {chosen && <p>{type.title} with {host.name}, {when}.</p>}
        <p className="t-body-sm t-muted">
          {mode === 'paid' ? `You’ll get a full refund of ${type.total}.` : mode === 'allowance' ? 'The consultation goes back into your allowance.' : 'You can book another free call at any time.'}
        </p>
      </Modal>

      {planProduct && !inc.only && (
        <PlanPickerModal open={planOpen} onClose={() => setPlanOpen(false)} product={planProduct} forRef={`appointment:${type.slug}`} />
      )}
    </div>
  )
}
