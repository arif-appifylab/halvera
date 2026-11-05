import { useState } from 'react'
import { Button, Icon } from '@/design-system'
import { social } from '@/data/school.js'
import './newsletter-form.css'

// Footer newsletter opt-in (Marketing → Newsletter) and social links.
export default function NewsletterForm() {
  const [sent, setSent] = useState(false)
  return (
    <div className="nl">
      {sent ? (
        <p className="nl-done" role="status"><Icon name="check-circle" size={18} />Check your inbox to confirm your subscription.</p>
      ) : (
        <form className="nl-form" onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
          <label className="nl-label" htmlFor="nl-email">The Sunday Letter: one calm email a week</label>
          <div className="nl-row">
            <input id="nl-email" className="sg-input nl-input" type="email" required autoComplete="email" placeholder="you@example.com" />
            <Button type="submit" variant="inverse" size="sm">Subscribe</Button>
          </div>
          <p className="nl-note">Unsubscribe at any time. We never share your email.</p>
        </form>
      )}
      <ul className="nl-social" aria-label="Follow us">
        {social.map((s) => <li key={s.label}><a href={s.href} target="_blank" rel="noreferrer">{s.label}</a></li>)}
      </ul>
    </div>
  )
}
