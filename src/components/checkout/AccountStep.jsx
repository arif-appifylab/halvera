import { Avatar, Button, Notice, TextField, PasswordRules } from '@/design-system'
import StepCard from './StepCard.jsx'

// Contact: who is buying, email first.
//   signed in   the account's name and email, with "Not you? Log out" (the name goes on the receipt)
//   'email'     the buyer types their email; as soon as it's a valid address, the server says whether it
//               has an account (no Continue button), and the rest of the step appears
//   'existing'  "Welcome back": their password logs them in right here, or a sign-in link
//   'new'       first name, last name and a password (or a passwordless sign-in link) create the account
//               (email verification is always on)
// account: { name } for an email that has one.
export default function AccountStep({
  viewer, signedIn, onSignOut, field, form, set,
  stage, account, onLogIn, logInBusy, linkSent, onSendLink,
}) {
  if (signedIn) {
    return (
      <StepCard id="co-account" title="Contact">
        <div className="co-account">
          <Avatar name={viewer.name} size="md" />
          <p className="co-account-text t-body-sm">
            <strong className="co-account-name">{viewer.name}</strong>
            <span className="t-muted">{viewer.email}</span>
          </p>
          <button type="button" className="sg-linkbtn" onClick={onSignOut}>Not you? Log out</button>
        </div>
      </StepCard>
    )
  }

  const enter = (fn) => (e) => { if (e.key === 'Enter') { e.preventDefault(); fn() } }

  return (
    <StepCard
      id="co-account" title="Contact"
      intro={stage === 'email' ? 'If you’ve bought from us before, you’ll log in. If not, we’ll create your account with this email.' : undefined}
    >
      <TextField label="Email" type="email" autoComplete="email" iconStart="mail" {...field('email')} />

      {stage === 'existing' && (linkSent ? (
        <Notice tone="success" title="Check your inbox">
          We’ve sent a sign-in link to {form.email.trim()}. Open it and you’ll come back to this checkout, signed in.
        </Notice>
      ) : (
        <div className="pg-stack-sm">
          <p className="t-body-sm">Welcome back{account?.name ? `, ${account.name.split(' ')[0]}` : ''}. Log in to buy with your account.</p>
          <TextField
            id="co-login-password" label="Password" type="password" autoComplete="current-password"
            {...field('loginPassword')} onKeyDown={enter(onLogIn)}
          />
          <div className="co-login-row">
            <Button onClick={onLogIn} loading={logInBusy}>Log in</Button>
            <a className="t-body-sm" href="/forgot-password">Forgot password?</a>
          </div>
          <button type="button" className="sg-linkbtn co-start" onClick={onSendLink}>Email me a sign-in link instead</button>
        </div>
      ))}

      {stage === 'new' && (
        <>
          <div className="pg-grid-2 co-pair">
            <TextField label="First name" autoComplete="given-name" {...field('firstName')} />
            <TextField label="Last name" autoComplete="family-name" {...field('lastName')} />
          </div>
          {form.magicLink ? (
            <div className="co-magic">
              <p className="t-body-sm t-muted">
                No password needed. We’ll email you a link to sign in and confirm your address after you order.
              </p>
              <button type="button" className="sg-linkbtn" onClick={() => set('magicLink', false)}>Create a password instead</button>
            </div>
          ) : (
            <div className="pg-stack-sm">
              <TextField label="Create a password" type="password" autoComplete="new-password" {...field('password')} />
              <PasswordRules value={form.password} show={!!field('password').error} />
              <button type="button" className="sg-linkbtn co-start" onClick={() => set('magicLink', true)}>Email me a sign-in link instead</button>
            </div>
          )}
        </>
      )}
    </StepCard>
  )
}
