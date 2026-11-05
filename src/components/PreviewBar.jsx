import { useState } from 'react'
import { IconButton, Icon, SegmentedToggle, Switch } from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { siteAccess, setSiteAccessEnabled } from '@/lib/access.js'
import { coupons, automaticDiscounts, codeCombinesWith, MAX_CODES } from '@/lib/commerce.js'
import { knownAccounts } from '@/data/checkout.js'
import './preview-bar.css'

// Theme preview only: switch who is looking at the site, and the school's access gate setting, to
// check every state.
// Not part of a school's site.
export default function PreviewBar() {
  const { viewer, setRole, update } = useViewer()
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button type="button" className="pv-fab" onClick={() => setOpen(true)}>
        <Icon name="eye" size={18} />
        <span>Preview as: {viewer.role === 'visitor' ? 'Visitor' : viewer.role === 'member' ? 'Member' : 'Student'}</span>
      </button>
    )
  }

  return (
    <aside className="pv-panel" aria-label="Theme preview">
      <div className="pv-head">
        <strong>Theme preview</strong>
        <IconButton icon="x" label="Close preview" size="sm" onClick={() => setOpen(false)} />
      </div>
      <div className="pv-group">
        <span className="pv-label">View the site as</span>
        <SegmentedToggle
          label="View the site as"
          value={viewer.role}
          onChange={setRole}
          options={[{ value: 'visitor', label: 'Visitor' }, { value: 'student', label: 'Student' }, { value: 'member', label: 'Member' }]}
        />
      </div>
      <div className="pv-group">
        <span className="pv-label">School settings</span>
        <Switch
          label="Require site access to buy"
          description="The access gate, for the whole site. Changing it reloads the page."
          checked={siteAccess.enabled}
          onChange={(on) => setSiteAccessEnabled(on)}
        />
      </div>
      {viewer.role !== 'visitor' && (
        <>
          {siteAccess.enabled && <div className="pv-group">
            <span className="pv-label">Site access</span>
            <SegmentedToggle
              label="Site access"
              value={viewer.siteAccess}
              onChange={(siteAccess) => update({ siteAccess })}
              options={[{ value: 'none', label: 'None' }, { value: 'active', label: 'Active' }, { value: 'ended', label: 'Ended' }]}
            />
          </div>}
          <Switch
            label="Email confirmed"
            checked={viewer.verified}
            onChange={(verified) => update({ verified })}
          />
        </>
      )}

      <details className="pv-coupons">
        <summary>Coupon codes to try at checkout</summary>
        <p className="pv-coupons-note">Up to {MAX_CODES} codes per checkout, when they combine. {automaticDiscounts.map((a) => `${a.name} (${a.label})`).join(', ')} is added automatically.</p>
        <dl>
          {Object.entries(coupons).map(([code, c]) => (
            <div key={code}>
              <dt className="sg-code">{code}</dt>
              <dd>
                {c.label}
                {!c.ended && (() => {
                  const pairs = Object.keys(coupons).filter((o) => o !== code && !coupons[o].ended && codeCombinesWith(code, coupons[o]))
                  return <span className="pv-coupons-stack">{pairs.length ? `Combines with ${pairs.join(', ')}` : 'Doesn’t combine with other codes'}</span>
                })()}
                {!c.ended && automaticDiscounts.map((a) => (
                  <span key={a.id} className="pv-coupons-stack">{codeCombinesWith(code, a) ? `Stacks with ${a.name}` : `Doesn’t combine with ${a.name}`}</span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </details>

      <details className="pv-coupons">
        <summary>Accounts to try at checkout</summary>
        <p className="pv-coupons-note">These emails already have an account, so checkout asks for the password (any works; “wrong” shows the error). Any other email creates a new account.</p>
        <dl>
          {knownAccounts.map((a) => <div key={a.email}><dt className="sg-code">{a.email}</dt><dd>{a.name}</dd></div>)}
        </dl>
      </details>

      <a className="pv-link" href="/theme-states">Every page and state<Icon name="arrow-right" size={16} /></a>
    </aside>
  )
}
