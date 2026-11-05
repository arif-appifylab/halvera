import { useEffect, useMemo, useState } from 'react'
import {
  Badge, Button, Card, Checkbox, Icon, Modal, Notice, OtpInput, PasswordRules, RadioCard, StatusBadge, Switch, Tabs, TextField,
} from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import {
  alwaysSent, devices as initialDevices, languageOptions, marketingTopics, maxDevices, notificationGroups, twoStep,
} from '@/data/dashboard-extra.js'
import SocialButtons from '@/components/SocialButtons.jsx'
import { qrMatrix, qrPath } from '@/lib/qr.js'
import { school } from '@/data/school.js'
import './account-pages.css'

const TABS = [
  { value: 'account', label: 'Account' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'security', label: 'Security' },
]

// A small "Saved" note that fades out; the live region stays mounted so it is announced.
function useSaved() {
  const [savedAt, setSavedAt] = useState(0)
  useEffect(() => {
    if (!savedAt) return undefined
    const t = setTimeout(() => setSavedAt(0), 2500)
    return () => clearTimeout(t)
  }, [savedAt])
  return [!!savedAt, () => setSavedAt(Date.now())]
}

const Saved = ({ show }) => (
  <span className="ap-saved t-body-sm" role="status">
    {show && <><Icon name="check" size={16} />Saved</>}
  </span>
)

// ---------------------------------------------------------------- Account

// Sign-in email and connected sign-ins. Name, phone and the rest are on the Profile tab. The time
// zone isn't set here: the platform takes it from the browser at sign-up and sign-in.
function AccountTab({ viewer }) {
  const [email, setEmail] = useState(viewer.email)
  const [error, setError] = useState('')
  const [sent, setSent] = useState('')
  const [resent, setResent] = useState(false)
  const [google, setGoogle] = useState(true)
  const [connecting, setConnecting] = useState(false)

  const changeEmail = (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter an email address like name@example.com')
    setError('')
    if (email !== viewer.email) setSent(email)
  }

  return (
    <>
      <Card as="form" className="pg-stack-sm" onSubmit={changeEmail} noValidate aria-labelledby="ap-email-title">
        <h2 id="ap-email-title" className="t-heading-4">Email</h2>
        <TextField
          label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error}
          hint={error ? undefined : 'You sign in with this, and receipts go here. Changing it sends a code to the new address first.'}
        />
        <div className="ap-email-status">
          {viewer.verified ? <StatusBadge status="Verified" /> : (
            <>
              <StatusBadge status="Pending">Not confirmed</StatusBadge>
              {resent ? <span className="t-body-sm">We sent a new code to {viewer.email}. <a href="/verify-email">Enter the code</a></span>
                : <button type="button" className="sg-linkbtn" onClick={() => setResent(true)}>Resend the code</button>}
            </>
          )}
        </div>
        {sent && <Notice tone="info" title="Check your new inbox">We sent a 6-digit code to {sent}. Your email changes once you enter it. <a href="/verify-email">Enter the code</a></Notice>}
        <div><Button type="submit" variant="secondary">Change email</Button></div>
      </Card>

      <Card className="pg-stack-sm" aria-labelledby="ap-connected-title">
        <h2 id="ap-connected-title" className="t-heading-4">Connected sign-ins</h2>
        <p className="t-body-sm t-muted">Sign in with one of these instead of your password.</p>
        {google ? (
          <div className="ap-device">
            <span className="ap-method-icon"><Icon name="globe" size={20} /></span>
            <div className="ap-method-text"><p className="t-strong">Google</p><p className="t-body-sm t-muted">{viewer.email}</p></div>
            <Button variant="ghost" size="sm" onClick={() => setGoogle(false)}>Disconnect</Button>
          </div>
        ) : connecting ? (
          <SocialButtons row onPick={() => { setGoogle(true); setConnecting(false) }} />
        ) : (
          <div><Button variant="secondary" size="sm" iconStart="plus" onClick={() => setConnecting(true)}>Connect an account</Button></div>
        )}
      </Card>
    </>
  )
}

function DangerZone({ onDelete }) {
  return (
    <Card className="ap-danger" aria-labelledby="ap-danger-title">
      <div className="ap-danger-text">
        <h2 id="ap-danger-title" className="t-heading-4">Delete account</h2>
        <p className="t-body-sm t-muted">Removes your profile, progress and certificates for good. Active subscriptions are cancelled.</p>
      </div>
      <Button variant="danger" onClick={onDelete}>Delete account</Button>
    </Card>
  )
}

function DeleteModal({ email, onClose, onSignOut }) {
  const [sure, setSure] = useState(false)
  const [done, setDone] = useState(false)
  return (
    <Modal
      open
      onClose={onClose}
      title={done ? 'Your account is being deleted' : 'Delete your account?'}
      size="sm"
      footer={done ? <Button onClick={onSignOut}>Sign out</Button> : (
        <>
          <Button variant="secondary" onClick={onClose}>Keep my account</Button>
          <Button variant="danger" disabled={!sure} onClick={() => setDone(true)}>Delete my account</Button>
        </>
      )}
    >
      {done ? (
        <p>We’ve emailed {email} to confirm. Your account and everything in it is removed within 7 days, and you’ll be signed out on every device.</p>
      ) : (
        <div className="pg-stack-sm">
          <p>This can’t be undone. When your account is deleted:</p>
          <ul className="pg-ticks t-body-sm">
            <li><Icon name="minus" size={16} /><span>Your programmes, progress and certificates are removed</span></li>
            <li><Icon name="minus" size={16} /><span>Active subscriptions are cancelled, with no further charges</span></li>
            <li><Icon name="minus" size={16} /><span>Purchased enrolments can’t be restored later</span></li>
          </ul>
          <p className="t-body-sm t-muted">We keep receipts for as long as the law asks us to.</p>
          <Checkbox label="I understand my account can’t be restored" checked={sure} onChange={(e) => setSure(e.target.checked)} />
        </div>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------- Notifications

// A small on/off switch for one channel of one notification (the design system's switch look).
function ChannelSwitch({ on, label, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} aria-label={label} className={'sg-switch' + (on ? ' is-on' : '')} onClick={() => onChange(!on)}>
      <span className="sg-switch-thumb" />
    </button>
  )
}

// Notifications, grouped as in the admin's student list: learning, community (the community app's own
// list; some are in-app only), appointments and events, each by email and in the app;
// then the school's marketing topics (with "Unsubscribe from all marketing"); then what always arrives.
function NotificationsTab() {
  const [groups, setGroups] = useState(notificationGroups)
  const [topics, setTopics] = useState(marketingTopics)
  const [saved, flash] = useSaved()
  const [confirm, setConfirm] = useState(false)
  const [unsubscribed, setUnsubscribed] = useState(false)
  const anyMarketing = topics.some((t) => t.on)

  const setChannel = (gid, id, channel, on) => {
    setGroups((list) => list.map((g) => (g.id !== gid ? g : { ...g, items: g.items.map((it) => (it.id === id ? { ...it, [channel]: on } : it)) })))
    flash()
  }
  const setTopic = (id, on) => { setTopics((list) => list.map((t) => (t.id === id ? { ...t, on } : t))); if (on) setUnsubscribed(false); flash() }
  const unsubscribe = () => { setTopics((list) => list.map((t) => ({ ...t, on: false }))); setConfirm(false); setUnsubscribed(true); flash() }

  return (
    <div className="pg-stack">
      <div className="pg-row-between">
        <p className="t-body-sm t-muted">Choose what you hear about, by email and in the app. Changes save as you go.</p>
        <Saved show={saved} />
      </div>

      {groups.map((g) => (
        <Card key={g.id} as="section" className="ap-notif" aria-labelledby={`nt-${g.id}`}>
          <div className="ap-notif-head">
            <div>
              <h2 id={`nt-${g.id}`} className="t-heading-4">{g.title}</h2>
              {g.note && <p className="t-body-sm t-muted">{g.note}</p>}
            </div>
            <span className="ap-notif-col" aria-hidden="true">Email</span>
            <span className="ap-notif-col" aria-hidden="true">In app</span>
          </div>
          <ul className="ap-notif-list">
            {g.items.map((it) => (
              <li key={it.id}>
                <div>
                  <p className="t-strong">{it.label}</p>
                  <p className="t-body-sm t-muted">{it.description}</p>
                </div>
                <span className="ap-notif-cell">{it.email === null ? <span className="t-caption t-muted" title="In app only">—</span> : <ChannelSwitch on={it.email} label={`${it.label} by email`} onChange={(on) => setChannel(g.id, it.id, 'email', on)} />}</span>
                <span className="ap-notif-cell">{it.inapp === null ? <span className="t-caption t-muted">—</span> : <ChannelSwitch on={it.inapp} label={`${it.label} in the app`} onChange={(on) => setChannel(g.id, it.id, 'inapp', on)} />}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <Card as="section" className="ap-switches" aria-labelledby="nt-marketing">
        <h2 id="nt-marketing" className="t-heading-4">Marketing emails</h2>
        <p className="t-body-sm t-muted">Choose the topics you’d like to hear about. You can also unsubscribe from the link in each email.</p>
        <div className="ap-switch-list">
          {topics.map((t) => <Switch key={t.id} label={t.label} description={t.description} checked={t.on} onChange={(on) => setTopic(t.id, on)} />)}
        </div>
        <div className="pg-row-between ap-unsub">
          <p className="t-body-sm t-muted">{anyMarketing ? 'Stop every newsletter and offer in one go.' : 'You’re not getting any marketing emails.'}</p>
          <Button variant="secondary" size="sm" disabled={!anyMarketing} onClick={() => setConfirm(true)}>Unsubscribe from all marketing</Button>
        </div>
      </Card>

      {unsubscribed && (
        <Notice tone="success" title="You’re unsubscribed from marketing emails" onDismiss={() => setUnsubscribed(false)}>
          Your learning, community and booking notifications are unchanged.
        </Notice>
      )}

      <Card tone="sunken" className="pg-stack-sm" aria-labelledby="nt-always">
        <h2 id="nt-always" className="t-heading-4">Always sent</h2>
        <p className="t-body-sm t-muted">These are about your account and your money, so they can’t be turned off.</p>
        <ul className="pg-ticks t-body-sm">{alwaysSent.map((a) => <li key={a}><Icon name="check" size={16} /><span>{a}</span></li>)}</ul>
      </Card>

      <Modal
        open={confirm} onClose={() => setConfirm(false)} title="Unsubscribe from all marketing?" size="sm"
        footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>Keep my emails</Button><Button onClick={unsubscribe}>Unsubscribe</Button></>}
      >
        <p>You’ll stop getting {topics.filter((t) => t.on).map((t) => t.label).join(', ')}. Your learning, community and booking notifications still arrive. You can turn any of them back on here.</p>
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------- Security

const meetsRules = (v) => v.length >= 8 && v.length <= 64 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v)

function PasswordCard() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!current) errs.current = 'Enter your current password'
    if (!meetsRules(next)) errs.next = 'Choose a password that meets every rule below'
    setErrors(errs)
    if (!Object.keys(errs).length) { setDone(true); setCurrent(''); setNext('') }
  }

  return (
    <Card as="form" className="pg-stack-sm" onSubmit={submit} noValidate aria-labelledby="ap-pw-title">
      <h2 id="ap-pw-title" className="t-heading-4">Change password</h2>
      {done && <Notice tone="success" title="Your password is updated" onDismiss={() => setDone(false)}>Use it the next time you sign in.</Notice>}
      <TextField label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current} />
      <TextField label="New password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.next} />
      <PasswordRules value={next} show={!!errors.next} />
      <div className="pg-row">
        <Button type="submit">Update password</Button>
        <a href="/forgot-password" className="t-body-sm">Forgot your current password?</a>
      </div>
    </Card>
  )
}

// Two-step verification with an authenticator app (Settings → Sign-up & login → Two-factor: "Optional
// lets each student turn it on in their profile"): scan the QR code (or type the key), enter the
// 6-digit code, and keep the backup code for when the phone isn't to hand.
function TwoStepCard({ email }) {
  const [mode, setMode] = useState('off') // off | setup | on
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const secret = twoStep.key.replace(/\s/g, '')
  const link = `otpauth://totp/${encodeURIComponent(school.name)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(school.name)}`
  const qr = useMemo(() => qrPath(qrMatrix(link)), [link])

  const onToggle = (on) => {
    setMode(on ? 'setup' : 'off')
    setCode('')
    setError('')
  }
  const confirm = () => {
    if (code.length < 6) return setError('Enter all 6 digits from your app')
    setMode('on')
  }
  const copyBackup = () => {
    try { navigator.clipboard?.writeText(twoStep.backupCode) } catch { /* clipboard blocked */ }
    setCopied(true)
  }

  return (
    <Card className="pg-stack-sm">
      <Switch
        label="Two-step verification"
        description="Ask for a 6-digit code from an authenticator app when you sign in on a new device."
        checked={mode !== 'off'}
        onChange={onToggle}
      />
      {mode === 'setup' && (
        <Card tone="sunken" className="pg-stack">
          <p className="t-strong">Finish setting it up</p>
          <div className="ap-2fa">
            {/* Fixed black on white, so every authenticator app can read it in light or dark mode. */}
            <svg className="ap-qr" viewBox={`0 0 ${qr.size} ${qr.size}`} role="img" aria-label="QR code for your authenticator app" shapeRendering="crispEdges">
              <rect width={qr.size} height={qr.size} fill="#fff" />
              <path d={qr.d} fill="#000" />
            </svg>
            <ol className="ap-steps t-body-sm">
              <li>Open an authenticator app, such as Google Authenticator or 1Password, and scan this QR code.</li>
              <li>Can’t scan it? Add the account by hand with this key: <span className="sg-code" dir="ltr">{twoStep.key}</span></li>
              <li>Enter the 6-digit code the app shows.</li>
            </ol>
          </div>
          <OtpInput value={code} onChange={(c) => { setCode(c); setError('') }} error={error} />
          <div className="ap-backup">
            <p className="t-body-sm"><span className="t-strong">Your backup code:</span> <span className="sg-code" dir="ltr">{twoStep.backupCode}</span></p>
            <p className="t-caption t-muted">Save it somewhere safe. If you don’t have your phone, you can sign in with it once.</p>
            <div><Button size="sm" variant="ghost" onClick={copyBackup}>{copied ? 'Copied' : 'Copy backup code'}</Button></div>
          </div>
          <div className="pg-row">
            <Button variant="secondary" onClick={confirm}>Turn on</Button>
            <Button variant="ghost" onClick={() => onToggle(false)}>Not now</Button>
          </div>
        </Card>
      )}
      {mode === 'on' && (
        <Notice tone="success" title="Two-step verification is on">
          We’ll ask for a code from your app when you sign in on a new device. Keep your backup code somewhere safe.
        </Notice>
      )}
    </Card>
  )
}

function DevicesCard({ onSignOut }) {
  const [list, setList] = useState(initialDevices)
  return (
    <Card className="pg-stack-sm" aria-labelledby="ap-devices-title">
      <h2 id="ap-devices-title" className="t-heading-4">Signed-in devices</h2>
      <p className="t-body-sm t-muted">Max {maxDevices} devices at once. Sign out of one you no longer use to make room.</p>
      <ul className="ap-devices">
        {list.map((d) => (
          <li key={d.id} className="ap-device">
            <span className="ap-method-icon"><Icon name="globe" size={20} /></span>
            <div className="ap-method-text">
              <p className="pg-row"><span className="t-strong">{d.name}</span>{d.current && <Badge tone="primary">This device</Badge>}</p>
              <p className="t-body-sm t-muted">{d.where} · {d.lastActive}</p>
            </div>
            <Button variant="ghost" size="sm" iconStart="logout" onClick={() => (d.current ? onSignOut() : setList((l) => l.filter((x) => x.id !== d.id)))}>
              Sign out<span className="sg-sr"> of {d.name}</span>
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ---------------------------------------------------------------- Language (on the Account tab)

const readLang = () => document.documentElement.lang || 'en'

function LanguageTab() {
  const [lang, setLang] = useState(readLang)
  const [saved, flash] = useSaved()

  // Stay in step with the header's language switcher.
  useEffect(() => {
    const obs = new MutationObserver(() => setLang(readLang()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
    return () => obs.disconnect()
  }, [])

  // Arabic mirrors the whole layout.
  useEffect(() => {
    const root = document.documentElement
    if (root.lang !== lang) root.lang = lang
    root.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const choose = (code) => {
    setLang(code)
    flash()
  }

  return (
    <Card className="pg-stack-sm">
      <div className="pg-row-between">
        <h2 className="t-heading-4">Language</h2>
        <Saved show={saved} />
      </div>
      <fieldset className="ap-fieldset pg-stack-sm">
        <legend className="sg-sr">Language</legend>
        {languageOptions.map((o) => (
          <RadioCard
            key={o.code}
            name="language"
            value={o.code}
            checked={lang === o.code}
            onChange={() => choose(o.code)}
            title={<span lang={o.code} dir={o.code === 'ar' ? 'rtl' : 'ltr'}>{o.title}</span>}
            description={o.description}
          />
        ))}
      </fieldset>
      <p className="ap-rule t-caption t-muted">
        <Icon name="info" size={16} />
        Choosing العربية mirrors the layout so it reads right to left. Codes and times stay left to right.
      </p>
    </Card>
  )
}

// ---------------------------------------------------------------- Page

export default function Settings() {
  const { viewer, signOut } = useViewer()
  const [tab, setTab] = useState('account')
  const [deleting, setDeleting] = useState(false)

  return (
    <div className="ap-page">
      <h1 className="t-heading-3">Settings</h1>

      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Settings" />

      <div role="tabpanel" aria-label={TABS.find((t) => t.value === tab).label} className="pg-stack">
        {tab === 'account' && (
          <>
            <AccountTab viewer={viewer} />
            <LanguageTab />
            <DangerZone onDelete={() => setDeleting(true)} />
          </>
        )}
        {tab === 'notifications' && <NotificationsTab />}
        {tab === 'security' && (
          <>
            <PasswordCard />
            <TwoStepCard email={viewer.email} />
            <DevicesCard onSignOut={signOut} />
          </>
        )}
      </div>

      {deleting && <DeleteModal email={viewer.email} onClose={() => setDeleting(false)} onSignOut={signOut} />}
    </div>
  )
}
