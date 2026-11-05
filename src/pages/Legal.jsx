import { legalPages, legalUpdated } from '@/data/legal.js'
import NotFound from '@/pages/NotFound.jsx'
import './legal.css'

// Terms of use, privacy policy and refund policy: one reading layout.
const ORDER = ['terms', 'privacy', 'refund']

function Block({ block }) {
  if (block.h2) return <h2>{block.h2}</h2>
  if (block.h3) return <h3>{block.h3}</h3>
  if (block.ul) return <ul>{block.ul.map((item) => <li key={item}>{item}</li>)}</ul>
  return <p>{block.p}</p>
}

export default function Legal({ page = 'terms' }) {
  const doc = legalPages[page]
  if (!doc) return <NotFound />
  const others = ORDER.filter((key) => key !== page).map((key) => legalPages[key])

  return (
    <>
      <header className="pg-head">
        <div className="sg-container sg-container-prose">
          <div className="pg-head-inner">
            <p className="sg-eyebrow">Policies</p>
            <h1 className="t-display-lg">{doc.title}</h1>
            <p className="t-body-lg t-muted">{doc.intro}</p>
            <p className="t-body-sm t-muted">Last updated {legalUpdated}</p>
          </div>
        </div>
      </header>

      <section className="sg-section lgl-body">
        <div className="sg-container sg-container-prose">

          <article className="pg-prose">
            {doc.blocks.map((block, i) => <Block key={i} block={block} />)}
          </article>

          <nav className="lgl-others" aria-labelledby="lgl-others-title">
            <h2 id="lgl-others-title" className="t-heading-4">Other policies</h2>
            <ul className="lgl-others-list">
              {others.map((o) => (
                <li key={o.href}><a href={o.href}>{o.label}</a></li>
              ))}
            </ul>
          </nav>
        </div>
      </section>
    </>
  )
}
