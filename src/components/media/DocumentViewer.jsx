import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import { cx, Button, Icon, IconButton, Notice, Skeleton } from '@/design-system'
import { track } from '@/lib/analytics/index.js'
import './document-viewer.css'

// One viewer for PDF and slide lessons, built on react-pdf (Mozilla pdf.js). Slide decks arrive as PDF
// (the backend converts PPTX, Keynote and Google Slides on upload, one slide per page), so both modes
// share the same engine. See docs/document-viewer.md.
//
//   <DocumentViewer file="/files/symptom-tracker.pdf" mode="document" title="Symptom tracker" downloadable />
//   <DocumentViewer file="/files/gut-basics-slides.pdf" mode="slides" title="Your gut, in eight slides" />
//
// Props: file (URL), mode 'document' | 'slides', title, downloadable, onEvent(type, data),
// rememberKey (where to keep the reader's place; defaults to the file URL).
// Events (through track() and onEvent): doc_page_view { page, pages, seconds, previousPage },
// doc_zoom { zoom, previous }, doc_download. Every event also carries { mode, file }.

// pdf.js 6 calls a few very new built-ins at runtime (ES2025/2026). Fill them in on the main thread for
// browsers a year or two old; the worker uses pdf.js's legacy build, which carries its own polyfills.
Promise.try ??= function (fn, ...args) { return new Promise((resolve) => resolve(fn(...args))) }
Promise.withResolvers ??= function () { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
Math.sumPrecise ??= (items) => { let sum = 0; for (const n of items) sum += n; return sum }
for (const C of [Map, WeakMap]) {
  C.prototype.getOrInsert ??= function (key, value) { if (!this.has(key)) this.set(key, value); return this.get(key) }
  C.prototype.getOrInsertComputed ??= function (key, fn) { if (!this.has(key)) this.set(key, fn(key)); return this.get(key) }
}

// Vite emits the worker as its own asset and rewrites this URL at build time. Same version as the
// main build (pdfjs-dist 6.3.289), so the two talk to each other as usual.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString()

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2] // 1 = fit width
const THUMB_WIDTH = 132
const SETTLE_MS = 400 // a page has to stay put this long to count as viewed (skips pages flicked past)

// The reader's place per lesson, kept in memory for the session.
const places = new Map()

const clamp = (n, min, max) => Math.max(min, Math.min(max, n))
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function DocumentViewer({ file, mode = 'document', title = 'Document', downloadable = false, onEvent, rememberKey }) {
  const rootRef = useRef(null)
  const onEventRef = useRef(onEvent)
  useEffect(() => { onEventRef.current = onEvent })
  const [doc, setDoc] = useState({ pages: 0, ratio: mode === 'slides' ? 9 / 16 : Math.SQRT2 })
  const [attempt, setAttempt] = useState(0)
  const slides = mode === 'slides'
  const key = rememberKey || file

  const emit = useCallback((type, data = {}) => {
    const event = { mode, file, ...data }
    track(type, event)
    onEventRef.current?.(type, event)
  }, [mode, file])

  const onLoadSuccess = (pdf) => {
    pdf.getPage(1).then((p) => {
      const vp = p.getViewport({ scale: 1 })
      setDoc({ pages: pdf.numPages, ratio: vp.height / vp.width })
    }, () => setDoc((d) => ({ ...d, pages: pdf.numPages })))
  }

  const download = downloadable ? (
    <Button
      variant="secondary" size="sm" iconStart="download" href={file} download={fileName(title)}
      aria-label={`Download ${title}`} onClick={() => emit('doc_download', { title })}
    >
      Download
    </Button>
  ) : null

  const error = (
    <Notice
      tone="danger"
      title="We couldn’t open this document"
      action={download || <Button variant="secondary" size="sm" onClick={() => setAttempt((a) => a + 1)}>Try again</Button>}
    >
      {downloadable
        ? 'Your connection may have dropped for a moment, or the file is still being prepared. You can download it and open it on your device.'
        : 'Your connection may have dropped for a moment, or the file is still being prepared. Try again in a minute.'}
    </Notice>
  )

  const shared = { rootRef, title, emit, download, pages: doc.pages, ratio: doc.ratio, placeKey: key }

  return (
    <section
      ref={rootRef}
      className={cx('dv', slides ? 'dv-slides' : 'dv-document')}
      aria-label={`${title}, ${slides ? 'slide deck' : 'document'}`}
      style={{ '--dv-aspect': (1 / doc.ratio).toFixed(4) }}
    >
      <Document
        key={`${file}#${attempt}`}
        file={file}
        className="dv-doc"
        onLoadSuccess={onLoadSuccess}
        loading={<LoadingState slides={slides} />}
        error={error}
      >
        {doc.pages > 0 && (slides ? <SlideDeck {...shared} /> : <PageScroller {...shared} />)}
      </Document>
    </section>
  )
}

const fileName = (title) => `${title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'document'}.pdf`

/* ---------- Document mode ---------- */

// Continuous scroll: every page sits in one scrolling column, like the printed form it is. People
// scroll back and forth between the log and the instructions, it is what touch readers expect, and
// "Page n of N" follows the scroll. Pages render only as they come near the view.
function PageScroller({ rootRef, title, emit, download, pages, ratio, placeKey }) {
  const stageRef = useRef(null)
  const pageEls = useRef(new Map())
  const width = useWidth(stageRef)
  const [page, setPage] = useState(() => clamp(places.get(placeKey) || 1, 1, pages))
  const [zoom, setZoom] = useState(1)
  const [draft, setDraft] = useState(null)
  const pageWidth = Math.floor(width * zoom)

  usePageViews(page, pages, emit)
  useEffect(() => { places.set(placeKey, page) }, [placeKey, page])

  const scrollToPage = useCallback((n, smooth) => {
    const stage = stageRef.current
    const el = pageEls.current.get(n)
    if (!stage || !el) return
    stage.scrollTo({ top: el.offsetTop - parseFloat(getComputedStyle(stage).paddingBlockStart || 0), behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' })
  }, [])

  const goTo = (n) => {
    const target = clamp(n, 1, pages)
    setPage(target)
    scrollToPage(target, true)
  }

  // Back to the reader's place once the pages have a size, and keep the current page in view after a
  // zoom or a resize (only then, not on every page change, so the reader's own scrolling wins).
  const pageRef = useRef(page)
  useLayoutEffect(() => { pageRef.current = page }, [page])
  useLayoutEffect(() => {
    if (pageWidth) scrollToPage(pageRef.current, false)
  }, [pageWidth, scrollToPage])

  const frame = useRef(0)
  const onScroll = () => {
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const stage = stageRef.current
      if (!stage) return
      let current = 1
      if (stage.scrollTop + stage.clientHeight >= stage.scrollHeight - 2) current = pages
      else {
        const line = stage.scrollTop + stage.clientHeight * 0.35
        pageEls.current.forEach((el, n) => { if (el.offsetTop <= line && n > current) current = n })
      }
      setPage(current)
    })
  }
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const changeZoom = (next) => {
    if (next === zoom) return
    emit('doc_zoom', { zoom: Math.round(next * 100), previous: Math.round(zoom * 100) })
    setZoom(next)
  }
  const z = ZOOMS.indexOf(zoom)

  const commitDraft = () => {
    if (draft == null) return
    const n = parseInt(draft, 10)
    setDraft(null)
    if (Number.isFinite(n) && n !== page) goTo(n)
  }

  return (
    <>
      <div className="dv-bar">
        <DocTitle title={title} meta={`PDF · ${pages} ${pages === 1 ? 'page' : 'pages'}`} />
        <div className="dv-tools">
          <div className="dv-group" role="group" aria-label="Pages">
            <IconButton icon="chevron-left" size="sm" label="Previous page" disabled={page <= 1} onClick={() => goTo(page - 1)} />
            <span className="dv-value">
              <span aria-hidden="true">Page</span>
              <input
                className="dv-page-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={`Page number, ${pages} pages`}
                value={draft ?? String(page)}
                onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
                onFocus={(e) => e.target.select()}
                onBlur={commitDraft}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); commitDraft() }
                  if (e.key === 'Escape') setDraft(null)
                }}
              />
              <span aria-hidden="true">of {pages}</span>
            </span>
            <IconButton icon="chevron-right" size="sm" label="Next page" disabled={page >= pages} onClick={() => goTo(page + 1)} />
          </div>
          <div className="dv-group" role="group" aria-label="Zoom">
            <IconButton icon="minus" size="sm" label="Zoom out" disabled={z <= 0} onClick={() => changeZoom(ZOOMS[z - 1])} />
            <span className="dv-value dv-zoom" aria-live="polite">{Math.round(zoom * 100)}%</span>
            <IconButton icon="plus" size="sm" label="Zoom in" disabled={z >= ZOOMS.length - 1} onClick={() => changeZoom(ZOOMS[z + 1])} />
            <Button variant="ghost" size="sm" onClick={() => changeZoom(1)} disabled={zoom === 1}>Fit width</Button>
          </div>
          {download}
          <FullscreenButton target={rootRef} />
        </div>
      </div>
      <p className="dv-vh" aria-live="polite">Page {page} of {pages}</p>

      <div
        ref={stageRef}
        className="dv-stage"
        tabIndex={0}
        role="region"
        aria-label={`${title}, pages`}
        onScroll={onScroll}
      >
        <div className="dv-pages">
          {width > 0 && Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              ref={(el) => { if (el) pageEls.current.set(n, el); else pageEls.current.delete(n) }}
              className="dv-page"
              role="group"
              aria-label={`Page ${n} of ${pages}`}
              style={{ inlineSize: pageWidth, minBlockSize: Math.round(pageWidth * ratio) }}
            >
              <LazyPage pageNumber={n} width={pageWidth} rootRef={stageRef} eager={Math.abs(n - page) <= 1} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

/* ---------- Slides mode ---------- */

// One slide at a time on a stage that keeps the deck's own shape (16:9 for converted PPTX). The slides
// either side are rendered too, hidden, so moving on is instant.
function SlideDeck({ rootRef, title, emit, download, pages, placeKey }) {
  const stageRef = useRef(null)
  const stripRef = useRef(null)
  const width = useWidth(stageRef)
  const [page, setPage] = useState(() => clamp(places.get(placeKey) || 1, 1, pages))

  usePageViews(page, pages, emit)
  useEffect(() => { places.set(placeKey, page) }, [placeKey, page])

  const go = useCallback((n) => setPage(clamp(n, 1, pages)), [pages])

  // Keep the current thumbnail in view, scrolling only the strip (never the page).
  useEffect(() => {
    const strip = stripRef.current
    const el = strip?.querySelector('[aria-current="true"]')
    if (!strip || !el) return
    const s = strip.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    if (r.left >= s.left && r.right <= s.right) return
    strip.scrollBy({ left: r.left - s.left - (s.width - r.width) / 2, behavior: reducedMotion() ? 'auto' : 'smooth' })
  }, [page])

  // Arrow keys move back and forward, mirrored in right to left; Home and End jump to the ends.
  const onKeyDown = (e) => {
    if (e.target.closest('input, textarea, select')) return
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    const keys = {
      ArrowRight: rtl ? page - 1 : page + 1, ArrowLeft: rtl ? page + 1 : page - 1,
      PageDown: page + 1, PageUp: page - 1, Home: 1, End: pages,
    }
    if (e.key in keys) { e.preventDefault(); go(keys[e.key]) }
  }

  const layers = [page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages)

  return (
    <div className="dv-deck" onKeyDown={onKeyDown}>
      <div className="dv-bar">
        <DocTitle title={title} meta={`Slides · ${pages} ${pages === 1 ? 'slide' : 'slides'}`} />
        <div className="dv-tools">
          {download}
          <FullscreenButton target={rootRef} />
        </div>
      </div>

      <div className="dv-slide-frame">
        <div
          ref={stageRef}
          className="dv-slide-stage"
          role="group"
          aria-roledescription="slide"
          aria-label={`Slide ${page} of ${pages}`}
          tabIndex={0}
        >
          {width > 0 && layers.map((n) => (
            <div key={n} className={cx('dv-slide-layer', n === page && 'is-current')} aria-hidden={n === page ? undefined : true}>
              <Page
                pageNumber={n}
                width={width}
                className="dv-pdf-page"
                renderAnnotationLayer={false}
                renderTextLayer={n === page}
                loading={<span className="dv-page-loading" />}
                error={<PageError />}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="dv-deck-bar">
        <Button variant="ghost" size="sm" iconStart="arrow-left" onClick={() => go(page - 1)} disabled={page <= 1}>Previous</Button>
        <p className="dv-deck-count" aria-live="polite">Slide {page} of {pages}</p>
        <Button variant="secondary" size="sm" iconEnd="arrow-right" onClick={() => go(page + 1)} disabled={page >= pages}>Next</Button>
      </div>

      <ol className="dv-thumbs" ref={stripRef} aria-label="All slides">
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <li key={n}>
            <button
              type="button"
              className={cx('dv-thumb', n === page && 'is-current')}
              aria-current={n === page ? 'true' : undefined}
              aria-label={`Slide ${n}`}
              onClick={() => go(n)}
            >
              <span className="dv-thumb-page" aria-hidden="true">
                <LazyPage pageNumber={n} width={THUMB_WIDTH} rootRef={stripRef} thumb />
              </span>
              <span className="dv-thumb-num" aria-hidden="true">{n}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="t-caption t-muted dv-hint">Use the arrow keys or the buttons to move between slides.</p>
    </div>
  )
}

/* ---------- Shared parts ---------- */

function DocTitle({ title, meta }) {
  return (
    <span className="dv-title">
      <Icon name="file" size={18} />
      <span className="dv-title-text">
        <span className="t-strong">{title}</span>
        <span className="t-body-sm t-muted">{meta}</span>
      </span>
    </span>
  )
}

// Renders a page once it comes near the scrolling area (or straight away when eager).
function LazyPage({ pageNumber, width, rootRef, eager, thumb }) {
  const ref = useRef(null)
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')
  const show = near || eager

  useEffect(() => {
    if (near || !ref.current) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect() }
    }, { root: rootRef?.current || null, rootMargin: thumb ? '0px 400px' : '150% 0px' })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [near, rootRef, thumb])

  return (
    <span ref={ref} className="dv-lazy">
      {show ? (
        <Page
          pageNumber={pageNumber}
          width={width}
          className="dv-pdf-page"
          renderAnnotationLayer={false}
          renderTextLayer={!thumb}
          loading={<span className="dv-page-loading" />}
          error={thumb ? null : <PageError />}
        />
      ) : <span className="dv-page-loading" />}
    </span>
  )
}

function PageError() {
  return <p className="dv-page-error t-body-sm">We couldn’t show this page. Try scrolling away and back.</p>
}

function LoadingState({ slides }) {
  return (
    <div className="dv-loading" role="status">
      <span className="dv-vh">Opening the {slides ? 'slides' : 'document'}</span>
      <div className="dv-loading-bar" aria-hidden="true">
        <Skeleton width="40%" height={20} />
        <Skeleton width={160} height={20} />
      </div>
      <div className={cx('dv-loading-sheet', slides && 'is-slide')} aria-hidden="true">
        <Skeleton width="100%" height="100%" radius="var(--radius-md)" />
      </div>
    </div>
  )
}

const MAXIMIZE = ['M8 3H5a2 2 0 0 0-2 2v3', 'M21 8V5a2 2 0 0 0-2-2h-3', 'M3 16v3a2 2 0 0 0 2 2h3', 'M16 21h3a2 2 0 0 0 2-2v-3']
const MINIMIZE = ['M8 3v3a2 2 0 0 1-2 2H3', 'M21 8h-3a2 2 0 0 1-2-2V3', 'M3 16h3a2 2 0 0 1 2 2v3', 'M16 21v-3a2 2 0 0 1 2-2h3']

function FullscreenButton({ target }) {
  const [active, setActive] = useState(false)
  useEffect(() => {
    const onChange = () => setActive(document.fullscreenElement === target.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [target])

  if (typeof document === 'undefined' || !document.fullscreenEnabled) return null
  const label = active ? 'Exit full screen' : 'Full screen'
  const toggle = () => {
    if (active) document.exitFullscreen?.()
    else target.current?.requestFullscreen?.().catch(() => {})
  }
  return (
    <button type="button" className="sg-iconbtn sg-iconbtn-ghost sg-iconbtn-sm dv-fs" aria-label={label} title={label} aria-pressed={active} onClick={toggle}>
      <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {(active ? MINIMIZE : MAXIMIZE).map((d) => <path key={d} d={d} />)}
      </svg>
    </button>
  )
}

/* ---------- Hooks ---------- */

function useWidth(ref) {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setWidth(Math.floor(el.clientWidth - parseFloat(getComputedStyle(el).paddingInlineStart || 0) - parseFloat(getComputedStyle(el).paddingInlineEnd || 0)))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}

// doc_page_view once a page settles, with the seconds spent on the page before it.
function usePageViews(page, pages, emit) {
  const last = useRef({ page: null, at: 0 })
  useEffect(() => {
    if (!pages) return
    const t = setTimeout(() => {
      const prev = last.current
      if (prev.page === page) return
      const now = performance.now()
      emit('doc_page_view', {
        page, pages,
        seconds: prev.page == null ? 0 : Math.round((now - prev.at) / 100) / 10,
        previousPage: prev.page ?? undefined,
      })
      last.current = { page, at: now }
    }, SETTLE_MS)
    return () => clearTimeout(t)
  }, [page, pages, emit])
}
