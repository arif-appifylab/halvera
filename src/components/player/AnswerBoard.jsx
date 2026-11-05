// Video walkthrough board: what an embedded lesson's embed code (Admin → Embedded → "Embed URL or code")
// draws in this theme. An optional intro video (e.g. "Oat bar label overview"), then Part 1, Part 2… each with
// Overview and A–E and no other text. Each button opens that video in a pop-up, and the pop-up can move
// between the six videos and on to the next part without closing. Watched videos get a tick, remembered
// in this browser (localStorage 'halvera-answer-board').
// board: { intro?: { title }, parts: number, options?: ['A', …] }
import { useState } from 'react'
import { Button, Icon, Modal } from '@/design-system'
import VideoPlayer from '@/components/media/VideoPlayer.jsx'
import { videoSourceFor } from '@/data/media.js'
import './answer-board.css'

const KEY = 'halvera-answer-board'
const LETTERS = ['A', 'B', 'C', 'D', 'E']
const OVERVIEW = 'overview'

const readWatched = (lessonKey) => {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}')[lessonKey] || [] } catch { return [] }
}
const saveWatched = (lessonKey, list) => {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    all[lessonKey] = list
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch { /* storage blocked: remembered for this visit only */ }
}

const choiceLabel = (c) => (c === OVERVIEW ? 'Overview' : c)
const choiceSpoken = (c) => (c === OVERVIEW ? 'overview' : `answer ${c}`)
const partOf = (n, c) => `p${n}-${c.toLowerCase()}`

// The six buttons for one part. `current` marks the one playing (in the pop-up).
function Choices({ n, options, watched, current, onPick, size }) {
  return (
    <div className={'ab-choices' + (size === 'sm' ? ' is-sm' : '')} role="group" aria-label={`Part ${n} videos`}>
      {[OVERVIEW, ...options].map((c) => {
        const seen = watched.includes(partOf(n, c))
        const on = current === c
        return (
          <button
            key={c} type="button"
            className={'ab-choice' + (c === OVERVIEW ? ' is-overview' : '') + (seen ? ' is-seen' : '') + (on ? ' is-current' : '')}
            aria-pressed={current !== undefined ? on : undefined}
            aria-label={`Part ${n}, ${choiceSpoken(c)} video${seen ? ', watched' : ''}`}
            onClick={() => onPick(n, c)}
          >
            {choiceLabel(c)}
            {seen && <Icon name="check" size={14} className="ab-seen" />}
          </button>
        )
      })}
    </div>
  )
}

export default function AnswerBoard({ board, product, lesson }) {
  const lessonKey = `${product.slug}/${lesson.id}`
  const [watched, setWatched] = useState(() => readWatched(lessonKey))
  const [open, setOpen] = useState(null) // { n, c }
  const options = board.options || LETTERS
  const parts = Array.from({ length: board.parts }, (_, i) => i + 1)

  const pick = (n, c) => {
    setOpen({ n, c })
    const part = partOf(n, c)
    if (!watched.includes(part)) {
      const next = [...watched, part]
      setWatched(next)
      saveWatched(lessonKey, next)
    }
  }

  const prev = open && open.n > 1 ? open.n - 1 : null
  const next = open && open.n < board.parts ? open.n + 1 : null

  return (
    <section className="ab" aria-label="Videos">
      {board.intro && (
        <div className="ab-intro">
          <h2 className="ab-title">{board.intro.title}</h2>
          <VideoPlayer source={videoSourceFor(product.slug, lesson.id, 'intro')} title={board.intro.title} resumeKey={`${lessonKey}/intro`} />
        </div>
      )}

      <ol className="ab-list">
        {parts.map((n) => (
          <li key={n} className="ab-q">
            <h2 className="ab-title">Part {n}</h2>
            <Choices n={n} options={options} watched={watched} onPick={pick} />
          </li>
        ))}
      </ol>

      <Modal
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        size="lg"
        title={open ? `Part ${open.n} · ${open.c === OVERVIEW ? 'Overview' : `Answer ${open.c}`}` : ''}
        footer={open && (
          <div className="ab-modal-foot">
            <Button variant="ghost" iconStart="chevron-left" disabled={!prev} onClick={() => prev && pick(prev, OVERVIEW)}>Previous part</Button>
            <Button variant="secondary" iconEnd="chevron-right" disabled={!next} onClick={() => next && pick(next, OVERVIEW)}>Next part</Button>
          </div>
        )}
      >
        {open && (
          <div className="ab-modal">
            <VideoPlayer
              key={partOf(open.n, open.c)}
              source={videoSourceFor(product.slug, lesson.id, partOf(open.n, open.c))}
              title={`Part ${open.n}, ${choiceSpoken(open.c)}`}
              resumeKey={`${lessonKey}/${partOf(open.n, open.c)}`}
            />
            <Choices n={open.n} options={options} watched={watched} current={open.c} onPick={pick} size="sm" />
          </div>
        )}
      </Modal>
    </section>
  )
}
