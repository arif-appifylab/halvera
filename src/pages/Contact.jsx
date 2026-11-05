import { useEffect, useRef, useState } from 'react'
import { Card, TextField, Select, Checkbox, Button, Notice, Icon } from '@/design-system'
import { school } from '@/data/school.js'
import './contact.css'

const TOPICS = ['A programme', 'Membership', 'Booking a consultation', 'Billing', 'Something else']
// Opening hours aren't in the school settings yet; shown here until they are.
const HOURS = 'Mon to Fri, 9:00 to 17:00'
const EMPTY = { name: '', email: '', topic: '', message: '', consent: false }

function validate(v) {
  const errors = {}
  if (!v.name.trim()) errors.name = 'Enter your name'
  if (!v.email.trim()) errors.email = 'Enter your email address'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) errors.email = 'Enter an email address like name@example.com'
  if (!v.topic) errors.topic = "Choose what your message is about"
  if (!v.message.trim()) errors.message = 'Write your message'
  if (!v.consent) errors.consent = 'Tick this box so we can reply to you'
  return errors
}

export default function Contact() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const formRef = useRef(null)

  // After a failed submit, move focus to the first field with an error.
  useEffect(() => {
    if (!attempt) return
    formRef.current?.querySelector('[aria-invalid="true"]')?.focus()
  }, [attempt])

  const set = (key) => (e) => {
    const value = key === 'consent' ? e.target.checked : e.target.value
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const submit = (e) => {
    e.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length) {
      setAttempt((n) => n + 1)
      return
    }
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setSent(true)
      setValues(EMPTY)
    }, 700)
  }

  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.address)}`

  return (
    <>
      <header className="pg-head">
        <div className="sg-container">
          <div className="pg-head-inner">
            <p className="sg-eyebrow">Contact us</p>
            <h1 className="t-display-lg">Get in touch</h1>
            <p className="t-body-lg t-muted">
              Questions about a programme, your membership or a booking? Send us a note and someone from our
              small team will reply, usually within a day or two.
            </p>
          </div>
        </div>
      </header>

      <section className="sg-section ctc-body">
        <div className="sg-container">
          <div className="pg-split">
            <Card padding="lg">
              {sent ? (
                <div className="pg-stack">
                  <Notice tone="success" title="Message sent">
                    We reply within 2 working days. Look out for an email from {school.email}.
                  </Notice>
                  <div>
                    <Button variant="ghost" iconStart="arrow-left" onClick={() => setSent(false)}>Send another message</Button>
                  </div>
                </div>
              ) : (
                <form ref={formRef} className="pg-stack" onSubmit={submit} noValidate>
                  <h2 className="t-heading-3">Send us a message</h2>
                  <div className="pg-grid-2">
                    <TextField label="Your name" name="name" autoComplete="name" value={values.name} onChange={set('name')} error={errors.name} />
                    <TextField label="Email address" type="email" name="email" autoComplete="email" value={values.email} onChange={set('email')} error={errors.email} />
                  </div>
                  <Select
                    label="What's this about?"
                    name="topic"
                    placeholder="Choose one"
                    options={TOPICS}
                    value={values.topic}
                    onChange={set('topic')}
                    error={errors.topic}
                  />
                  <TextField
                    label="Your message"
                    name="message"
                    multiline
                    rows={6}
                    hint="If it's about an order, include your order number."
                    value={values.message}
                    onChange={set('message')}
                    error={errors.message}
                  />
                  <Checkbox
                    label={`I agree to ${school.name} storing my details to reply`}
                    description={<>We only use them to answer this message. See our <a href="/privacy-policy">privacy policy</a>.</>}
                    checked={values.consent}
                    onChange={set('consent')}
                    error={errors.consent}
                  />
                  <div>
                    <Button type="submit" loading={sending}>Send message</Button>
                  </div>
                </form>
              )}
            </Card>

            <aside className="pg-split-aside" aria-label="Other ways to reach us">
              <Card>
                <div className="pg-stack-sm">
                  <h2 className="t-heading-4">Other ways to reach us</h2>
                  <ul className="ctc-details">
                    <li>
                      <Icon name="mail" size={20} />
                      <div>
                        <p className="t-body-sm t-muted">Email</p>
                        <a href={`mailto:${school.email}`}>{school.email}</a>
                      </div>
                    </li>
                    <li>
                      <Icon name="clock" size={20} />
                      <div>
                        <p className="t-body-sm t-muted">Phone</p>
                        <a href={`tel:${school.phone.replace(/\s/g, '')}`} dir="ltr">{school.phone}</a>
                      </div>
                    </li>
                    <li>
                      <Icon name="map-pin" size={20} />
                      <div>
                        <p className="t-body-sm t-muted">Clinic</p>
                        <p>{school.address}</p>
                        <a href={mapHref} target="_blank" rel="noreferrer" className="t-body-sm">Get directions</a>
                      </div>
                    </li>
                    <li>
                      <Icon name="clock" size={20} />
                      <div>
                        <p className="t-body-sm t-muted">Hours</p>
                        <p>{HOURS}</p>
                        <p className="t-body-sm t-muted">{school.timezone}</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </Card>

              <Card tone="sage">
                <div className="pg-stack-sm">
                  <h2 className="t-heading-3">Prefer to talk?</h2>
                  <p>Book a consultation and talk things through with one of our practitioners, online or at the clinic.</p>
                  <div>
                    <Button variant="secondary" href={school.consultation.href} iconEnd="arrow-right">{school.consultation.label}</Button>
                  </div>
                </div>
              </Card>

            </aside>
          </div>
        </div>
      </section>
    </>
  )
}
