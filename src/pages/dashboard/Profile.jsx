// Student dashboard → Profile (/student/dashboard/profile): who the student is and what they've
// done. Personal details follow Contacts › Fields visibility ("User can view and edit" fields are
// editable; "User can view, admin edits" are read-only; admin-only fields never show). Then quiz and
// assignment results (the admin's Submissions gradebook: averages, then each quiz's best attempt and
// each assignment's mark and feedback), certificates and achievements (points, level, badges,
// leaderboard). Progress lives in My library; only courses have it, so the profile doesn't repeat it.
// "Download as PDF" prints a dated record with the parts the student picks (the browser's
// "Save as PDF"; a server-made PDF is on the backend list).
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import {
  Avatar, Badge, Button, Card, Checkbox, Modal, Notice, Pagination, ProgressBar, Select, StatTile, StatusBadge, TextField, LogoMark,
} from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { school } from '@/data/school.js'
import { countries } from '@/data/checkout.js'
import { certificates, gamification, memberSince, profileFields } from '@/data/account.js'
import { getPlan } from '@/data/plans.js'
import { resultsFor, fullDate } from '@/lib/student.js'
import { splitName, joinName } from '@/lib/names.js'
import './dashboard.css'
import './profile.css'

const fmt = (n) => n.toLocaleString('en-GB')
const PAGE_SIZE = 5
// The rows on one page, and how many pages there are.
const pageOf = (rows, page) => ({ rows: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), pages: Math.max(1, Math.ceil(rows.length / PAGE_SIZE)) })

const PARTS = [
  { id: 'details', label: 'Your details', description: 'Name, email, country and what you’d like help with.' },
  { id: 'results', label: 'Quiz and assignment results', description: 'Your averages, then each result with its date.' },
  { id: 'certificates', label: 'Certificates', description: 'With the ID and link anyone can use to check them.' },
  { id: 'achievements', label: 'Points and badges' },
]

const pct = (n) => (n == null ? '—' : `${n}%`)

// ---------------------------------------------------------------- Details

function Details({ viewer, onSave }) {
  const [form, setForm] = useState(() => ({
    ...splitName(viewer.name),
    ...Object.fromEntries(profileFields.map((f) => [f.id, f.value])),
  }))
  const [errors, setErrors] = useState({})
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const toggleGoal = (g) => setForm({ ...form, goals: form.goals.includes(g) ? form.goals.filter((x) => x !== g) : [...form.goals, g] })
  const goals = profileFields.find((f) => f.id === 'goals')
  const readOnly = profileFields.filter((f) => f.edit === 'admin')

  const submit = (e) => {
    e.preventDefault()
    const next = {}
    if (!form.firstName.trim()) next.firstName = 'Enter your first name'
    if (!form.lastName.trim()) next.lastName = 'Enter your last name'
    setErrors(next)
    if (!Object.keys(next).length) onSave(form)
  }

  return (
    <Card as="form" padding="lg" className="db-panel" onSubmit={submit} noValidate aria-labelledby="pf-details">
      <div className="db-panel-head">
        <h2 id="pf-details" className="db-panel-title">Your details</h2>
        <Button type="submit" size="sm">Save changes</Button>
      </div>
      <div className="pg-grid-2">
        <TextField label="First name" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
        <TextField label="Last name" autoComplete="family-name" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
        <TextField label="Phone" type="tel" optional autoComplete="tel" value={form.phone} onChange={set('phone')} />
        <Select label="Country" value={form.country} onChange={set('country')} options={countries.map((c) => ({ value: c, label: c }))} />
      </div>
      <fieldset className="pf-goals">
        <legend className="t-body-sm t-strong">{goals.label} <span className="t-muted">(optional)</span></legend>
        <div className="pf-goal-list">
          {goals.options.map((g) => <Checkbox key={g} label={g} checked={form.goals.includes(g)} onChange={() => toggleGoal(g)} />)}
        </div>
      </fieldset>
      <dl className="pf-readonly">
        <div><dt>Email</dt><dd>{viewer.email} <a href="/student/dashboard/settings">Change in Settings</a></dd></div>
        {readOnly.map((f) => <div key={f.id}><dt>{f.label}</dt><dd>{f.value} <span className="t-caption t-muted">· set by the school</span></dd></div>)}
      </dl>
    </Card>
  )
}

// ---------------------------------------------------------------- Results

const RESULT_TONE = { Passed: 'Completed', Marked: 'Graded', 'Below pass mark': 'Inactive', 'Waiting for marking': 'Pending' }

function Results({ results }) {
  const [page, setPage] = useState(1)
  const { rows, pages } = pageOf(results.rows, page)
  return (
    <Card as="section" padding="lg" className="db-panel" aria-labelledby="pf-results">
      <div className="db-panel-head">
        <h2 id="pf-results" className="db-panel-title">Quiz and assignment results</h2>
        <span className="t-body-sm t-muted">{results.rows.length} {results.rows.length === 1 ? 'submission' : 'submissions'}</span>
      </div>
      {results.rows.length ? (
        <>
          <ul className="pf-results">
            {rows.map((r) => (
              <li key={r.key}>
                <div className="pf-result-main">
                  <div className="db-row-tags">
                    <Badge>{r.kind}</Badge>
                    <StatusBadge status={RESULT_TONE[r.status]}>{r.status}</StatusBadge>
                    {r.kind === 'Quiz' && r.best && <Badge tone="primary">Best attempt</Badge>}
                  </div>
                  <a className="t-strong" href={r.href}>{r.title}</a>
                  <span className="t-body-sm t-muted">
                    {r.programme} · {fullDate(r.at)} · attempt {r.attempts}{r.kind === 'Quiz' ? ` · pass mark ${r.passMark}%` : ''}
                  </span>
                  {r.waiting > 0 && <span className="t-body-sm t-muted">{r.waiting} {r.waiting === 1 ? 'answer is' : 'answers are'} waiting to be marked, so this score can still go up.</span>}
                </div>
                <p className="pf-score" aria-label={r.score == null ? 'Not marked yet' : `Score ${r.score}%`}>{pct(r.score)}</p>
              </li>
            ))}
          </ul>
          {pages > 1 && <Pagination page={page} pages={pages} onChange={setPage} />}
        </>
      ) : (
        <p className="t-muted">When you take a quiz or send an assignment, your results show here.</p>
      )}
    </Card>
  )
}

function Certificates() {
  return (
    <Card as="section" padding="lg" className="db-panel" aria-labelledby="pf-certs">
      <h2 id="pf-certs" className="db-panel-title">Certificates</h2>
      {certificates.length ? (
        <ul className="db-list">
          {certificates.map((c) => (
            <li key={c.id} className="db-row">
              <div className="db-row-main">
                <span className="db-row-title">{c.course}</span>
                <span className="db-row-meta">Issued {fullDate(c.issuedAt)} · {c.expires ? `Expires ${fullDate(c.expires)}` : 'Never expires'}</span>
              </div>
              <div className="db-row-meta">Certificate ID <code className="sg-code" dir="ltr">{c.id}</code></div>
              <div className="db-row-end">
                <Button size="sm" variant="ghost" iconStart="download" href="/files/sample-certificate.pdf" download>Download</Button>
                <Button size="sm" variant="link" href={`/verify?id=${encodeURIComponent(c.id)}`}>Verify</Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-muted">Finish a programme that offers a certificate and it shows here, with an ID anyone can verify.</p>
      )}
    </Card>
  )
}

// A badge: the set's own artwork, or its colours and level number if the image can't load.
function BadgeArt({ badge, size = 56, locked = false }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className={'pf-badge-art' + (locked ? ' is-locked' : '')} style={{ '--b1': badge.colors[0], '--b2': badge.colors[1], '--size': `${size}px` }} aria-hidden="true">
      {failed ? <span className="pf-badge-fallback">{badge.level}</span> : <img src={badge.img} alt="" width={size} height={size} loading="lazy" onError={() => setFailed(true)} />}
    </span>
  )
}

// Gamification as the backend has it: points, nine badge levels (each level is a badge), what earns
// points, and the leaderboard (rank, member, badge, points) in pages with "Your position".
function Achievements() {
  const g = gamification
  const [page, setPage] = useState(1)
  if (!g.enabled) return null
  const { rows, pages } = pageOf(g.leaderboard, page)
  const me = g.leaderboard.find((r) => r.you)
  const into = g.nextLevel ? g.points - (g.badge?.points || 0) : 1
  const span = g.nextLevel ? g.nextLevel.at - (g.badge?.points || 0) : 1
  return (
    <section id="achievements" className="db-panel" aria-labelledby="pf-achievements">
      <h2 id="pf-achievements" className="t-heading-4">Achievements</h2>
      <div className="pf-ach">
        <Card padding="lg" tone="sage" className="pf-level">
          {g.badge && <BadgeArt badge={g.badge} size={88} />}
          <div className="pf-level-main">
            <p className="t-caption t-muted">Level {g.level} of {g.levels.length} · {g.set.name} badges</p>
            <p className="t-heading-3">{g.levelName}</p>
            {g.badge && <p className="t-body-sm">{g.badge.subtext}</p>}
            <ProgressBar value={into} max={span} label={`${fmt(g.points)} points`} showValue={false} />
            <p className="t-body-sm t-muted">{g.nextLevel ? `${fmt(g.nextLevel.at - g.points)} points to Level ${g.nextLevel.level} · ${g.nextLevel.name}` : 'You hold every badge in the set.'}</p>
          </div>
        </Card>
        <Card padding="lg" className="pf-earn">
          <p className="t-strong">How to earn points</p>
          <ul>
            {g.activities.slice(0, 6).map((a) => (
              <li key={a.title}><span>{a.title}</span><span className="t-muted">+{a.points}{a.cadence === 'once' ? ' once' : ''}</span></li>
            ))}
          </ul>
        </Card>
      </div>

      <Card padding="lg" className="db-panel">
        <div className="db-panel-head">
          <h3 className="db-panel-title">Badges</h3>
          <span className="t-body-sm t-muted">{g.level} of {g.levels.length} earned</span>
        </div>
        <ol className="pf-badges">
          {g.levels.map((b) => (
            <li key={b.level} className={b.earned ? '' : 'is-locked'}>
              <BadgeArt badge={b} size={48} locked={!b.earned} />
              <span className="pf-badge-name">{b.name}</span>
              <span className="pf-badge-meta">{b.earned ? `Earned ${b.earned}` : `${fmt(b.points)} points`}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card padding="lg" className="db-panel">
        <div className="db-panel-head">
          <h3 className="db-panel-title">Leaderboard</h3>
          {me && <span className="t-body-sm">Your position: <strong>#{me.rank}</strong> of {g.leaderboard.length}</span>}
        </div>
        <table className="pf-board">
          <caption className="sg-sr">Leaderboard, ranked by points</caption>
          <thead><tr><th scope="col">Rank</th><th scope="col">Member</th><th scope="col">Badge</th><th scope="col" className="pf-num">Points</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.rank} className={r.you ? 'is-you' : ''}>
                <td>{r.rank}</td>
                <td><span className="db-person"><Avatar size="sm" name={r.name} />{r.name}{r.you && <Badge tone="primary">You</Badge>}</span></td>
                <td>{r.badge ? <span className="pf-board-badge"><BadgeArt badge={r.badge} size={24} />{r.badge.name}</span> : <span className="t-muted">No level yet</span>}</td>
                <td className="pf-num">{fmt(r.points)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && <Pagination page={page} pages={pages} onChange={setPage} />}
      </Card>
    </section>
  )
}

// ---------------------------------------------------------------- PDF

// The printed record. Rendered outside the app while printing; print CSS shows only this.
function ProfileDocument({ viewer, parts, results, at }) {
  const plan = viewer.plan ? getPlan(viewer.plan) : null
  const today = fullDate(at)
  const fields = Object.fromEntries(profileFields.map((f) => [f.id, f.value]))
  const has = (id) => parts.includes(id)
  return (
    <article className="pf-doc">
      <header className="pf-doc-head">
        <div>
          <p className="pf-doc-school"><LogoMark size={20} /> {school.name}</p>
          <h1>Student profile</h1>
          <p>{viewer.name} · generated {today}</p>
        </div>
      </header>

      {has('details') && (
        <section>
          <h2>Details</h2>
          <dl className="pf-doc-dl">
            <div><dt>Name</dt><dd>{viewer.name}</dd></div>
            <div><dt>Email</dt><dd>{viewer.email}</dd></div>
            <div><dt>Country</dt><dd>{fields.country}</dd></div>
            <div><dt>Student since</dt><dd>{fullDate(memberSince)}</dd></div>
            {plan && <div><dt>Membership</dt><dd>{plan.name}</dd></div>}
            {fields.goals?.length > 0 && <div><dt>Would like help with</dt><dd>{fields.goals.join(', ')}</dd></div>}
          </dl>
        </section>
      )}

      {has('results') && (
        <section>
          <h2>Quiz and assignment results</h2>
          <p>Quiz average {pct(results.quizAverage)} · assignment average {pct(results.assignmentAverage)}</p>
          {results.rows.length ? (
            <table>
              <thead><tr><th>Item</th><th>Programme</th><th>Kind</th><th>Date</th><th>Result</th><th>Score</th></tr></thead>
              <tbody>
                {results.rows.map((r) => (
                  <tr key={r.key}><td>{r.title}</td><td>{r.programme}</td><td>{r.kind}</td><td>{fullDate(r.at)}</td><td>{r.status}</td><td>{pct(r.score)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p>No results yet.</p>}
        </section>
      )}

      {has('certificates') && (
        <section>
          <h2>Certificates</h2>
          {certificates.length ? (
            <table>
              <thead><tr><th>Programme</th><th>Certificate ID</th><th>Issued</th><th>Check it at</th></tr></thead>
              <tbody>
                {certificates.map((c) => (
                  <tr key={c.id}><td>{c.course}</td><td>{c.id}</td><td>{fullDate(c.issuedAt)}</td><td>{`${window.location.host}/verify?id=${c.id}`}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p>No certificates yet.</p>}
        </section>
      )}

      {has('achievements') && gamification.enabled && (
        <section>
          <h2>Points and badges</h2>
          <p>Level {gamification.level} of {gamification.levels.length} · {gamification.levelName} · {fmt(gamification.points)} points</p>
          <p>Badges: {gamification.levels.filter((b) => b.earned).map((b) => `${b.name} (${b.earned})`).join(', ')}</p>
        </section>
      )}

      <footer className="pf-doc-foot">
        {school.name} · This record shows the student’s account on {today}. Certificates can be checked by their ID at {window.location.host}/verify.
      </footer>
    </article>
  )
}

function PdfModal({ open, onClose, onPrint }) {
  const [parts, setParts] = useState(PARTS.map((p) => p.id))
  const toggle = (id) => setParts((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))
  return (
    <Modal
      open={open} onClose={onClose} title="Download your profile as a PDF" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button iconStart="download" disabled={!parts.length} onClick={() => onPrint(parts)}>Download PDF</Button></>}
    >
      <div className="pg-stack-sm">
        <p className="t-body-sm">Choose what to include. Your browser’s print window opens: choose <strong>Save as PDF</strong>.</p>
        <fieldset className="pf-parts">
          <legend className="sg-sr">Include</legend>
          {PARTS.map((p) => (
            <Checkbox key={p.id} label={p.label} description={p.description} checked={parts.includes(p.id)} onChange={() => toggle(p.id)} />
          ))}
        </fieldset>
        <p className="t-caption t-muted">It has your personal details, so keep it somewhere safe.</p>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------- Page

export default function Profile() {
  const { viewer, update } = useViewer()
  const [params] = useSearchParams()
  const [saved, setSaved] = useState(false)
  const [pdfOpen, setPdfOpen] = useState(params.get('pdf') === '1')
  const [printing, setPrinting] = useState(null)
  const results = resultsFor(viewer)
  const plan = viewer.plan ? getPlan(viewer.plan) : null

  // Print once the document is on the page, then put the page back.
  useEffect(() => {
    if (!printing) return undefined
    const root = document.documentElement
    root.classList.add('pf-printing')
    const done = () => { root.classList.remove('pf-printing'); setPrinting(null) }
    window.addEventListener('afterprint', done, { once: true })
    const t = setTimeout(() => window.print(), 50)
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); root.classList.remove('pf-printing') }
  }, [printing])

  useEffect(() => {
    if (window.location.hash === '#achievements') document.getElementById('achievements')?.scrollIntoView()
  }, [])

  const save = (form) => {
    const name = joinName(form.firstName, form.lastName)
    if (name !== viewer.name) update({ name })
    setSaved(true)
  }

  return (
    <div className="db-page">
      <header className="db-head-row">
        <div className="db-head">
          <h1 className="t-heading-3">Profile</h1>
          <p className="t-muted">{[plan && `${plan.name} member`, `Student since ${fullDate(memberSince)}`].filter(Boolean).join(' · ')}</p>
        </div>
        <Button variant="secondary" iconStart="download" onClick={() => setPdfOpen(true)}>Download as PDF</Button>
      </header>

      {saved && <Notice tone="success" title="Your details are saved" onDismiss={() => setSaved(false)} />}

      <div className="db-stats">
        <StatTile icon="check-circle" label="Quiz average" value={pct(results.quizAverage)} hint={`Best attempt of ${results.quizzes} ${results.quizzes === 1 ? 'quiz' : 'quizzes'}`} />
        <StatTile icon="file" label="Assignment average" value={pct(results.assignmentAverage)} hint={`${results.assignments} ${results.assignments === 1 ? 'assignment' : 'assignments'} marked`} />
        <StatTile icon="star" label="Certificates" value={String(certificates.length)} hint="Each with an ID anyone can check" />
      </div>

      <Details viewer={viewer} onSave={save} />
      <Results results={results} />
      <Certificates />
      <Achievements />

      <PdfModal open={pdfOpen} onClose={() => setPdfOpen(false)} onPrint={(parts) => { setPdfOpen(false); setPrinting({ parts, at: new Date().toISOString() }) }} />
      {printing && createPortal(<div className="pf-print-root"><ProfileDocument viewer={viewer} parts={printing.parts} at={printing.at} results={results} /></div>, document.body)}
    </div>
  )
}
