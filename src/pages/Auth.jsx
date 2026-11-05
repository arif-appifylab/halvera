import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Button, Card, Checkbox, Icon, Notice, OtpInput, PasswordRules, PriceTag, RadioCard, Section, TextField, LogoMark,
} from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { school } from '@/data/school.js'
import { siteAccess } from '@/lib/access.js'
import './auth.css'
import { joinName } from '@/lib/names.js'
import SocialButtons from '@/components/SocialButtons.jsx'

// Log in, Sign up, Verify email and Forgot password. One page, four modes (see App.jsx routes).
// Preview stand-ins for the server:
//   password "wrong"   → "That email and password don’t match"; three misses lock the account
//   2fa@example.com    → asks for the authenticator code after the password
//   code 000000        → wrong code (verify and two-step)

const DEFAULT_NEXT = '/student/dashboard'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_ATTEMPTS = 3
const RESEND_SECONDS = 30

const wait = (ms = 600) => new Promise((r) => setTimeout(r, ms))

// Only same-site paths are allowed as a return address.
function useNext() {
  const [params] = useSearchParams()
  const raw = params.get('next') || ''
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : DEFAULT_NEXT
}

const withNext = (path, next) => (next === DEFAULT_NEXT ? path : `${path}?next=${encodeURIComponent(next)}`)

function emailError(value) {
  if (!value.trim()) return 'Enter your email address'
  if (!EMAIL_RE.test(value.trim())) return 'Enter an email address like name@example.com'
  return ''
}

const passwordOk = (v) => v.length >= 8 && v.length <= 64 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v)

// Focus the first field with an error, in form order.
function focusFirst(errors, order) {
  const key = order.find((k) => errors[k])
  if (key) document.getElementById(key)?.focus()
  return Boolean(key)
}

/* ---------- Shared pieces ---------- */

function Shell({ title, intro, children, below }) {
  return (
    <Section tone="sunken" className="auth">
      <div className="pg-narrow pg-stack">
        <Card padding="lg" className="auth-card">
          <header className="auth-head">
            <span className="auth-mark" aria-hidden="true"><LogoMark size={28} /></span>
            <p className="auth-school">{school.name}</p>
            <h1 className="t-heading-2">{title}</h1>
            {intro && <p className="t-muted">{intro}</p>}
          </header>
          {children}
        </Card>
        {below && <div className="auth-below t-body-sm">{below}</div>}
      </div>
    </Section>
  )
}

function Or() {
  return <p className="auth-or"><span>or</span></p>
}

function DemoHint({ children }) {
  return (
    <p className="auth-hint t-caption">
      <Icon name="info" size={16} />
      <span>{children}</span>
    </p>
  )
}

function useFinish() {
  const { signIn } = useViewer()
  const navigate = useNavigate()
  const next = useNext()
  return () => { signIn(); navigate(next) }
}

/* ---------- Log in ---------- */

function Login() {
  const next = useNext()
  const finish = useFinish()
  const [step, setStep] = useState('form') // form (email and password together) | code | link-sent
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [errors, setErrors] = useState({})
  const [attempts, setAttempts] = useState(0)
  const [mismatch, setMismatch] = useState(false)
  const [busy, setBusy] = useState('')
  const otpRef = useRef(null)
  const locked = attempts >= MAX_ATTEMPTS

  useEffect(() => {
    if (step === 'code') otpRef.current?.querySelector('input')?.focus()
  }, [step])

  const logIn = async (e) => {
    e.preventDefault()
    if (locked) return
    const err = { 'login-email': emailError(email), 'login-password': password ? '' : 'Enter your password' }
    setErrors(err)
    setMismatch(false)
    if (focusFirst(err, ['login-email', 'login-password'])) return
    setBusy('login')
    await wait()
    setBusy('')
    if (password === 'wrong') {
      setAttempts((n) => n + 1)
      setMismatch(true)
      setPassword('')
      document.getElementById('login-password')?.focus()
      return
    }
    if (email.trim().toLowerCase() === '2fa@example.com') { setStep('code'); return }
    finish()
  }

  const confirmCode = async (e) => {
    e.preventDefault()
    let err = ''
    if (code.length < 6) err = 'Enter all 6 digits'
    else {
      setBusy('code')
      await wait()
      setBusy('')
      if (code === '000000') err = 'That code didn’t work. Codes change every 30 seconds, so try the newest one'
    }
    setErrors({ code: err })
    if (err) { setCode(''); otpRef.current?.querySelector('input')?.focus(); return }
    finish()
  }

  const sendLink = async () => {
    const err = { 'login-email': emailError(email) }
    setErrors(err)
    if (err['login-email']) { setStep('form'); setTimeout(() => document.getElementById('login-email')?.focus()); return }
    setBusy('link')
    await wait()
    setBusy('')
    setStep('link-sent')
  }

  const social = async (name) => { setBusy(name); await wait(); finish() }

  const changeEmail = () => {
    setPassword(''); setMismatch(false); setErrors({}); setStep('form')
  }

  const below = (
    <p>New here? <a href={withNext('/signup', next)}>Create an account</a></p>
  )

  if (step === 'link-sent') {
    return (
      <Shell title="Check your inbox" below={below}>
        <div className="pg-stack">
          <Notice tone="info" title="Check your inbox">
            We’ve sent a sign-in link to <strong>{email.trim()}</strong>. It works once and expires in 15 minutes.
          </Notice>
          <p className="t-body-sm t-muted">Can’t find it? Look in your spam folder, or wait a minute before asking for another.</p>
          <div className="pg-row">
            <button type="button" className="sg-linkbtn" onClick={sendLink}>Send another link</button>
            <button type="button" className="sg-linkbtn" onClick={changeEmail}>Use a different email</button>
          </div>
        </div>
      </Shell>
    )
  }

  if (step === 'code') {
    return (
      <Shell title="Two-step verification" intro="Your account has an extra layer of protection.">
        <form className="pg-stack" onSubmit={confirmCode} noValidate>
          <div ref={otpRef}>
            <OtpInput length={6} value={code} onChange={(v) => { setCode(v); setErrors({}) }} error={errors.code} label="Enter the 6-digit code from your authenticator app" />
          </div>
          <Button type="submit" block loading={busy === 'code'}>Verify and log in</Button>
          <p className="t-body-sm t-muted">Lost access to your app? <a href="/contact-us">Contact us</a> and we’ll help you back in.</p>
          <DemoHint>Any 6 digits work in this preview. 000000 shows the error.</DemoHint>
        </form>
      </Shell>
    )
  }

  return (
    <Shell title="Welcome back" intro="Log in to pick up where you left off." below={below}>
      <div className="pg-stack">
        <form className="pg-stack" onSubmit={logIn} noValidate>
          {locked ? (
            <Notice tone="danger" action={<Button size="sm" variant="secondary" href="/forgot-password">Reset your password</Button>}>
              Too many attempts. Try again in 15 minutes or reset your password.
            </Notice>
          ) : mismatch && (
            <Notice tone="danger">
              That email and password don’t match.
              {MAX_ATTEMPTS - attempts === 1 && ' One more try before we pause sign-in for 15 minutes.'}
            </Notice>
          )}
          <TextField
            id="login-email" label="Email" type="email" autoComplete="email" inputMode="email"
            value={email} error={errors['login-email']}
            onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, 'login-email': '' })) }}
          />
          <div className="pg-stack-sm">
            <TextField
              id="login-password" label="Password" type="password" autoComplete="current-password"
              value={password} error={errors['login-password']} disabled={locked}
              onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, 'login-password': '' })) }}
            />
            <a className="auth-forgot t-body-sm" href={withNext('/forgot-password', next)}>Forgot password?</a>
          </div>
          <Button type="submit" block loading={busy === 'login'} disabled={locked}>Log in</Button>
        </form>

        <button type="button" className="sg-linkbtn auth-center" onClick={sendLink} disabled={busy === 'link'}>
          {busy === 'link' ? 'Sending…' : 'Email me a sign-in link instead'}
        </button>

        <Or />
        <SocialButtons onPick={social} busy={['Google', 'Apple', 'Facebook'].includes(busy) ? busy : ''} />
        <DemoHint>
          Any email and password works in this preview. To see other states, use the password “wrong”, or 2fa@example.com for two-step sign-in.
        </DemoHint>
      </div>
    </Shell>
  )
}

/* ---------- Sign up ---------- */

// Access gate at sign-up (Sell → Memberships → Access gate "Require site access to buy", with
// Settings → Sign up and login set to "Only by buying a product"): when site access is required,
// the form ends with a "Site access" step. Picking a price creates the account, confirms the email
// (verification is always on), then opens /checkout/site-access?price=<id>. "Create a free account
// only" skips the payment: free programmes and the Sunday Letter don't need access.
// The account details (never the password) travel to the verify step in sessionStorage, so the new
// account carries the name and email typed here.
const SIGNUP_KEY = 'halvera-signup'
const FREE_ONLY = 'free'
const ACCESS_DESCRIPTION = {
  subscription: 'Renews each year. Cancel any time.',
  'one-time': 'One payment. It never ends.',
}
// Social sign-up in this preview: the identity the provider would return.
const SOCIAL_DEMO = { name: 'Adnan Rahman', email: 'adnan@example.com' }

const defaultAccessPrice = () => (siteAccess.prices.find((p) => p.default) || siteAccess.prices[0])?.id || FREE_ONLY
const accessCheckout = (priceId) => `/checkout/site-access?price=${encodeURIComponent(priceId)}`
const accessPrice = (id) => siteAccess.prices.find((p) => p.id === id)
const priceText = (p) => `${p.price.amount}${p.price.interval ? ` / ${p.price.interval}` : ''}`

function saveSignup(details) {
  try { sessionStorage.setItem(SIGNUP_KEY, JSON.stringify(details)) } catch { /* storage unavailable */ }
}
function readSignup() {
  try { return JSON.parse(sessionStorage.getItem(SIGNUP_KEY)) } catch { return null }
}
function clearSignup() {
  try { sessionStorage.removeItem(SIGNUP_KEY) } catch { /* storage unavailable */ }
}
// A brand-new account: signed in, no site access yet (bought next, or later at checkout).
const newAccount = ({ name, email }) => ({ role: 'student', name, email, siteAccess: 'none', verified: true, plan: null })

function Signup() {
  const next = useNext()
  const navigate = useNavigate()
  const finish = useFinish()
  const { update } = useViewer()
  const gate = siteAccess.enabled && siteAccess.prices.length > 0
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', terms: false, marketing: false })
  const [access, setAccess] = useState(defaultAccessPrice)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState('')
  const buysAccess = gate && access !== FREE_ONLY
  const accessName = siteAccess.name.toLowerCase()

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, ['signup-' + key]: '' }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const err = {
      'signup-first-name': form.firstName.trim() ? '' : 'Enter your first name',
      'signup-last-name': form.lastName.trim() ? '' : 'Enter your last name',
      'signup-email': emailError(form.email),
      'signup-password': !form.password ? 'Create a password' : passwordOk(form.password) ? '' : 'Your password needs to meet every rule below',
      'signup-terms': form.terms ? '' : 'Agree to the Terms of use and Privacy policy to create an account',
    }
    setErrors(err)
    if (focusFirst(err, ['signup-first-name', 'signup-last-name', 'signup-email', 'signup-password', 'signup-terms'])) return
    setBusy('create')
    await wait()
    const email = form.email.trim()
    saveSignup({ name: joinName(form.firstName, form.lastName), email, marketing: form.marketing, accessPriceId: buysAccess ? access : null })
    navigate(withNext('/verify-email', buysAccess ? accessCheckout(access) : next), { state: { email } })
  }

  const social = async (name) => {
    setBusy(name)
    await wait()
    if (!gate) { finish(); return }
    update(newAccount(SOCIAL_DEMO))
    navigate(buysAccess ? accessCheckout(access) : next)
  }

  return (
    <Shell
      title="Create your account"
      intro="It takes a minute. Your details stay private, and you can leave any time."
      below={<p>Already have an account? <a href={withNext('/login', next)}>Log in</a></p>}
    >
      <div className="pg-stack">
        <form className="pg-stack" onSubmit={submit} noValidate>
          <div className="pg-grid-2">
            <TextField id="signup-first-name" label="First name" autoComplete="given-name" value={form.firstName} error={errors['signup-first-name']} onChange={(e) => set('firstName', e.target.value)} />
            <TextField id="signup-last-name" label="Last name" autoComplete="family-name" value={form.lastName} error={errors['signup-last-name']} onChange={(e) => set('lastName', e.target.value)} />
          </div>
          <TextField id="signup-email" label="Email" type="email" autoComplete="email" inputMode="email" value={form.email} error={errors['signup-email']} onChange={(e) => set('email', e.target.value)} />
          <div className="pg-stack-sm">
            <TextField id="signup-password" label="Password" type="password" autoComplete="new-password" value={form.password} error={errors['signup-password']} onChange={(e) => set('password', e.target.value)} />
            <PasswordRules value={form.password} show={!!errors['signup-password']} />
          </div>
          {gate && (
            <fieldset className="auth-access" aria-describedby="signup-access-intro">
              <legend className="t-heading-4">{siteAccess.name}</legend>
              <p id="signup-access-intro" className="t-body-sm t-muted">
                You need {accessName} to buy programmes, workshop passes and downloads.
              </p>
              <div className="auth-access-options">
                {siteAccess.prices.map((p) => (
                  <RadioCard
                    key={p.id}
                    name="signup-access"
                    value={p.id}
                    checked={access === p.id}
                    onChange={() => setAccess(p.id)}
                    title={p.label}
                    description={ACCESS_DESCRIPTION[p.kind]}
                    meta={<PriceTag {...p.price} size="sm" />}
                  />
                ))}
                <RadioCard
                  name="signup-access"
                  value={FREE_ONLY}
                  checked={access === FREE_ONLY}
                  onChange={() => setAccess(FREE_ONLY)}
                  title="Create a free account only"
                  description="Join free programmes and the Sunday Letter now. Add site access later, at checkout."
                  meta={<PriceTag amount="Free" size="sm" />}
                />
              </div>
            </fieldset>
          )}
          <div className="pg-stack-sm">
            <Checkbox
              id="signup-terms" required checked={form.terms} error={errors['signup-terms']}
              onChange={(e) => set('terms', e.target.checked)}
              label={<span>I agree to the <a href="/terms-of-use">Terms of use</a> and <a href="/privacy-policy">Privacy policy</a></span>}
            />
            <Checkbox
              id="signup-marketing" checked={form.marketing}
              onChange={(e) => set('marketing', e.target.checked)}
              label="Send me gentle tips, new programmes and offers by email"
              description="Optional. You can unsubscribe at any time."
            />
          </div>
          <div className="pg-stack-sm">
            <Button type="submit" block loading={busy === 'create'} disabled={Boolean(busy) && busy !== 'create'}>
              {buysAccess ? 'Create account and get site access' : 'Create account'}
            </Button>
            {buysAccess && (
              <p className="t-body-sm t-muted auth-center">
                Next, you’ll confirm your email, then pay {priceText(accessPrice(access))} on the checkout page.
              </p>
            )}
          </div>
        </form>
        <Or />
        <SocialButtons onPick={social} busy={['Google', 'Apple', 'Facebook'].includes(busy) ? busy : ''} />
      </div>
    </Shell>
  )
}

/* ---------- Verify email ---------- */

// The email the code went to is always shown. A wrong address is fixed right here ("Change email"):
// the account, and anything already bought with it, stays the same and the new code goes to the new
// address. Starting again isn't offered, since that would leave a paid order on the wrong account.
function Verify() {
  const { viewer, signedIn, update, signIn } = useViewer()
  const navigate = useNavigate()
  const next = useNext()
  const location = useLocation()
  const [email, setEmail] = useState(() => location.state?.email || readSignup()?.email || viewer.email || '')
  const [changing, setChanging] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftError, setDraftError] = useState('')
  const [moved, setMoved] = useState(false)
  const [pending] = useState(() => accessPrice(readSignup()?.accessPriceId || ''))
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [left, setLeft] = useState(RESEND_SECONDS)
  const [resent, setResent] = useState(false)
  const otpRef = useRef(null)

  useEffect(() => {
    if (left <= 0) return undefined
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  useEffect(() => { otpRef.current?.querySelector('input')?.focus() }, [])

  const confirm = async (e) => {
    e.preventDefault()
    let err = ''
    if (code.length < 6) err = 'Enter all 6 digits from the email'
    else {
      setBusy(true)
      await wait()
      setBusy(false)
      if (code === '000000') err = 'That code is wrong or has expired. Check the latest email, or send a new code'
    }
    setError(err)
    if (err) { setCode(''); otpRef.current?.querySelector('input')?.focus(); return }
    const details = readSignup()
    if (signedIn) update({ verified: true })
    else if (details?.email) update(newAccount(details))
    else signIn()
    clearSignup()
    navigate(next)
  }

  const resend = () => {
    setLeft(RESEND_SECONDS)
    setResent(true)
    setMoved(false)
    setCode('')
    setError('')
    otpRef.current?.querySelector('input')?.focus()
  }

  const startChange = () => {
    setDraft(email)
    setDraftError('')
    setChanging(true)
    setTimeout(() => document.getElementById('verify-new-email')?.focus())
  }
  const saveEmail = async (e) => {
    e.preventDefault()
    const value = draft.trim()
    const err = emailError(value) || (value.toLowerCase() === email.toLowerCase() ? 'That’s the email we already sent the code to' : '')
    setDraftError(err)
    if (err) { document.getElementById('verify-new-email')?.focus(); return }
    setBusy(true)
    await wait()
    setBusy(false)
    // The account keeps everything it has; only its email changes.
    const details = readSignup()
    if (details) saveSignup({ ...details, email: value })
    if (signedIn) update({ email: value })
    setEmail(value)
    setChanging(false)
    setMoved(true)
    setResent(false)
    setLeft(RESEND_SECONDS)
    setCode('')
    setError('')
    setTimeout(() => otpRef.current?.querySelector('input')?.focus())
  }

  const mm = `0:${String(left).padStart(2, '0')}`

  if (changing) {
    return (
      <Shell title="Change your email" intro="We’ll send a new code to this address. Your account, and anything you’ve bought, stays the same.">
        <form className="pg-stack" onSubmit={saveEmail} noValidate>
          <TextField
            id="verify-new-email" label="Email" type="email" autoComplete="email" inputMode="email"
            value={draft} error={draftError} onChange={(e) => { setDraft(e.target.value); setDraftError('') }}
          />
          <Button type="submit" block loading={busy}>Send the code to this email</Button>
          <button type="button" className="sg-linkbtn auth-center" onClick={() => setChanging(false)}>Keep {email}</button>
        </form>
      </Shell>
    )
  }

  return (
    <Shell
      title="Confirm your email"
      intro="Email verification is always on for new accounts, so only you can get into yours."
    >
      <form className="pg-stack" onSubmit={confirm} noValidate>
        {moved && <Notice tone="success">Your email is now {email}. We’ve sent a new code there, and earlier codes no longer work.</Notice>}
        <div className="auth-sent">
          <p>We’ve sent a 6-digit code to <strong>{email || 'your email'}</strong>. It expires in 10 minutes.</p>
          <button type="button" className="sg-linkbtn" onClick={startChange}>Wrong email? Change it</button>
        </div>
        {pending && (
          <p className="t-body-sm t-muted">
            After this, you’ll pay for {siteAccess.name.toLowerCase()} ({pending.label.toLowerCase()}, {priceText(pending)}) to finish setting up your account.
          </p>
        )}
        {resent && <Notice tone="success">We’ve sent a new code to {email}. Earlier codes no longer work.</Notice>}
        <div ref={otpRef}>
          <OtpInput length={6} value={code} onChange={(v) => { setCode(v); setError('') }} error={error} label="Verification code" />
        </div>
        <Button type="submit" block loading={busy}>Confirm email</Button>
        <p className="t-body-sm t-muted auth-center" aria-live="polite">
          {left > 0
            ? <>Didn’t get it? You can send a new code in <span className="auth-timer" dir="ltr">{mm}</span></>
            : <>Didn’t get it? <button type="button" className="sg-linkbtn" onClick={resend}>Send a new code</button></>}
        </p>
        <DemoHint>Any 6 digits work in this preview. 000000 shows the error.</DemoHint>
      </form>
    </Shell>
  )
}

/* ---------- Forgot password ---------- */

function Forgot() {
  const next = useNext()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const err = emailError(email)
    setError(err)
    if (err) { document.getElementById('forgot-email')?.focus(); return }
    setBusy(true)
    await wait()
    setBusy(false)
    setSent(true)
  }

  return (
    <Shell
      title="Reset your password"
      intro={sent ? undefined : 'Enter the email you use to log in and we’ll send you a link to choose a new password.'}
      below={<p>Remembered it? <a href={withNext('/login', next)}>Log in</a></p>}
    >
      {sent ? (
        <div className="pg-stack">
          <Notice tone="success" title="Check your inbox">
            If there’s an account for <strong>{email.trim()}</strong>, we’ve sent it a link to choose a new password. The link expires in 1 hour.
          </Notice>
          <p className="t-body-sm t-muted">Nothing after a few minutes? Check your spam folder or <button type="button" className="sg-linkbtn" onClick={() => setSent(false)}>try another email</button>.</p>
          <Button variant="secondary" block href={withNext('/login', next)}>Back to log in</Button>
        </div>
      ) : (
        <form className="pg-stack" onSubmit={submit} noValidate>
          <TextField
            id="forgot-email" label="Email" type="email" autoComplete="email" inputMode="email"
            value={email} error={error} onChange={(e) => { setEmail(e.target.value); setError('') }}
          />
          <Button type="submit" block loading={busy}>Send reset link</Button>
        </form>
      )}
    </Shell>
  )
}

/* ---------- Page ---------- */

const MODES = { login: Login, signup: Signup, verify: Verify, forgot: Forgot }

export default function Auth({ mode = 'login' }) {
  const Mode = MODES[mode] || Login
  // key resets state when moving between /login, /signup and the rest.
  return <Mode key={mode} />
}
