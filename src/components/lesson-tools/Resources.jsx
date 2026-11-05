import { EmptyState, Icon } from '@/design-system'
import { track } from '@/lib/analytics'
import { LtIcon } from './icons.jsx'

const hostOf = (href) => {
  try { return new URL(href).hostname.replace(/^www\./, '') } catch { return '' }
}

// Files and links for this lesson. Files download; links open in a new tab.
export default function Resources({ items }) {
  if (!items.length) {
    return (
      <EmptyState icon="file" title="No resources for this lesson">
        Files and links your practitioner adds to this lesson appear here.
      </EmptyState>
    )
  }

  const files = items.filter((r) => r.kind === 'file')
  const links = items.filter((r) => r.kind === 'link')

  return (
    <div className="lt-res">
      {files.length > 0 && (
        <section className="lt-res-group" aria-label="Files">
          <h3 className="lt-subhead">Files</h3>
          <ul className="lt-res-list">
            {files.map((f) => (
              <li key={f.name} className="lt-res-row">
                <span className="lt-res-icon"><Icon name="file" size={20} /></span>
                <span className="lt-res-text">
                  <span className="lt-res-name">{f.name}</span>
                  <span className="lt-res-meta">{[f.type, f.size].filter(Boolean).join(' · ')}</span>
                </span>
                <a
                  className="sg-btn sg-btn-secondary sg-btn-sm lt-res-action"
                  href={f.href}
                  download
                  aria-label={`Download ${f.name}`}
                  onClick={() => track('file_download', { file: f.name, fileType: f.type, size: f.size, source: 'lesson-tools' })}
                >
                  <Icon name="download" size={18} />
                  <span>Download</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {links.length > 0 && (
        <section className="lt-res-group" aria-label="Links">
          <h3 className="lt-subhead">Links</h3>
          <ul className="lt-res-list">
            {links.map((l) => (
              <li key={l.href} className="lt-res-row">
                <span className="lt-res-icon"><LtIcon name="link" size={20} /></span>
                <span className="lt-res-text">
                  <span className="lt-res-name">{l.name}</span>
                  <span className="lt-res-meta">{l.note || hostOf(l.href)}</span>
                </span>
                <a className="sg-btn sg-btn-ghost sg-btn-sm lt-res-action" href={l.href} target="_blank" rel="noopener noreferrer">
                  <span>Open</span>
                  <LtIcon name="external" size={16} />
                  <span className="lt-sr"> {l.name} (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
