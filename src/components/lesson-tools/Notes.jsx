import { useId, useRef, useState } from 'react'
import { cx, Badge, Button, EmptyState, Icon, SegmentedToggle } from '@/design-system'
import { formatTime, spokenTime, seekMedia, useMediaTime } from './media.js'
import { relativeTime } from './state.js'
import { LtIcon } from './icons.jsx'

const VIEWS = [{ value: 'lesson', label: 'This lesson' }, { value: 'all', label: 'All notes' }]

const byTime = (a, b) => (a.time ?? Infinity) - (b.time ?? Infinity) || a.at - b.at

// The student's notes. On video and audio lessons a new note is pinned to the moment the student
// starts typing ("Add note at 3:12"), and its time jumps the player back there.
export default function Notes({ notes, lesson, lessons, hrefFor, media, isMedia }) {
  const [view, setView] = useState('lesson')
  const [status, setStatus] = useState(null) // { text, undo? }
  const mine = [...(notes.all[lesson.id] || [])].sort(byTime)
  const total = Object.values(notes.all).reduce((n, list) => n + list.length, 0)

  const remove = (id) => {
    const removed = notes.remove(lesson.id, id)
    if (removed) setStatus({ text: 'Note deleted.', undo: removed })
  }

  return (
    <div className="lt-notes">
      <SegmentedToggle label="Show notes" options={VIEWS} value={view} onChange={(v) => { setView(v); setStatus(null) }} />

      {view === 'lesson' ? (
        <>
          <NoteComposer
            media={isMedia ? media : null}
            onAdd={(text, time) => { notes.add(lesson.id, text, time); setStatus({ text: time != null ? `Note added at ${formatTime(time)}.` : 'Note added.' }) }}
          />
          <Status status={status} onUndo={(u) => { notes.restore(u); setStatus({ text: 'Note restored.' }) }} />
          {mine.length === 0 ? (
            <EmptyState icon="book" title="No notes for this lesson yet">
              {isMedia
                ? 'Write a note while you watch or listen. It keeps the time, so you can jump straight back.'
                : 'Jot down what you want to remember. Notes stay with this lesson.'}
            </EmptyState>
          ) : (
            <ol className="lt-note-list" aria-label="Your notes for this lesson">
              {mine.map((n) => (
                <NoteItem
                  key={n.id}
                  note={n}
                  media={isMedia ? media : null}
                  onSave={(text) => { notes.edit(lesson.id, n.id, text); setStatus({ text: 'Note saved.' }) }}
                  onDelete={() => remove(n.id)}
                />
              ))}
            </ol>
          )}
        </>
      ) : (
        <AllNotes all={notes.all} total={total} lesson={lesson} lessons={lessons} hrefFor={hrefFor} media={isMedia ? media : null} />
      )}
    </div>
  )
}

function Status({ status, onUndo }) {
  return (
    <div className={cx('lt-note-status', !status && 'is-empty')} role="status" aria-live="polite">
      {status && (
        <>
          <span>{status.text}</span>
          {status.undo && <Button variant="link" size="sm" onClick={() => onUndo(status.undo)}>Undo</Button>}
        </>
      )}
    </div>
  )
}

function NoteComposer({ media, onAdd }) {
  const [text, setText] = useState('')
  const [pinned, setPinned] = useState(null)
  const live = useMediaTime(media)
  const id = useId()
  const time = media ? (pinned ?? live) : null
  const drift = media && pinned != null && Math.abs(live - pinned) >= 2

  const change = (value) => {
    if (media && !text.trim() && value.trim() && pinned == null) setPinned(media.currentTime || 0)
    if (!value.trim()) setPinned(null)
    setText(value)
  }
  const submit = (e) => {
    e.preventDefault()
    const v = text.trim()
    if (!v) return
    onAdd(v, media ? time : null)
    setText('')
    setPinned(null)
  }

  return (
    <form className="lt-note-form" onSubmit={submit}>
      <label htmlFor={id} className="sg-label">New note</label>
      <textarea
        id={id}
        className="sg-input lt-note-input"
        rows={3}
        value={text}
        placeholder={media ? 'What do you want to remember from this moment?' : 'What do you want to remember?'}
        onChange={(e) => change(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e) }}
        aria-describedby={media ? `${id}-time` : undefined}
      />
      <div className="lt-note-form-actions">
        <Button type="submit" size="sm" iconStart="plus" disabled={!text.trim()}>
          {media ? `Add note at ${formatTime(time)}` : 'Add note'}
        </Button>
        {drift && (
          <Button variant="link" size="sm" onClick={() => setPinned(live)}>Use {formatTime(live)} instead</Button>
        )}
      </div>
      {media && (
        <p id={`${id}-time`} className="lt-hint">
          {pinned != null ? `Pinned to ${spokenTime(pinned)}, when you started typing.` : 'The note keeps the time in the lesson when you start typing.'}
        </p>
      )}
    </form>
  )
}

function TimeChip({ time, media, href }) {
  const label = formatTime(time)
  if (media) {
    return (
      <button type="button" className="lt-chip" onClick={() => seekMedia(media, time)} aria-label={`Play from ${spokenTime(time)}`}>
        <Icon name="play" size={12} />{label}
      </button>
    )
  }
  if (href) return <a className="lt-chip" href={href} aria-label={`${label}, open the lesson`}>{label}</a>
  return <span className="lt-chip is-static">{label}</span>
}

function NoteItem({ note, media, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.text)
  const editRef = useRef(null)
  const id = useId()

  const start = () => { setDraft(note.text); setEditing(true); requestAnimationFrame(() => editRef.current?.focus()) }
  const save = (e) => {
    e.preventDefault()
    const v = draft.trim()
    if (!v) return
    onSave(v)
    setEditing(false)
  }

  return (
    <li className="lt-note">
      {note.time != null && <TimeChip time={note.time} media={media} />}
      {editing ? (
        <form className="lt-note-edit" onSubmit={save}>
          <label htmlFor={id} className="lt-sr">Edit note</label>
          <textarea
            id={id}
            ref={editRef}
            className="sg-input lt-note-input"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.stopPropagation(); setEditing(false) }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(e)
            }}
          />
          <div className="lt-note-form-actions">
            <Button type="submit" size="sm" disabled={!draft.trim()}>Save</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <>
          <p className="lt-note-text">{note.text}</p>
          <div className="lt-note-foot">
            <span className="lt-meta">{note.edited ? `Edited ${relativeTime(note.edited).toLowerCase()}` : `Added ${relativeTime(note.at).toLowerCase()}`}</span>
            <span className="lt-note-actions">
              <button type="button" className="lt-textbtn" onClick={start}><LtIcon name="edit" size={16} />Edit<span className="lt-sr"> note</span></button>
              <button type="button" className="lt-textbtn is-danger" onClick={onDelete}><LtIcon name="trash" size={16} />Delete<span className="lt-sr"> note</span></button>
            </span>
          </div>
        </>
      )}
    </li>
  )
}

// Every note in the course, grouped by lesson in curriculum order.
function AllNotes({ all, total, lesson, lessons, hrefFor, media }) {
  const groups = lessons.filter((l) => all[l.id]?.length)
  if (!groups.length) {
    return (
      <EmptyState icon="book" title="No notes in this course yet">
        Notes you add to any lesson are gathered here, lesson by lesson.
      </EmptyState>
    )
  }
  return (
    <div className="lt-all">
      <p className="lt-meta">
        {total} {total === 1 ? 'note' : 'notes'} in {groups.length} {groups.length === 1 ? 'lesson' : 'lessons'}
      </p>
      {groups.map((l) => {
        const current = l.id === lesson.id
        return (
          <section key={l.id} className="lt-all-group" aria-labelledby={`lt-all-${l.id}`}>
            <h3 id={`lt-all-${l.id}`} className="lt-all-title">
              {current ? <span>{l.title}</span> : <a href={hrefFor(l.id)}>{l.title}</a>}
              {current && <Badge tone="primary">This lesson</Badge>}
            </h3>
            <p className="lt-meta">{l.chapter}</p>
            <ol className="lt-note-list">
              {[...all[l.id]].sort(byTime).map((n) => (
                <li key={n.id} className="lt-note is-compact">
                  {n.time != null && <TimeChip time={n.time} media={current ? media : null} href={current ? undefined : hrefFor(l.id)} />}
                  <p className="lt-note-text">{n.text}</p>
                </li>
              ))}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
