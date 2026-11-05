// Student dashboard → Notes (/student/dashboard/notes), opened from Home's "Your notes". Every lesson
// note, grouped by programme, newest first, each linking back to its lesson, with "Export notes"
// (a text file). The admin: "All notes are in My notes in the student dashboard, and can be exported."
import { useMemo } from 'react'
import { Button, Card, EmptyState } from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { notesFor, fullDate } from '@/lib/student.js'
import './dashboard.css'
import './library.css'

export default function Notes() {
  const { viewer } = useViewer()
  const groups = useMemo(() => notesFor(viewer), [viewer])
  const count = groups.reduce((n, g) => n + g.notes.length, 0)

  const exportNotes = () => {
    const text = groups.map((g) => [`# ${g.product.title}`, ...g.notes.map((n) => `- ${n.lesson?.title || n.lessonId} (${fullDate(n.at)}): ${n.text}`)].join('\n')).join('\n\n')
    const url = URL.createObjectURL(new Blob([text + '\n'], { type: 'text/plain' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'my-notes.txt' })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="db-page">
      <header className="db-head-row">
        <div className="db-head">
          <h1 className="t-heading-3">Your notes</h1>
          <p className="t-muted">{count ? `${count} ${count === 1 ? 'note' : 'notes'} from ${groups.length} ${groups.length === 1 ? 'programme' : 'programmes'}.` : 'Notes you write in lessons.'}</p>
        </div>
        {count > 0 && <Button variant="secondary" iconStart="download" onClick={exportNotes}>Export notes</Button>}
      </header>

      {groups.length ? groups.map((g) => (
        <Card key={g.slug} as="section" padding="lg" className="db-panel" aria-labelledby={`notes-${g.slug}`}>
          <h2 id={`notes-${g.slug}`} className="db-panel-title">{g.product.title}</h2>
          <ul className="lib-notes">
            {g.notes.map((n) => (
              <li key={n.id}>
                <p>{n.text}</p>
                <p className="t-caption t-muted"><a href={n.href}>{n.lesson?.title || 'Open the lesson'}</a> · {fullDate(n.at)}</p>
              </li>
            ))}
          </ul>
        </Card>
      )) : (
        <EmptyState icon="book" title="No notes yet" action={<Button variant="secondary" href="/student/dashboard/profile/enrollments">Open My library</Button>}>
          Notes you write in a lesson show here, so you can find them all in one place.
        </EmptyState>
      )}
    </div>
  )
}
