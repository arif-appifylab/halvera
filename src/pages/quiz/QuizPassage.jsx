import { useEffect, useId, useRef, useState } from 'react'
import { cx, Icon, Notice, ProgressBar } from '@/design-system'
import { track } from '@/lib/analytics/index.js'
import RichTextView from '@/components/editor/RichTextView.jsx'
import { SPLIT_MIN, SPLIT_MAX, SPLIT_DEFAULT } from './quiz-layout.js'

// The stimulus a group of questions hangs off (the admin's "Sticky passage"), kept simple: a name, then
// reading text as the admin's rich text editor saved it (passage.html; or plain paragraphs with optional
// letters) and/or a figure with a text alternative. QuizMedia is the builder's Audio or Image item, placed
// in the page above the questions after it. PassagePane is used by
// src/pages/QuizAttempt.jsx in three ways:
//   split   wide screens: its own column beside the questions, scrolling on its own
//   sticky  all on one page: sticks beside its questions while the page scrolls
//   inline  narrow screens: a "Show passage" toggle above the questions (the recording stays visible)
// Styles: src/pages/quiz-attempt.css (qa-pass-*, qa-clip-*, qa-plan-*, qa-day-*, qa-split).

const clock = (secs) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`

/* ---------- Passage ---------- */

// showHead: false when the page already says the passage's name (a listening part's title).
// passage.media: the builder's audio and image items, when they're what the questions refer to.
export function PassagePane({ passage, mode = 'split', showHead: head = true }) {
  const showHead = head && !!passage.title
  const titleId = useId()
  const bodyId = useId()
  const [open, setOpen] = useState(false)
  const hasBody = !!(passage.html || passage.paragraphs?.length || passage.figure || passage.intro)
  const inline = mode === 'inline'
  const lettered = passage.paragraphs?.some((p) => p.label)

  const body = (
    <>
      {passage.intro && <p className="qa-pass-intro">{passage.intro}</p>}
      {passage.figure && <Figure figure={passage.figure} />}
      {passage.html && <RichTextView value={passage.html} className="qa-pass-rich" />}
      {passage.paragraphs?.length > 0 && (
        <div className={cx('qa-pass-text', lettered && 'is-lettered')}>
          {passage.paragraphs.map((p, k) => (
            <p key={p.label || k} className="qa-pass-para">
              {p.label && <span className="qa-pass-letter"><span className="qa-vh">Paragraph </span>{p.label}</span>}
              <span>{p.text}</span>
            </p>
          ))}
        </div>
      )}
    </>
  )

  return (
    <section
      className={cx('qa-pass', `is-${mode}`)}
      aria-labelledby={showHead ? titleId : undefined}
      aria-label={showHead ? undefined : passage.audio || passage.media?.some((m) => m.kind === 'audio') ? 'Recording' : passage.media ? 'Image' : 'Passage'}
      // A column that scrolls on its own needs to be reachable by keyboard.
      tabIndex={mode === 'inline' ? undefined : 0}
    >
      {showHead && (
        <header className="qa-pass-head">
          {passage.label && <p className="sg-eyebrow">{passage.label}</p>}
          <h2 id={titleId} className="qa-pass-title">{passage.title}</h2>
        </header>
      )}
      {passage.audio && <AudioClip audio={passage.audio} />}
      {passage.media?.map((m) => <QuizMedia key={m.id} media={m} />)}
      {inline && hasBody ? (
        <>
          <button type="button" className="qa-disclosure qa-pass-toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((o) => !o)}>
            <Icon name="book" size={18} />
            <span className="qa-disclosure-text">
              <span className="qa-disclosure-title">{open ? 'Hide passage' : 'Show passage'}</span>
              <span className="qa-disclosure-meta">{passage.figure && !passage.paragraphs ? 'The chart and a text version' : lettered ? `Paragraphs ${passage.paragraphs[0].label}–${passage.paragraphs[passage.paragraphs.length - 1].label}` : 'Read it beside the questions'}</span>
            </span>
            <Icon name="chevron-down" size={20} className="qa-chevron" />
          </button>
          <div id={bodyId} className="qa-pass-body" hidden={!open}>{body}</div>
        </>
      ) : (
        <div className="qa-pass-body">{body}</div>
      )}
    </section>
  )
}

/* ---------- Figures (always left to right: a time axis doesn't mirror) ---------- */

function Figure({ figure }) {
  if (figure.kind === 'day') return <DayFigure figure={figure} />
  return (
    <figure className="qa-figure">
      <img src={figure.src} alt={figure.alt || ''} className="qa-figure-img" />
      {figure.caption && <figcaption className="t-body-sm t-muted">{figure.caption}</figcaption>}
    </figure>
  )
}

const toHours = (t) => {
  const [h, m] = t.split(':').map(Number)
  return h + m / 60
}

function DayFigure({ figure }) {
  const from = 6
  const to = 24
  const W = 440
  const pad = 22
  const x = (t) => pad + ((toHours(t) - from) / (to - from)) * (W - pad * 2)
  const ticks = [6, 9, 12, 15, 18, 21, 24]
  return (
    <figure className="qa-figure">
      <svg viewBox="0 0 440 160" className="qa-day" dir="ltr" role="img" aria-label={figure.alt}>
        <line x1={pad} x2={W - pad} y1={110} y2={110} className="qa-day-axis" />
        {ticks.map((h) => (
          <g key={h}>
            <line x1={x(`${h}:00`)} x2={x(`${h}:00`)} y1={104} y2={116} className="qa-day-axis" />
            <text x={x(`${h}:00`)} y={138} textAnchor="middle" className="qa-day-tick">{`${String(h % 24).padStart(2, '0')}:00`}</text>
          </g>
        ))}
        {figure.events.map((e, k) => {
          const up = k % 2 === 0
          return (
            <g key={e.at}>
              <line x1={x(e.at)} x2={x(e.at)} y1={up ? 50 : 70} y2={110} className="qa-day-stem" />
              <circle cx={x(e.at)} cy={110} r={7} className={cx('qa-day-dot', e.bed && 'is-bed')} />
              <text x={x(e.at)} y={up ? 30 : 50} textAnchor="middle" className="qa-day-label">{e.label}</text>
              <text x={x(e.at)} y={up ? 44 : 64} textAnchor="middle" className="qa-day-time">{e.at}</text>
            </g>
          )
        })}
      </svg>
      <figcaption className="qa-figcaption">
        <details className="qa-details">
          <summary>Read the chart as a list</summary>
          <ul className="qa-day-list">
            {figure.events.map((e) => <li key={e.at}><span className="t-strong" dir="ltr">{e.at}</span> · {e.label}{e.note ? `, ${e.note.charAt(0).toLowerCase()}${e.note.slice(1)}` : ''}</li>)}
          </ul>
        </details>
      </figcaption>
    </figure>
  )
}

/* ---------- Audio and image items ---------- */

// The builder's Audio or Image item in a quiz page. media: { kind: 'audio', title, src?, seconds?,
// transcript? } or { kind: 'image', src, alt, caption? }.
export function QuizMedia({ media }) {
  if (media.kind === 'image') {
    return (
      <figure className="qa-figure">
        <img src={media.src} alt={media.alt || ''} className="qa-figure-img" />
        {media.caption && <figcaption className="t-body-sm t-strong">{media.caption}</figcaption>}
      </figure>
    )
  }
  return <AudioClip audio={media} />
}

// Plays `audio.src` when there is one; otherwise the browser reads the transcript aloud (a stand-in
// recording for this preview). It can be played as often as the student likes.
function pickVoices() {
  try {
    const all = window.speechSynthesis.getVoices().filter((v) => /^en(-|_|$)/i.test(v.lang))
    const gb = all.filter((v) => /GB/i.test(v.lang))
    return (gb.length >= 2 ? gb : all.length ? all : gb)
  } catch {
    return []
  }
}

function AudioClip({ audio }) {
  const msgId = useId()
  const lines = audio.transcript || []
  const total = audio.seconds || Math.max(20, Math.round(lines.map((l) => l.text).join(' ').length / 14))
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined'
  const supported = !!audio.src || canSpeak
  const [playing, setPlaying] = useState(false)
  const [played, setPlayed] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const el = useRef(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      try { window.speechSynthesis?.cancel() } catch { /* nothing to stop */ }
    }
  }, [])

  const finish = () => {
    if (!alive.current) return
    setPlaying(false)
    setPlayed(true)
    setProgress(1)
    setStatus('The recording has finished.')
  }
  const stop = () => {
    if (audio.src) el.current?.pause()
    else try { window.speechSynthesis.cancel() } catch { /* nothing to stop */ }
    setPlaying(false)
    setStatus('The recording is stopped.')
  }

  const play = () => {
    if (playing || !supported) return
    track('audio_play', { source: 'quiz', title: audio.title })
    setPlaying(true)
    setProgress(0)
    setStatus('The recording is playing.')
    if (audio.src) {
      if (el.current) el.current.currentTime = 0
      el.current?.play().catch(finish)
      return
    }
    const synth = window.speechSynthesis
    synth.cancel()
    const voices = pickVoices()
    const speakers = [...new Set(lines.map((l) => l.speaker))]
    lines.forEach((line, k) => {
      const u = new window.SpeechSynthesisUtterance(line.text)
      const who = speakers.indexOf(line.speaker)
      if (voices.length) u.voice = voices[who % voices.length]
      u.lang = u.voice?.lang || 'en-GB'
      u.rate = 0.95
      u.pitch = voices.length > 1 ? 1 : 1 + (who % 2 ? -0.15 : 0.1)
      u.onstart = () => alive.current && setProgress(k / lines.length)
      u.onboundary = (e) => alive.current && line.text.length && setProgress((k + e.charIndex / line.text.length) / lines.length)
      if (k === lines.length - 1) { u.onend = finish; u.onerror = finish }
      synth.speak(u)
    })
  }

  return (
    <div className={cx('qa-clip', playing && 'is-playing')}>
      {audio.src && (
        <audio
          ref={el}
          src={audio.src}
          preload="auto"
          onTimeUpdate={(e) => e.currentTarget.duration && setProgress(e.currentTarget.currentTime / e.currentTarget.duration)}
          onEnded={finish}
        />
      )}
      <div className="qa-clip-head">
        <span className="qa-clip-icon"><Icon name="headphones" size={20} /></span>
        <span className="qa-clip-text">
          <span className="t-strong">{audio.title}</span>
          <span id={msgId} className="t-body-sm t-muted">Read the questions below first, then press play.</span>
        </span>
      </div>
      <div className="qa-clip-row">
        {playing ? (
          <button type="button" className="sg-btn sg-btn-secondary sg-btn-md" onClick={stop}>
            <Icon name="pause" size={18} /><span>Stop</span>
          </button>
        ) : (
          <button type="button" className="sg-btn sg-btn-primary sg-btn-md" onClick={play} disabled={!supported} aria-describedby={msgId}>
            <Icon name="play" size={18} /><span>{played ? 'Play again' : 'Play recording'}</span>
          </button>
        )}
        <div className="qa-clip-bar">
          <ProgressBar value={Math.round(progress * 100)} max={100} label="How much of the recording has played" showValue={false} />
        </div>
        <span className="qa-clip-time t-body-sm t-muted" dir="ltr" aria-hidden="true">{clock(progress * total)} / {clock(total)}</span>
      </div>
      {!supported && <Notice tone="warning" title="This browser can’t play the recording">Try another browser, or ask us for the recording as a file.</Notice>}
      <p className="qa-vh" role="status" aria-live="polite">{status}</p>
    </div>
  )
}

/* ---------- Resizable split ---------- */

// The bar between the passage and the questions. Drag it, or focus it and use the arrow keys.
// Percentages are of the container, measured from its inline start, so it works right to left too.
export function SplitDivider({ containerRef, value, onChange }) {
  const dragging = useRef(false)
  const clamp = (v) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, v))
  const rtl = () => !!containerRef.current && getComputedStyle(containerRef.current).direction === 'rtl'
  const at = (e) => {
    const r = containerRef.current.getBoundingClientRect()
    const px = rtl() ? r.right - e.clientX : e.clientX - r.left
    onChange(clamp((px / r.width) * 100))
  }
  const key = (e) => {
    const step = e.shiftKey ? 10 : 4
    const towardsEnd = rtl() ? 'ArrowLeft' : 'ArrowRight'
    const towardsStart = rtl() ? 'ArrowRight' : 'ArrowLeft'
    let next = null
    if (e.key === towardsEnd) next = value + step
    else if (e.key === towardsStart) next = value - step
    else if (e.key === 'Home') next = SPLIT_MIN
    else if (e.key === 'End') next = SPLIT_MAX
    if (next == null) return
    e.preventDefault()
    onChange(clamp(next))
  }
  return (
    <div
      className="qa-split"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the passage"
      aria-valuemin={SPLIT_MIN}
      aria-valuemax={SPLIT_MAX}
      aria-valuenow={Math.round(value)}
      aria-valuetext={`Passage ${Math.round(value)}% of the width`}
      tabIndex={0}
      onKeyDown={key}
      onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); e.preventDefault() }}
      onPointerMove={(e) => dragging.current && at(e)}
      onPointerUp={(e) => { dragging.current = false; e.currentTarget.releasePointerCapture?.(e.pointerId) }}
      onPointerCancel={() => { dragging.current = false }}
      onDoubleClick={() => onChange(SPLIT_DEFAULT)}
    >
      <span className="qa-split-grip" aria-hidden="true" />
    </div>
  )
}
