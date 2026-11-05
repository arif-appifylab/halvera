import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cx, EmptyState, Notice, Skeleton, Switch } from '@/design-system'
import { formatTime, spokenTime, parseVtt, seekMedia, useMediaTime } from './media.js'

const vttCache = new Map()

// Cues from the lesson's WebVTT file or its inline cue data.
function useCues(transcript) {
  const vtt = transcript?.vtt
  const inline = useMemo(
    () => (transcript?.cues ? transcript.cues.map(([start, end, text]) => ({ start, end, text })) : null),
    [transcript],
  )
  const [loaded, setLoaded] = useState(() => (vtt && vttCache.has(vtt) ? { vtt, cues: vttCache.get(vtt) } : null))
  const [failed, setFailed] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!vtt || vttCache.has(vtt)) return undefined
    let alive = true
    fetch(vtt)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text() })
      .then((src) => {
        const cues = parseVtt(src)
        vttCache.set(vtt, cues)
        if (alive) { setLoaded({ vtt, cues }); setFailed(null) }
      })
      .catch(() => { if (alive) setFailed(vtt) })
    return () => { alive = false }
  }, [vtt, attempt])

  if (inline) return { state: 'ready', cues: inline }
  if (!vtt) return { state: 'none', cues: [] }
  const cached = vttCache.get(vtt) || (loaded?.vtt === vtt ? loaded.cues : null)
  if (cached) return { state: 'ready', cues: cached }
  if (failed === vtt) return { state: 'error', cues: [], retry: () => { setFailed(null); setAttempt((n) => n + 1) } }
  return { state: 'loading', cues: [] }
}

function Highlight({ text, query }) {
  if (!query) return text
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  const out = []
  let from = 0
  let at = lower.indexOf(q)
  while (at !== -1) {
    if (at > from) out.push(text.slice(from, at))
    out.push(<mark key={at} className="lt-mark">{text.slice(at, at + q.length)}</mark>)
    from = at + q.length
    at = lower.indexOf(q, from)
  }
  if (from < text.length) out.push(text.slice(from))
  return out
}

// A transcript synced to the lesson's player: the line being spoken is highlighted, clicking a line
// jumps there, and "Follow along" keeps the current line in view.
export default function Transcript({ transcript, media, fill }) {
  const { state, cues, retry } = useCues(transcript)
  const time = useMediaTime(media)
  const [query, setQuery] = useState('')
  const [follow, setFollow] = useState(true)
  const listRef = useRef(null)
  const searchId = useId()

  const q = query.trim()
  const active = useMemo(() => {
    if (!media) return -1
    let at = -1
    for (let i = 0; i < cues.length; i += 1) {
      if (cues[i].start <= time + 0.05) at = i
      else break
    }
    // Between the last line's end and the next line nothing is spoken; keep the last line until then.
    return at
  }, [cues, time, media])
  const shown = q ? cues.map((c, i) => ({ ...c, i })).filter((c) => c.text.toLowerCase().includes(q.toLowerCase())) : cues.map((c, i) => ({ ...c, i }))

  // Follow along: scroll the list itself (never the page or a parent frame).
  useEffect(() => {
    if (!follow || q || active < 0) return
    const list = listRef.current
    const el = list?.querySelector(`[data-cue="${active}"]`)
    if (!list || !el) return
    const top = el.offsetTop - list.clientHeight / 3
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    list.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' })
  }, [active, follow, q])

  if (state === 'none') {
    return (
      <EmptyState icon="file" title="No transcript for this lesson yet">
        When the practitioner adds one, it appears here and follows the lesson as it plays.
      </EmptyState>
    )
  }
  if (state === 'error') {
    return (
      <Notice tone="danger" title="The transcript didn’t load" action={<button type="button" className="lt-textbtn" onClick={retry}>Try again</button>}>
        Check your connection and try again. The lesson itself still plays.
      </Notice>
    )
  }

  return (
    <div className={cx('lt-tx', fill && 'is-fill')}>
      <div className="lt-tx-tools">
        <div className="lt-tx-search">
          <label htmlFor={searchId} className="lt-sr">Search the transcript</label>
          <input
            id={searchId}
            type="search"
            className="sg-input lt-tx-input"
            placeholder="Search the transcript"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape' && query) { e.stopPropagation(); setQuery('') } }}
          />
        </div>
        {media && <Switch label="Follow along" checked={follow} onChange={setFollow} />}
      </div>

      <p className="lt-meta" role="status" aria-live="polite">
        {state === 'loading' ? 'Loading the transcript' : q ? `${shown.length} ${shown.length === 1 ? 'line matches' : 'lines match'} “${q}”` : media ? 'Select a line to play from there.' : `${cues.length} lines`}
      </p>

      {state === 'loading' ? (
        <div className="lt-tx-list" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={40} />)}
        </div>
      ) : (
        <ol ref={listRef} className="lt-tx-list" aria-label="Transcript">
          {shown.map((c) => {
            const on = c.i === active
            const body = (
              <>
                <span className="lt-tx-time" dir="ltr">{formatTime(c.start)}</span>
                <span className="lt-tx-text"><Highlight text={c.text} query={q} /></span>
              </>
            )
            return (
              <li key={c.i} data-cue={c.i}>
                {media ? (
                  <button
                    type="button"
                    className={cx('lt-tx-line', on && 'is-current')}
                    aria-current={on ? 'true' : undefined}
                    aria-label={`${spokenTime(c.start)}: ${c.text}`}
                    onClick={() => seekMedia(media, c.start)}
                  >
                    {body}
                  </button>
                ) : (
                  <div className="lt-tx-line is-static">{body}</div>
                )}
              </li>
            )
          })}
          {q && shown.length === 0 && <li className="lt-tx-none">Nothing in this transcript matches “{q}”.</li>}
        </ol>
      )}
    </div>
  )
}
