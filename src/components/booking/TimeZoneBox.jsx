// Practitioner and visitor time zones, with a "Show times in" switch.
import { Icon, Select } from '@/design-system'
import { zoneLabel } from './time.js'

const COMMON = ['America/Los_Angeles', 'America/New_York', 'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Dhaka', 'Asia/Singapore', 'Australia/Sydney', 'UTC']

export default function TimeZoneBox({ zone, onZoneChange, practitionerZone, visitorZone, at }) {
  const zones = [...new Set([visitorZone, practitionerZone, zone, ...COMMON])]
  const options = zones.map((z) => ({
    value: z,
    label: `${zoneLabel(z, at)}${z === visitorZone ? ' (you)' : z === practitionerZone ? ' (practitioner)' : ''}`,
  }))
  return (
    <div className="bk-tz">
      <ul className="bk-tz-list t-body-sm">
        <li><Icon name="user" size={16} /><span><span className="t-muted">Practitioner · </span>{zoneLabel(practitionerZone, at)}</span></li>
        <li><Icon name="globe" size={16} /><span><span className="t-muted">You · </span>{zoneLabel(visitorZone, at)}</span></li>
      </ul>
      <Select label="Show times in" options={options} value={zone} onChange={(e) => onZoneChange(e.target.value)} />
    </div>
  )
}
