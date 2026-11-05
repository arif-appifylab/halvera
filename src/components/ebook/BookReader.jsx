import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Icon, IconButton } from '@/design-system'
import { track } from '@/lib/analytics'
import Flipbook from './Flipbook.jsx'
import './book-reader.css'

// An ebook lesson: the book's cover in the lesson, and "Open book" opens the flipbook full screen
// (the browser's full screen where it's allowed, otherwise a reader over the whole window). The
// reader is only the book: its name, text size, Close, and the page turns. No contents list.
// Esc (or leaving the browser's full screen) closes it, and reopening goes back to the same page.

const SIZES = ['Small', 'Medium', 'Large']
const pagesKey = (book) => `halvera-ebook-page:${book.title}`

function readPage(book) {
  try {
    const v = Number(localStorage.getItem(pagesKey(book)))
    return Number.isInteger(v) && v > 0 ? v : 0
  } catch {
    return 0
  }
}

function savePage(book, page) {
  try { localStorage.setItem(pagesKey(book), String(page)) } catch { /* a convenience only */ }
}

export default function BookReader({ book }) {
  const [reading, setReading] = useState(false)
  const [lastPage, setLastPage] = useState(() => readPage(book))
  const openRef = useRef(null)
  const pages = book.chapters.reduce((n, ch) => n + ch.pages.length, 0)

  const open = () => {
    setReading(true)
    // Ask for the browser's full screen in the click itself (browsers only allow it from a gesture).
    document.documentElement.requestFullscreen?.().catch(() => { /* not allowed here: the reader still fills the window */ })
  }
  const close = (page) => {
    if (page != null) { setLastPage(page); savePage(book, page) }
    setReading(false)
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
  }
  // Back on the lesson (once the page behind is reachable again), focus returns to the button.
  const wasReading = useRef(false)
  useEffect(() => {
    if (wasReading.current && !reading) openRef.current?.focus()
    wasReading.current = reading
  }, [reading])

  return (
    <>
      <section className="br-cover" aria-label={`${book.title}, ebook`}>
        <div className="br-cover-art" aria-hidden="true">
          <span className="br-cover-title">{book.title}</span>
          <span className="br-cover-author">{book.author}</span>
        </div>
        <div className="br-cover-text">
          <p className="sg-eyebrow">Ebook</p>
          <h2 className="t-heading-3">{book.title}</h2>
          <p className="t-body-sm t-muted">{book.author} · {pages} pages</p>
          <p className="t-body-sm t-muted">
            {lastPage > 0 ? `You stopped at page ${lastPage + 1}. It opens full screen, where you left off.` : 'It opens full screen. Turn the pages with the arrow keys, a tap or a swipe.'}
          </p>
          <div>
            <Button ref={openRef} variant="secondary" iconStart="book" onClick={open}>
              {lastPage > 0 ? 'Continue reading' : 'Open book'}
            </Button>
          </div>
        </div>
      </section>
      {reading && createPortal(<Reader book={book} startAt={lastPage} pagesTotal={pages} onClose={close} />, document.body)}
    </>
  )
}

function Reader({ book, startAt, pagesTotal, onClose }) {
  const [size, setSize] = useState(1)
  const [shown, setShown] = useState(null) // { first, last, total, visible } from the flipbook
  const flipRef = useRef(null)
  const shownRef = useRef(null)
  const seen = useRef({ page: null, at: 0 })
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose; shownRef.current = shown })

  // Over the whole window: the page behind can't be reached or scrolled while the book is open.
  useEffect(() => {
    const root = document.getElementById('root')
    const overflow = document.body.style.overflow
    if (root) root.inert = true
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => flipRef.current?.focus(), 0)
    return () => {
      clearTimeout(t)
      if (root) root.inert = false
      document.body.style.overflow = overflow
    }
  }, [])

  // Esc closes the book. In the browser's full screen, Esc leaves full screen first, so that closes it too.
  useEffect(() => {
    const finish = () => onCloseRef.current(shownRef.current?.first ?? null)
    const onKey = (e) => { if (e.key === 'Escape' && !document.fullscreenElement) { e.preventDefault(); finish() } }
    let wasFull = !!document.fullscreenElement
    const onFull = () => {
      if (document.fullscreenElement) wasFull = true
      else if (wasFull) finish()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFull)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFull)
    }
  }, [])

  // doc_page_view once per page per visit, with the seconds spent on the pages before. Pages are the
  // book's authored pages (the same at any font or screen size), so "pages viewed / total" still
  // drives ebook completion; the flipbook's own page numbers ride along as screenPage.
  useEffect(() => {
    if (!shown || seen.current.page === shown.first) return
    const now = performance.now()
    const prev = seen.current
    const seconds = prev.page == null ? 0 : Math.round((now - prev.at) / 100) / 10
    shown.visible.forEach(({ index, chapter, sources }) => {
      sources.forEach((src) => {
        track('doc_page_view', {
          page: src + 1, total: pagesTotal, chapter: chapter + 1, seconds,
          screenPage: index + 1, screenTotal: shown.total, dedupeKey: `page-${src + 1}`,
        })
      })
    })
    seen.current = { page: shown.first, at: now }
  }, [shown, pagesTotal])

  const count = !shown ? '' : shown.first === shown.last
    ? `Page ${shown.first + 1} of ${shown.total}`
    : `Pages ${shown.first + 1}–${shown.last + 1} of ${shown.total}`

  return (
    <div className="br-reader" role="dialog" aria-modal="true" aria-label={`${book.title}, reader`}>
      <header className="br-bar">
        <span className="br-name">
          <Icon name="book" size={18} />
          <span className="t-strong">{book.title}</span>
          <span className="t-body-sm t-muted br-author">{book.author}</span>
        </span>
        <div className="br-tools">
          <div className="br-size" role="group" aria-label={`Text size: ${SIZES[size]}`}>
            <button type="button" className="br-size-btn" aria-label="Smaller text" disabled={size === 0} onClick={() => setSize(size - 1)}>A−</button>
            <button type="button" className="br-size-btn is-large" aria-label="Larger text" disabled={size === SIZES.length - 1} onClick={() => setSize(size + 1)}>A+</button>
          </div>
          <IconButton icon="x" label="Close book" onClick={() => onClose(shown?.first ?? null)} />
        </div>
      </header>

      <div className="br-stage">
        <Flipbook ref={flipRef} book={book} size={size} startPage={startAt} onChange={setShown} />
      </div>

      <footer className="br-nav">
        <Button variant="ghost" size="sm" iconStart="arrow-left" disabled={!shown || shown.first === 0} onClick={() => flipRef.current?.prev()}>Previous page</Button>
        <p className="br-count" aria-live="polite">{count}</p>
        <Button variant="secondary" size="sm" iconEnd="arrow-right" disabled={!shown || shown.last === shown.total - 1} onClick={() => flipRef.current?.next()}>Next page</Button>
      </footer>
    </div>
  )
}
