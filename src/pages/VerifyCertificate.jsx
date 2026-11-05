import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, TextField, Button, Notice } from '@/design-system'
import { certificates } from '@/data/account.js'
import { school } from '@/data/school.js'

// Courses → Certificates: "Anyone can verify a certificate by entering its ID on your site".
// The holder of every issued certificate in the demo data is the signed-in student.
const HOLDER = 'Adnan Rahman'
// A revoked certificate, so the page can show that state.
const REVOKED = [
  { id: 'CERT-0000-REVK', course: 'Gut Health Reset', issued: '3 Mar 2026', revoked: '20 May 2026' },
]

function lookup(id) {
  if (!id) return null
  const valid = certificates.find((c) => c.id === id)
  if (valid) return { status: 'valid', ...valid }
  const revoked = REVOKED.find((c) => c.id === id)
  if (revoked) return { status: 'revoked', ...revoked }
  return { status: 'unknown', id }
}

const normalise = (value) => value.trim().toUpperCase()

export default function VerifyCertificate() {
  const [params, setParams] = useSearchParams()
  const checked = normalise(params.get('id') || '')
  const [value, setValue] = useState(checked)
  const [error, setError] = useState('')
  const result = lookup(checked)

  const submit = (e) => {
    e.preventDefault()
    const id = normalise(value)
    if (!id) {
      setError('Enter a certificate ID')
      return
    }
    setError('')
    setValue(id)
    setParams({ id })
  }

  return (
    <>
      <header className="pg-head is-center">
        <div className="sg-container">
          <div className="pg-head-inner">
            <p className="sg-eyebrow">Certificates</p>
            <h1 className="t-display-lg">Verify a certificate</h1>
            <p className="t-body-lg t-muted">
              Every certificate from {school.name} has its own ID, printed at the bottom. Enter it here to check
              that it's genuine.
            </p>
          </div>
        </div>
      </header>

      <section className="sg-section" style={{ paddingBlockStart: 'var(--space-2)' }}>
        <div className="sg-container">
          <div className="pg-narrow">
            <Card padding="lg">
              <div className="pg-stack">
                <form className="pg-stack" onSubmit={submit} noValidate>
                  <TextField
                    label="Certificate ID"
                    name="id"
                    placeholder="CERT-7F2K-91QA"
                    autoComplete="off"
                    spellCheck={false}
                    dir="ltr"
                    value={value}
                    onChange={(e) => { setValue(e.target.value); if (error) setError('') }}
                    error={error}
                  />
                  <Button type="submit" block iconStart="check-circle">Verify</Button>
                </form>

                {result?.status === 'valid' && (
                  <Notice tone="success" title="This certificate is valid">
                    <dl className="pg-facts">
                      <dt>Awarded to</dt><dd>{HOLDER}</dd>
                      <dt>Course</dt><dd>{result.course}</dd>
                      <dt>Issued</dt><dd>{result.issued}</dd>
                      <dt>Issued by</dt><dd>{school.name}</dd>
                      <dt>Expires</dt><dd>Never expires</dd>
                      <dt>Certificate ID</dt><dd dir="ltr">{result.id}</dd>
                    </dl>
                  </Notice>
                )}

                {result?.status === 'revoked' && (
                  <Notice tone="warning" title="This certificate was revoked" action={<Button size="sm" variant="secondary" href="/contact-us">Contact us</Button>}>
                    Certificate <span dir="ltr">{result.id}</span> for {result.course} was issued on {result.issued} and
                    revoked by {school.name} on {result.revoked}. It is no longer valid. If you think this is a
                    mistake, get in touch.
                  </Notice>
                )}

                {result?.status === 'unknown' && (
                  <Notice tone="danger" title="We couldn't find that certificate">
                    No certificate matches <span dir="ltr">{result.id}</span>. Check the ID against the certificate,
                    including the dashes, and try again.
                  </Notice>
                )}
              </div>
            </Card>
            <p className="t-body-sm t-muted" style={{ marginBlockStart: 'var(--space-4)', textAlign: 'center' }}>
              Students find their certificates in their dashboard, under Achievements.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
