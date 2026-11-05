// The student's dashboard, worked out from one account record (src/data/account.js), the event
// tickets and the booked appointments. Every page (Home, My library, Membership, Bookings, Profile,
// Payments) and the profile PDF read from here, so their numbers always agree.
// Stand-in for the student endpoints: my courses, ongoing, certificates, orders, subscriptions,
// memberships. Prices and totals come formatted, like everywhere else.
import {
  owned, ownedLibrary, enrolments, progress, mediaProgress, accessRequests, purchases, subscriptions,
  certificates, allowance, appointmentAllowances, cohortEnrolments, assignmentSubmissions, memberships, pastMemberships, lessonNotes,
} from '@/data/account.js'
import { bookedAppointments } from '@/data/dashboard-extra.js'
import { appointmentTypes } from '@/data/appointments.js'
import { prepareSlots, slotOpen } from '@/components/booking/slots.js'
import { tickets, eventPlaces } from '@/data/event-registrations.js'
import { getPlan, membershipGroup, successPaths } from '@/data/plans.js'
import { getProduct, listProducts, openHref, productHref } from '@/lib/products.js'
import { getLibraryItem, libraryHref } from '@/lib/library.js'
import { siteAccess } from '@/lib/access.js'
import { money, TAX_RATE } from '@/lib/commerce.js'
import { bundleProgress } from '@/components/course/bundle.js'
import { localDate } from '@/components/product/time.js'
import { occurrences } from '@/components/event/dates.js'
import { quizSummary } from '@/data/quizzes.js'
import { lessonHref } from '@/components/player/lesson-types.js'

const ms = (iso) => (iso ? new Date(iso).getTime() : 0)
const isMember = (viewer) => viewer.role !== 'visitor' && Boolean(viewer.plan)

// "14 Oct 2026"
export const fullDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
// "Thu 22 Oct"
export const shortDate = (iso) => localDate(iso)

// ---------------------------------------------------------------- Orders

const METHOD = { card: 'Visa ending 4242', paypal: 'PayPal', bank: 'Bank transfer' }

function lineFor(line) {
  // A line with its own title (an upsell's one-click add-on, like a 1:1 follow-up).
  if (line.title) return { title: line.title, detail: line.note, amount: line.amount, role: line.role || null }
  if (line.ref === 'site-access') {
    const price = siteAccess.prices.find((p) => p.id === line.priceId) || siteAccess.prices[0]
    return { title: `${siteAccess.name} (${price.label.toLowerCase()})`, detail: 'Renews every year', amount: price.amount }
  }
  if (line.ref) {
    const it = getLibraryItem(line.ref)
    return { title: it?.title || line.ref, detail: line.note || `Library ${it?.kind || 'item'}`, amount: line.amount ?? it?.prices[0]?.amount ?? 0, ref: line.ref, role: line.role || null }
  }
  const product = getProduct(line.slug)
  const price = product.prices.find((p) => p.id === line.priceId) || product.prices[0]
  return { title: product.title, detail: line.note || price?.label, amount: price?.amount || 0, slug: product.slug }
}

function buildOrder({ id, at, lines, coupon, status, method = 'card', note, refund, reference, kind = 'purchase', cart = false }) {
  const subtotal = lines.reduce((n, l) => n + l.amount, 0)
  const discount = coupon ? coupon.amount : 0
  const total = subtotal - discount
  const tax = total * TAX_RATE / (1 + TAX_RATE)
  return {
    id, at, date: fullDate(at), kind, cart,
    title: lines.length > 1 ? `${lines[0].title} and ${lines.length - 1} more` : lines[0].title,
    lines: lines.map((l) => ({ ...l, amountLabel: money(l.amount) })),
    subtotal: money(subtotal), discount: coupon ? { code: coupon.code, amount: `−${money(discount)}` } : null,
    tax: money(tax), total: money(total), totalAmount: total,
    status, method: METHOD[method] || method, methodKind: method, note: note || null, reference: reference || null,
    // What the refund was for: the item (and why, briefly), nothing else.
    refund: refund ? { amount: money(refund.amount), date: fullDate(refund.at), for: refund.for || null } : null,
  }
}

// Every order, newest first: purchases, event tickets, paid appointments and (members) the
// membership's monthly charges.
export function ordersFor(viewer, changes = {}) {
  if (viewer.role === 'visitor') return []
  const list = purchases.map((p) => buildOrder({ ...p, lines: p.lines.map(lineFor) }))

  for (const [slug, t] of Object.entries(tickets)) {
    if (!t.boughtAt || t.order) continue // bought in a cart: that order lists it
    const product = getProduct(slug)
    const price = product?.prices.find((p) => p.id === t.price)
    if (!price || !price.amount) continue
    const count = t.dates ? t.dates.length : 1
    const detail = t.dates ? `${count} evenings · ${price.price.amount} each` : `${price.label} · ticket ${t.number}`
    list.push(buildOrder({
      id: `HH-${t.number.slice(-5)}`, at: t.boughtAt, kind: 'ticket',
      lines: [{ title: product.title, detail, amount: price.amount * count, slug }],
      status: t.status === 'Refunded' ? 'Refunded' : 'Paid',
      refund: t.status === 'Refunded' ? { amount: price.amount * count, at: t.boughtAt, for: `your ${product.title} ticket (the event was cancelled)` } : null,
    }))
  }

  for (const a of bookedAppointments) {
    if (!a.order || !a.amount || (a.allowance && isMember(viewer))) continue
    list.push(buildOrder({
      id: a.order, at: a.booked, kind: 'appointment',
      lines: [{ title: a.title, detail: `Appointment · ${shortDate(a.startsAt)} with ${a.host}`, amount: a.amount }],
      status: a.refunded ? 'Refunded' : 'Paid',
      refund: a.refunded ? { amount: a.amount, at: a.refunded, for: `your ${a.title.toLowerCase()} on ${shortDate(a.startsAt)} (you cancelled it)` } : null,
    }))
  }

  if (isMember(viewer)) {
    for (const m of [...memberships, ...pastMemberships]) {
      const plan = getPlan(m.planId)
      for (const c of m.charges) {
        list.push(buildOrder({ id: c.id, at: c.at, kind: 'membership', lines: [{ title: `${plan.name} membership`, detail: c.label, amount: c.amount }], status: 'Paid' }))
      }
    }
    // An upgrade made from the dashboard: the difference charged today.
    for (const m of memberships) {
      const sw = changes[m.id]?.switch
      if (sw?.when === 'now' && sw.paidToday > 0) {
        list.push(buildOrder({ id: `HH-${10600 + m.id.length}`, at: sw.at, kind: 'membership', lines: [{ title: `${sw.planName} membership`, detail: `Upgrade from ${sw.fromName || getPlan(m.planId).name} · the difference for the rest of this period`, amount: sw.paidToday }], status: 'Paid' }))
      }
    }
  }
  return list.sort((a, b) => ms(b.at) - ms(a.at))
}

// Orders waiting on the student (a bank transfer to send).
export const pendingOrders = (viewer) => ordersFor(viewer).filter((o) => o.status === 'Pending')

// Subscriptions and payment plans this viewer has.
export const subscriptionsFor = (viewer) => (viewer.role === 'visitor' ? [] : subscriptions.filter((s) => !s.memberOnly || isMember(viewer)))

// ---------------------------------------------------------------- My library

// The type chips, in this order. Only the ones the student has are shown.
export const LIBRARY_TYPES = [
  { value: 'course', label: 'Programmes', icon: 'book' },
  { value: 'cohort', label: 'Cohorts', icon: 'users' },
  { value: 'bundle', label: 'Paths', icon: 'sparkle' },
  { value: 'media', label: 'Audio and video', icon: 'headphones' },
  { value: 'files', label: 'Library files', icon: 'file' },
  { value: 'newsletter', label: 'Newsletters', icon: 'mail' },
  { value: 'community', label: 'Community', icon: 'heart' },
  { value: 'coaching', label: 'Coaching', icon: 'user' },
]
const GROUP = { course: 'course', cohort: 'cohort', bundle: 'bundle', 'media-library': 'media', 'asset-library': 'files', newsletter: 'newsletter', community: 'community', coaching: 'coaching' }

export const SOURCES = [
  { value: 'bought', label: 'Bought' },
  { value: 'free', label: 'Free' },
  { value: 'plan', label: 'From membership' },
  { value: 'bundle', label: 'From a bundle' },
  { value: 'gift', label: 'Gift' },
]

// Status filter. 'open' items have no progress to track (newsletters, files, community).
export const STATUSES = [
  { value: 'in-progress', label: 'In progress' },
  { value: 'not-started', label: 'Not started' },
  { value: 'completed', label: 'Completed' },
  { value: 'upcoming', label: 'Coming up' },
  { value: 'action', label: 'Needs you' },
  { value: 'locked', label: 'Locked' },
]

const accessText = (until, source, product) => {
  if (source === 'plan') return 'While your membership is active'
  if (until) return `Access until ${fullDate(until)}`
  if (product?.type === 'newsletter' || product?.prices?.every((p) => p.kind === 'subscription')) return 'While you’re subscribed'
  return 'Lifetime access'
}

function productItem(product, source, viewer) {
  const e = enrolments[product.slug] || {}
  const group = GROUP[product.type]
  const p = progress[product.slug]
  const locked = viewer.siteAccess === 'ended' && siteAccess.whenEnds === 'lock' && source !== 'plan' && source !== 'free'
  const item = {
    key: product.slug, product, group, source, title: product.title, image: product.image,
    href: openHref(product), detailsHref: productHref(product),
    addedAt: e.added || null, lastOpenedAt: p?.lastOpenedAt || mediaProgress[product.slug]?.lastOpenedAt || null,
    access: accessText(e.accessUntil, source, product), accessUntil: e.accessUntil || null,
    percent: null, status: 'open', line: null, search: product.title, cert: null,
  }

  if (product.type === 'course') {
    item.percent = p?.percent ?? 0
    item.status = item.percent >= 100 ? 'completed' : item.percent > 0 ? 'in-progress' : 'not-started'
    item.cert = certificates.find((c) => c.slug === product.slug) || null
    const sub = e.subscription && subscriptions.find((x) => x.id === e.subscription)
    if (sub?.status === 'Trialing') item.line = `Free trial until ${fullDate(sub.nextAt)}, then ${sub.price}`
    if (product.availability === 'pre-order' && item.percent === 0) {
      item.status = 'upcoming'
      item.line = `Pre-ordered · opens ${product.releases}. We’ll email you when it does.`
      item.href = productHref(product)
    }
  } else if (product.type === 'cohort') {
    const run = product.cohort?.runs.find((r) => r.id === cohortEnrolments[product.slug])
    item.percent = p?.percent ?? 0
    item.status = item.percent >= 100 ? 'completed' : run && ms(run.start) > Date.now() ? 'upcoming' : item.percent > 0 ? 'in-progress' : 'not-started'
    item.line = run ? `${run.name} cohort · ${product.cohort.schedule}` : null
  } else if (product.type === 'bundle') {
    const b = bundleProgress(product)
    item.percent = b.percent
    item.status = b.complete ? 'completed' : b.percent > 0 ? 'in-progress' : 'not-started'
    item.courses = b.courses
    item.line = `${b.doneCount} of ${b.courses.length} courses complete${b.current ? ` · Up next: ${b.current.product.title}` : ''}`
    item.search += ' ' + b.courses.map((c) => c.product.title).join(' ')
    item.lastOpenedAt = b.courses.map((c) => progress[c.product.slug]?.lastOpenedAt).filter(Boolean).sort().pop() || null
    item.files = (product.library || []).map(getLibraryItem).filter(Boolean)
  } else if (product.type === 'media-library') {
    const total = (product.mediaLibrary?.episodes || []).filter((x) => !x.divider).length
    const played = mediaProgress[product.slug]?.played || 0
    item.percent = total ? Math.round((played / total) * 100) : 0
    item.status = played >= total && total ? 'completed' : played > 0 ? 'in-progress' : 'not-started'
    item.line = `${played} of ${total} ${product.mediaLibrary?.format === 'video' ? 'classes' : 'sessions'} played`
  } else if (product.type === 'newsletter') {
    const sub = subscriptions.find((s) => s.slug === product.slug)
    item.line = sub ? `${sub.tier} · ${sub.detail || `renews ${sub.next}`}` : 'Free edition'
  } else if (product.type === 'community') {
    item.line = 'Opens in The Healing Circle app'
  }
  if (locked) { item.status = 'locked'; item.line = 'Renew site access to open this again. Your progress is kept.' }
  return item
}

function libraryFileItem(ref, source) {
  const it = getLibraryItem(ref)
  if (!it) return null
  const e = enrolments[ref] || {}
  return {
    key: ref, libRef: ref, group: 'files', kindLabel: `Library ${it.kind}`, source, title: it.title, image: it.image, href: libraryHref(ref),
    addedAt: e.added || null, lastOpenedAt: null, access: source === 'plan' ? 'While your membership is active' : 'Lifetime access',
    percent: null, status: 'open', line: it.detail, search: it.title, cert: null,
  }
}

// Everything the student has, one item each. Courses inside a bundle sit inside its path, not on
// their own (search still finds them). Membership items come from the plan's contents.
export function libraryItems(viewer) {
  if (viewer.role === 'visitor') return []
  const items = []
  for (const slug of owned) {
    const product = getProduct(slug)
    if (product) items.push(productItem(product, enrolments[slug]?.source || 'bought', viewer))
  }
  const held = heldPlanIds(viewer)
  for (const product of listProducts()) {
    if (product.visibility !== 'membership' || product.type === 'event' || !held.some((id) => !product.plans || product.plans.includes(id))) continue
    items.push({ ...productItem(product, 'plan', viewer), planIds: held.filter((id) => !product.plans || product.plans.includes(id)) })
  }
  for (const ref of ownedLibrary) items.push(libraryFileItem(ref, 'bought'))
  for (const slug of owned) for (const ref of getProduct(slug)?.library || []) items.push(libraryFileItem(ref, 'bundle'))
  for (const id of held) {
    for (const ref of getPlan(id).contents || []) items.push({ ...libraryFileItem(ref, 'plan'), planIds: [id] })
  }
  if (held.some((id) => ['essentials', 'supported', 'founding'].includes(id))) items.push({ ...libraryFileItem('category:breathwork', 'plan'), planIds: held.filter((id) => id !== 'gut-health-club') })

  // Waiting on the student: a request to join, and a bank transfer to send.
  for (const r of accessRequests) {
    const product = getProduct(r.slug)
    items.push({
      key: `request:${r.slug}`, product, group: GROUP[product.type], source: 'request', title: product.title, image: product.image,
      href: productHref(product), addedAt: r.sentAt, lastOpenedAt: null, access: null, percent: null, status: 'action',
      line: r.status === 'Link sent' ? 'Approved. Complete your place before the link expires.' : `Request sent ${r.sent}. We’ll email you when it’s approved.`,
      search: product.title, cert: null, request: r,
    })
  }
  for (const o of pendingOrders(viewer)) {
    for (const l of o.lines.filter((x) => x.ref)) {
      const it = libraryFileItem(l.ref, 'bought')
      items.push({ ...it, key: `pending:${l.ref}`, status: 'action', access: null, href: '/student/dashboard/profile/payments?tab=pending', line: `Waiting for your bank transfer · reference ${o.reference}`, order: o })
    }
  }
  return items.filter(Boolean)
}

// Recently opened first, items never opened after.
export const byLastOpened = (a, b) => ms(b.lastOpenedAt) - ms(a.lastOpenedAt) || ms(b.addedAt) - ms(a.addedAt)

// ---------------------------------------------------------------- Bookings

// Appointments and event dates together: { kind, id, title, start, end, status, appt | entry }.
// Each event date is its own booking, so the calendar shows every evening of a series.
export function bookingsFor(viewer, eventEntries = []) {
  if (viewer.role === 'visitor') return []
  const list = bookedAppointments.map((a) => ({
    kind: 'appointment', id: a.id, title: a.title, start: ms(a.startsAt), end: ms(a.endsAt), status: a.status,
    appt: { ...a, paidWith: a.allowance && isMember(viewer) ? `${getPlan(viewer.plan)?.name} allowance` : a.amount ? money(a.amount) : 'Free' },
  }))
  for (const entry of eventEntries) {
    const ev = entry.product.event
    let occ = occurrences(ev)
    if (entry.ticket?.dates) occ = occ.filter((o) => entry.ticket.dates.includes(o.key))
    for (const o of occ) {
      list.push({ kind: 'event', id: `${entry.product.slug}:${o.key}:${o.start}`, title: entry.product.title, start: o.start, end: o.end, status: entry.cancelled ? 'Cancelled' : entry.ticket?.status, entry, occ: o })
    }
  }
  return list.sort((a, b) => a.start - b.start)
}

// ---------------------------------------------------------------- Membership

const DAY = 86400000
// Has the member done this step? Each kind ticks itself off from the account (custom: ticked by hand).
function stepDone(step, ticked = []) {
  if (step.kind === 'media') return (mediaProgress[step.target]?.played || 0) > 0
  if (step.kind === 'appointment') return bookedAppointments.some((a) => a.slug === step.target && a.status === 'Completed')
  if (step.kind === 'course') return (progress[step.target]?.percent || 0) >= 100
  if (step.kind === 'custom') return ticked.includes(step.id)
  return false
}

function stepHref(step) {
  if (step.kind === 'appointment') return `/appointment/${step.target}`
  const p = step.target && getProduct(step.target)
  return p ? openHref(p) : null
}

const priceOf = (plan, priceId) => plan.prices[priceId] || Object.values(plan.prices)[0]
const priceText = (price) => (price.price.interval ? `${price.price.amount} / ${price.price.interval}` : price.price.amount)
const inGroup = (id) => membershipGroup.tiers.includes(id)

// The plans the member holds now (after any upgrade they've just made).
export function heldPlanIds(viewer, changes = {}) {
  if (!isMember(viewer)) return []
  return memberships.map((m) => (changes[m.id]?.switch?.when === 'now' ? changes[m.id].switch.planId : m.planId))
}

// What switching to another plan or price means right now: when it starts, what's charged today
// (the difference for the days left, when the group prorates), and what's gained or lost.
export function switchQuote(m, plan, priceId, now = Date.now()) {
  const from = m.plan
  const fromPrice = priceOf(from, m.priceId)
  const toPrice = priceOf(plan, priceId)
  const samePlan = plan.id === from.id
  const up = samePlan ? toPrice.amount > fromPrice.amount : plan.tier > from.tier
  // A price change (monthly to yearly) starts at the next renewal; tiers follow the group's settings.
  const when = samePlan ? 'end' : up ? membershipGroup.up === 'now' ? 'now' : 'end' : membershipGroup.down === 'now' ? 'now' : 'end'
  const daysLeft = Math.max(0, Math.round((new Date(m.nextAt) - now) / DAY))
  const perMonth = (p) => (p.price.interval === 'year' ? p.amount / 12 : p.amount)
  const paidToday = when === 'now' && membershipGroup.prorate ? Math.max(0, Math.round((perMonth(toPrice) - perMonth(fromPrice)) * (daysLeft / 30) * 100) / 100) : 0
  const opens = (id) => listProducts().filter((p) => p.visibility === 'membership' && p.type !== 'event' && p.plans?.includes(id)).map((p) => p.title)
  const gains = opens(plan.id).filter((t) => !opens(from.id).includes(t))
  const loses = opens(from.id).filter((t) => !opens(plan.id).includes(t))
  const allowanceLost = (from.allowances?.monthly?.length && !plan.allowances?.monthly?.length) ? from.allowances.monthly : []
  const allowanceGained = (!from.allowances?.monthly?.length && plan.allowances?.monthly?.length) ? plan.allowances.monthly : []
  return {
    plan, priceId, price: toPrice, priceLabel: priceText(toPrice), direction: samePlan ? 'price' : up ? 'up' : 'down', when, daysLeft,
    paidToday, paidTodayLabel: money(paidToday), startsAt: when === 'now' ? new Date(now).toISOString() : m.nextAt,
    gains: [...gains, ...allowanceGained], loses: [...loses, ...allowanceLost],
  }
}

// The appointments a plan includes, each with its own limit this billing period and its next open
// times (the appointment's calendar), so the member can pick one straight away.
function includedSessions(planId) {
  return appointmentTypes.filter((t) => t.listed !== false && t.includedIn?.plans.includes(planId)).map((type) => {
    const a = appointmentAllowances.find((x) => x.slug === type.slug) || { perPeriod: 1, used: 0 }
    const open = prepareSlots(type, { now: Date.now() }).filter(slotOpen)
    return { type, total: a.perPeriod, used: a.used, left: Math.max(0, a.perPeriod - a.used), next: open.slice(0, 4), resets: allowance.resets }
  })
}

// Every membership the member holds, with its plan, price, status, contents, allowances, first
// steps, the plans they can switch to, and any change waiting (a downgrade or a cancellation).
export function membershipsFor(viewer, changes = {}, { previewTier } = {}) {
  if (!isMember(viewer)) return []
  const items = libraryItems(viewer)
  return memberships.map((base) => {
    const change = changes[base.id] || {}
    const switched = change.switch?.when === 'now' ? change.switch : null
    const planId = switched ? switched.planId : previewTier && inGroup(base.planId) ? previewTier : base.planId
    const priceId = switched ? switched.priceId : base.priceId
    const plan = getPlan(planId)
    const price = priceOf(plan, priceId)
    const path = successPaths[plan.id]
    // Previewing an earlier tier (?tier=) shows the history up to before the upgrade.
    const baseHistory = previewTier && !switched && planId !== base.planId ? base.history.filter((h) => !h.text.startsWith('Upgraded')) : base.history
    const m = {
      ...base, plan, priceId, price, priceLabel: priceText(price), grouped: inGroup(plan.id),
      included: items.filter((i) => i.source === 'plan' && i.planIds?.includes(plan.id)),
      allowance: plan.allowances?.monthly?.length ? allowance : null,
      sessions: includedSessions(plan.id),
      eventPlaces: plan.id === 'supported' || plan.id === 'founding' ? eventPlaces : null,
      steps: path?.show ? path.steps.map((st) => ({
        ...st, done: stepDone(st, changes.ticked), href: stepHref(st),
        then: st.then ? getProduct(st.then) : null,
        note: st.kind === 'appointment' ? bookedAppointments.find((a) => a.slug === st.target && ms(a.startsAt) > Date.now()) : null,
      })) : null,
      finish: path?.finish ? { message: path.finish.message, product: getProduct(path.finish.recommend) } : null,
      pendingSwitch: change.switch?.when === 'end' ? change.switch : null,
      cancel: change.cancel || null,
      offer: change.offer || null,
      history: switched ? [...base.history.filter((h) => !previewTier || !h.text.startsWith('Upgraded')), { at: switched.at, text: `Upgraded to ${plan.name}. Paid ${money(switched.paidToday)} for the rest of this period` }] : baseHistory,
    }
    m.status = change.cancel ? 'Cancelling' : change.offer?.result?.status || base.status
    // "Users can switch plans from their account": the other tiers and prices in its group.
    m.switchTo = m.grouped && membershipGroup.self
      ? membershipGroup.tiers.map(getPlan).flatMap((p) => Object.keys(p.prices).filter((pid) => pid !== 'lifetime').map((pid) => ({ plan: p, priceId: pid })))
        .filter((o) => !(o.plan.id === plan.id && o.priceId === priceId))
      : []
    return m
  })
}

export const endedMembershipsFor = (viewer) => (isMember(viewer) ? pastMemberships.map((p) => ({ ...p, plan: getPlan(p.planId) })) : [])

// The first membership, for Home's summary.
export const membershipFor = (viewer, changes) => membershipsFor(viewer, changes)[0] || null

// ---------------------------------------------------------------- Profile

const average = (list) => (list.length ? Math.round(list.reduce((n, x) => n + x, 0) / list.length) : null)

// Quiz and assignment results (the admin's Submissions gradebook): every quiz the student has
// attempted and every assignment they've sent, newest first, plus the averages. A quiz counts
// its best attempt; an assignment counts once it's marked.
export function resultsFor(viewer) {
  const courses = libraryItems(viewer).flatMap((i) => [
    ...(i.product && ['course', 'cohort'].includes(i.product.type) ? [i.product] : []),
    ...(i.courses || []).map((c) => c.product),
  ])
  const rows = []
  for (const course of courses) {
    for (const lesson of (course.curriculum || []).flatMap((ch) => ch.lessons)) {
      if (lesson.type !== 'quiz') continue
      const q = quizSummary(course.slug, lesson.id)
      if (!q?.history.length) continue
      const best = Math.max(...q.history.map((a) => a.score))
      // One row per attempt (each is a submission in the admin's gradebook).
      q.history.forEach((at, i) => rows.push({
        key: `${course.slug}:${lesson.id}:${at.id}`, kind: 'Quiz', title: lesson.title, programme: course.title, quizKey: lesson.id,
        // Only submitted attempts are listed. Passed, below the pass mark, or waiting for a person to mark
        // answers that could still lift it over the pass mark.
        score: at.score, best: at.score === best, status: at.passed ? 'Passed' : at.needsReview ? 'Waiting for marking' : 'Below pass mark',
        passMark: q.quiz.settings.passMark, waiting: at.waiting,
        attempts: Number.isFinite(q.allowed) ? `${i + 1} of ${q.allowed}` : String(i + 1),
        at: at.submittedAt, href: lessonHref(course.slug, lesson.id),
      }))
    }
  }
  for (const a of assignmentSubmissions) {
    const course = getProduct(a.slug)
    const lesson = (course?.curriculum || []).flatMap((ch) => ch.lessons).find((l) => l.id === a.lessonId)
    if (!course || !lesson || !courses.includes(course)) continue
    rows.push({
      key: `${a.slug}:${a.lessonId}`, kind: 'Assignment', title: lesson.title, programme: course.title,
      score: a.status === 'Marked' ? a.score : null, status: a.status === 'Marked' ? 'Marked' : 'Waiting for marking',
      attempts: String(a.attempt), at: a.submittedAt,
      href: lessonHref(a.slug, a.lessonId),
    })
  }
  rows.sort((a, b) => ms(b.at) - ms(a.at))
  // A quiz counts its best attempt; an assignment counts once it's marked.
  const bestPerQuiz = Object.values(rows.filter((r) => r.kind === 'Quiz').reduce((m, r) => ({ ...m, [r.quizKey]: Math.max(m[r.quizKey] ?? 0, r.score) }), {}))
  return {
    rows,
    quizAverage: average(bestPerQuiz),
    assignmentAverage: average(rows.filter((r) => r.kind === 'Assignment' && r.score != null).map((r) => r.score)),
    quizzes: bestPerQuiz.length,
    assignments: rows.filter((r) => r.kind === 'Assignment').length,
  }
}

// ---------------------------------------------------------------- Notes

// Every lesson note the student wrote, grouped by programme, newest first. The player keeps notes in
// this browser per course (falling back to the account's), so this reads the same place.
export function notesFor(viewer) {
  const read = (slug) => {
    try { return JSON.parse(localStorage.getItem(`halvera-lesson-notes:${slug}`)) || lessonNotes[slug] || {} } catch { return lessonNotes[slug] || {} }
  }
  const slugs = [...new Set([...Object.keys(lessonNotes), ...libraryItems(viewer).filter((i) => i.product && i.group === 'course').map((i) => i.key)])]
  return slugs.map((slug) => {
    const product = getProduct(slug)
    const lessons = (product?.curriculum || []).flatMap((ch) => ch.lessons)
    const notes = Object.entries(read(slug)).flatMap(([lessonId, list]) => list.map((n) => ({ ...n, lessonId, lesson: lessons.find((l) => l.id === lessonId), href: lessonHref(slug, lessonId) })))
    return { slug, product, notes: notes.sort((a, b) => b.at - a.at) }
  }).filter((g) => g.product && g.notes.length)
}

// ---------------------------------------------------------------- Credits

// Sessions bought as an add-on (a one-click upsell like "1:1 follow-up") that are still to be booked.
// They can be booked within 3 months of the order.
export function appointmentCreditsFor(viewer) {
  if (viewer.role === 'visitor') return []
  return purchases.flatMap((p) => p.lines.filter((l) => l.credit).map((l) => ({
    slug: l.credit, title: l.title, order: p.id, bookBy: new Date(ms(p.at) + 90 * 86400000).toISOString(),
  })))
}
