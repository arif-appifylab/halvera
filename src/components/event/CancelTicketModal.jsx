// "Cancel your registration?" for an event ticket, on the ticket page and the dashboard.
import { Button, Modal } from '@/design-system'
import { dateLine } from './eventState.js'
import { cancelDetail } from './tickets.js'

export default function CancelTicketModal({ open, onClose, onConfirm, product, ticket, startsIn }) {
  if (!ticket) return null
  return (
    <Modal
      open={open} onClose={onClose} title="Cancel your registration?" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Keep my place</Button><Button variant="danger" onClick={onConfirm}>Cancel registration</Button></>}
    >
      <p>{product.title}, {dateLine(product.event)}.</p>
      <p className="t-muted">{cancelDetail(ticket, startsIn)}</p>
    </Modal>
  )
}
