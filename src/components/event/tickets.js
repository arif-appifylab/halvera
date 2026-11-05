// Ticket helpers shared by the ticket page and the dashboard's Tickets page: what cancelling
// means for this ticket (refund rules).
const DAY = 86400000
export const REFUND_DAYS = 14

// The modal's explanation before cancelling.
export function cancelDetail(ticket, startsIn) {
  const paid = ticket.status === 'Paid'
  if (ticket.viaPlace) return 'Your event place goes back into this month’s allowance, so you can use it for another event.'
  if (paid && startsIn >= REFUND_DAYS * DAY) return 'You’ll get a full refund to your original payment method. It can take 5–10 working days to show.'
  if (paid) return `Tickets can’t be refunded within ${REFUND_DAYS} days of the event. If you’d like to pass yours to a friend, reply to your ticket email instead.`
  return 'Your place goes to the next person on the waitlist, if there is one.'
}

// The confirmation once cancelled (null: the default "place has gone back" message).
export function cancelRefund(ticket, price, startsIn) {
  if (ticket.status === 'Paid') {
    return startsIn >= REFUND_DAYS * DAY
      ? `We’ve refunded your ${price?.price?.amount && !price.perDate ? `${price.price.amount} ` : ''}ticket to your original payment method. It can take 5–10 working days to show.`
      : `Your place has gone to the next person on the waitlist. Tickets can’t be refunded within ${REFUND_DAYS} days of the event.`
  }
  if (ticket.viaPlace) return 'Your event place is back in this month’s allowance.'
  return null
}
