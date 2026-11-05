import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { cx } from '@/design-system'
import { paginate, pageKey, pageAt, paraClass } from './paginate.js'
import './flipbook.css'

// A printed-book reader, our own code. Two-page spreads on wide landscape screens (a spine, page
// edges and a cover on the right), one page elsewhere. Pages turn around the spine with CSS 3D
// transforms; the turn is driven by one progress value p (0 = the lower view lies open, 1 = the
// higher one) so clicks, keys and dragging all share it. With reduced motion, pages cross-fade.
//
// Props: book { title, author, chapters: [{ title, pages: [[paragraph]] }] }, size (0–2, the
// A−/A+ step), startPage (the page index to open at, e.g. where the reader stopped), onChange({ first, last, total, chapter, starts, spread, visible: [{ index, chapter,
// sources }] }) after each turn
// or re-pagination, ref → { next, prev, first, last, goToPage(index, { focus }), focus }.

const TURN_MS = 600
const SPREAD_QUERY = '(min-width: 900px) and (orientation: landscape)'
const MIN_SPREAD_WIDTH = 640
const JUSTIFY_FROM = 400 // page width (px) from which text is justified
const EDGE_ROOM = 10 // space for the page edges either side of the book

const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2)
const easeOut = (k) => 1 - (1 - k) ** 3
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

const viewCount = (total, spread) => (spread ? Math.floor(total / 2) + 1 : total)
const viewOf = (index, spread) => (spread ? Math.floor((index + 1) / 2) : index)
// The page indices shown in a view: on spreads `start` is the left page (right in RTL), `end` the other.
const sidesOf = (v, total, spread) => (spread
  ? { start: v > 0 ? 2 * v - 1 : null, end: 2 * v < total ? 2 * v : null }
  : { start: null, end: v < total ? v : null })

function useMedia(query) {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setOn(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])
  return on
}

function pageSize(box, spread) {
  const avail = box.width - 2 * EDGE_ROOM
  const pageW = Math.floor(spread ? Math.min(avail / 2, 520) : Math.min(avail, 600))
  const maxH = Math.max(420, box.height * 0.72)
  const pageH = Math.round(clamp(pageW * (spread ? 1.32 : 1.42), 400, maxH))
  return { pageW, pageH }
}

const edgeWidth = (n) => Math.min(8, Math.ceil(n / 2))

function Page({ page, index, side, book, size, spread, live }) {
  if (!page) return null
  const blank = page.kind === 'blank'
  const a11y = live
    ? { role: 'region', 'aria-label': blank ? `Page ${index + 1}, blank` : `Page ${index + 1}` }
    : { 'aria-hidden': true }

  if (page.kind === 'cover') {
    return (
      <div className={cx('fb-page', 'fb-cover', `is-${side}`)} {...a11y}>
        <p className="fb-cover-title">{book.title}</p>
        <span className="fb-cover-rule" aria-hidden="true" />
        <p className="fb-cover-author">{book.author}</p>
      </div>
    )
  }
  if (blank) return <div className={cx('fb-page', `is-${side}`)} {...a11y} />

  const chapter = book.chapters[page.chapter]
  const run = page.opener ? '' : spread && side === 'start' ? book.title : `Chapter ${page.chapter + 1} · ${chapter.title}`
  return (
    <div className={cx('fb-page', `fb-size-${size}`, `is-${side}`)} {...a11y}>
      <p className="fb-run">{run}</p>
      <div className="fb-body">
        {page.opener && (
          <header className="fb-opener">
            <p className="fb-opener-num">Chapter {page.chapter + 1}</p>
            <h2 className="fb-opener-title">{chapter.title}</h2>
          </header>
        )}
        {page.items.map((it) => <p key={`${it.para}-${it.from}`} className={paraClass(it.indent, it.split)}>{it.text}</p>)}
      </div>
      <p className="fb-folio">{index + 1}</p>
    </div>
  )
}

export default function Flipbook({ book, size = 1, startPage = 0, onChange, ref }) {
  const stageRef = useRef(null)
  const bookRef = useRef(null)
  const measureRef = useRef(null)
  const wide = useMedia(SPREAD_QUERY)
  const reduced = useMedia('(prefers-reduced-motion: reduce)')
  const [box, setBox] = useState(null)
  const [rtl, setRtl] = useState(false)
  const [fontsTick, setFontsTick] = useState(0)
  const [paged, setPaged] = useState(null)
  const [view, setView] = useState(0)
  const [turn, setTurn] = useState(null) // { lo, hi } while a leaf is turning
  const [fade, setFade] = useState(null) // { view, key } fading out (reduced motion)

  const spread = !!box && wide && box.width >= MIN_SPREAD_WIDTH
  const dims = box && pageSize(box, spread)
  const pageW = dims?.pageW
  const pageH = dims?.pageH

  // Live values for event handlers and the animation loop.
  const live = useRef({})
  useLayoutEffect(() => { live.current = { paged, reduced, rtl, dims } })
  const viewRef = useRef(0)
  const turnRef = useRef(null)
  const pRef = useRef(0)
  const targetRef = useRef(null)
  const rafRef = useRef(0)
  const dragRef = useRef(null)
  const bookIdRef = useRef(book)
  const onChangeRef = useRef(onChange)
  const startRef = useRef(startPage)
  useLayoutEffect(() => { onChangeRef.current = onChange })

  const count = () => (live.current.paged ? viewCount(live.current.paged.pages.length, live.current.paged.spread) : 1)

  const applyP = (p) => {
    pRef.current = p
    const el = bookRef.current
    if (!el) return
    el.style.setProperty('--fb-p', p.toFixed(4))
    el.style.setProperty('--fb-angle', `${(live.current.rtl ? 180 : -180) * p}deg`)
  }

  const commit = (v) => {
    viewRef.current = v
    setView(v)
  }

  const finishTurn = () => {
    const t = turnRef.current
    if (!t) return
    turnRef.current = null
    targetRef.current = null
    commit(pRef.current >= 0.5 ? t.hi : t.lo)
    setTurn(null)
    applyP(0)
  }

  // Ends a running turn at once, where it was heading.
  const settle = () => {
    if (!turnRef.current) return
    cancelAnimationFrame(rafRef.current)
    pRef.current = targetRef.current ?? (pRef.current >= 0.5 ? 1 : 0)
    finishTurn()
  }

  const startTurn = (to) => {
    const from = viewRef.current
    const t = { lo: Math.min(from, to), hi: Math.max(from, to) }
    turnRef.current = t
    setTurn(t)
    applyP(to > from ? 0 : 1)
  }

  const animateTo = (target, ease) => {
    cancelAnimationFrame(rafRef.current)
    targetRef.current = target
    const from = pRef.current
    const dur = Math.max(140, TURN_MS * Math.abs(target - from))
    const t0 = performance.now()
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur)
      applyP(from + (target - from) * ease(k))
      if (k < 1) rafRef.current = requestAnimationFrame(step)
      else finishTurn()
    }
    rafRef.current = requestAnimationFrame(step)
  }

  // v is a view number, or a function of the current one (read after any running turn settles).
  const goView = (v) => {
    if (dragRef.current?.active) return
    settle()
    const to = clamp(typeof v === 'function' ? v(viewRef.current) : v, 0, count() - 1)
    const from = viewRef.current
    if (to === from) return
    if (live.current.reduced) {
      setFade({ view: from, key: performance.now() })
      commit(to)
      return
    }
    startTurn(to)
    animateTo(to > from ? 1 : 0, easeInOut)
  }

  const api = {
    next: () => goView((v) => v + 1),
    prev: () => goView((v) => v - 1),
    first: () => goView(0),
    last: () => goView(() => count() - 1),
    goToPage: (index, { focus } = {}) => {
      goView(viewOf(index, live.current.paged?.spread))
      if (focus) bookRef.current?.focus({ preventScroll: true })
    },
    focus: () => bookRef.current?.focus({ preventScroll: true }),
  }
  useImperativeHandle(ref, () => api)

  // Stage width, direction and (roughly) the window height.
  useLayoutEffect(() => {
    const el = stageRef.current
    const read = () => {
      const cs = getComputedStyle(el)
      const width = Math.floor(el.clientWidth - parseFloat(cs.paddingInlineStart) - parseFloat(cs.paddingInlineEnd))
      const height = Math.round(window.innerHeight / 80) * 80
      setBox((b) => (b && b.width === width && b.height === height ? b : { width, height }))
      setRtl(cs.direction === 'rtl')
    }
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    // The language switch sets <html dir>; follow it without a resize.
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['dir', 'lang'] })
    window.addEventListener('resize', read)
    return () => {
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener('resize', read)
    }
  }, [])

  // Web fonts change line breaks: paginate again once they arrive.
  useEffect(() => {
    const fonts = document.fonts
    if (!fonts) return undefined
    const bump = () => setFontsTick((t) => t + 1)
    fonts.ready.then(bump)
    fonts.addEventListener?.('loadingdone', bump)
    return () => fonts.removeEventListener?.('loadingdone', bump)
  }, [])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // The cross-fade overlay (reduced motion) leaves after its 200ms fade.
  useEffect(() => {
    if (!fade) return undefined
    const t = setTimeout(() => setFade(null), 240)
    return () => clearTimeout(t)
  }, [fade])

  // Paginate for the current page size and font size, keeping the reader at the same text.
  useLayoutEffect(() => {
    if (!pageW || !pageH || !measureRef.current) return
    cancelAnimationFrame(rafRef.current)
    turnRef.current = null
    targetRef.current = null
    dragRef.current = null
    applyP(0)

    const old = live.current.paged
    const same = !!old && bookIdRef.current === book
    let key = null
    if (same) {
      const s = sidesOf(viewRef.current, old.pages.length, old.spread)
      key = [s.start, s.end].map((i) => (i == null ? null : pageKey(old.pages[i]))).find((k) => k != null) ?? null
    }
    bookIdRef.current = book
    const next = paginate(book, measureRef.current)
    const v = key != null ? viewOf(pageAt(next.pages, key), next.spread)
      : same ? Math.min(viewRef.current, viewCount(next.pages.length, next.spread) - 1)
        : viewOf(clamp(startRef.current, 0, next.pages.length - 1), next.spread)
    setTurn(null)
    setFade(null)
    setPaged(next)
    commit(v)
  }, [book, size, spread, pageW, pageH, fontsTick])

  // Tell the reader what is open.
  useEffect(() => {
    if (!paged) return
    const total = paged.pages.length
    const s = sidesOf(view, total, paged.spread)
    const first = s.start ?? s.end
    const last = s.end ?? s.start
    const visible = []
    for (let i = first; i <= last; i++) visible.push({ index: i, chapter: paged.pages[i].chapter, sources: paged.pages[i].sources || [] })
    const withText = visible.filter((p) => p.chapter != null)
    const chapter = withText.length ? withText[withText.length - 1].chapter : -1
    onChangeRef.current?.({ first, last, total, chapter, starts: paged.starts, spread: paged.spread, visible })
  }, [view, paged])

  /* ---------- Pointer: drag a corner or edge, swipe, or tap the outer half ---------- */

  const logicalX = (clientX, rect) => (live.current.rtl ? rect.right - clientX : clientX - rect.left)

  const zoneAt = (lx, w) => {
    const { paged: pg, dims: d } = live.current
    if (!pg || !d) return null
    const v = viewRef.current
    const canNext = v < count() - 1
    const canPrev = v > 0
    const edge = Math.max(44, d.pageW * 0.2)
    if (lx > w - edge && canNext) return 'grab-next'
    if (lx < edge && canPrev) return 'grab-prev'
    const outer = pg.spread ? w * 0.25 : w * 0.5
    if (lx > w - outer && canNext) return 'next'
    if (lx < (pg.spread ? outer : w * 0.25) && canPrev) return 'prev'
    return null
  }

  const progressFor = (d, clientX) => {
    const lx = logicalX(clientX, d.rect)
    if (live.current.paged.spread) {
      // The leaf's outer edge follows the pointer: edge x = spine + pageW · cos(πp).
      const half = d.rect.width / 2
      const offset = (d.forward ? 1 : -1) - (d.lx0 - half) / half
      return Math.acos(clamp((lx - half) / half + offset, -1, 1)) / Math.PI
    }
    return clamp((d.forward ? 0 : 1) - (lx - d.lx0) / d.rect.width, 0, 1)
  }

  const onPointerDown = (e) => {
    if (e.button !== 0 || !live.current.paged) return
    if (e.target.closest('a, button, input, select, textarea')) return
    const rect = bookRef.current.getBoundingClientRect()
    const lx = logicalX(e.clientX, rect)
    const zone = zoneAt(lx, rect.width)
    const touch = e.pointerType !== 'mouse'
    const grab = zone === 'grab-next' || zone === 'grab-prev'
    // Mouse drags start at a page edge, so text in the middle of the page can still be selected.
    if (!touch && grab) e.preventDefault()
    dragRef.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: e.timeStamp, lx0: lx, rect, zone, canDrag: touch || grab, active: false, samples: [] }
  }

  const onPointerMove = (e) => {
    const d = dragRef.current
    if (!d) {
      if (e.pointerType === 'mouse' && bookRef.current) {
        const rect = bookRef.current.getBoundingClientRect()
        const zone = turnRef.current ? null : zoneAt(logicalX(e.clientX, rect), rect.width)
        if (bookRef.current.dataset.zone !== (zone || '')) bookRef.current.dataset.zone = zone || ''
      }
      return
    }
    if (d.id !== e.pointerId) return
    const dx = (e.clientX - d.x0) * (live.current.rtl ? -1 : 1)
    if (!d.active) {
      if (!d.canDrag || Math.abs(dx) < 8) return
      if (Math.abs(e.clientY - d.y0) > Math.abs(dx)) { dragRef.current = null; return }
      settle()
      const forward = dx < 0
      const to = viewRef.current + (forward ? 1 : -1)
      if (to < 0 || to >= count()) { dragRef.current = null; return }
      d.active = true
      d.forward = forward
      d.to = to
      bookRef.current.setPointerCapture?.(e.pointerId)
      bookRef.current.classList.add('is-dragging')
      if (!live.current.reduced) startTurn(to)
    }
    if (live.current.reduced) return
    const p = progressFor(d, e.clientX)
    d.samples.push({ p, t: e.timeStamp })
    if (d.samples.length > 5) d.samples.shift()
    applyP(p)
  }

  const onPointerUp = (e) => {
    const d = dragRef.current
    if (!d || d.id !== e.pointerId) return
    dragRef.current = null
    bookRef.current?.classList.remove('is-dragging')
    const cancelled = e.type === 'pointercancel'

    if (!d.active) {
      const still = Math.abs(e.clientX - d.x0) < 8 && Math.abs(e.clientY - d.y0) < 8
      const selected = window.getSelection && !window.getSelection().isCollapsed
      if (cancelled || !still || selected || e.timeStamp - d.t0 > 600) return
      if (d.zone === 'next' || d.zone === 'grab-next') api.next()
      else if (d.zone === 'prev' || d.zone === 'grab-prev') api.prev()
      else return
      api.focus()
      return
    }

    if (live.current.reduced) {
      const dx = (e.clientX - d.x0) * (live.current.rtl ? -1 : 1)
      if (!cancelled && Math.abs(dx) > 40) goView(d.to)
      return
    }
    // Past halfway (or flicked that way) completes the turn; otherwise the page springs back.
    const s = d.samples
    const v = s.length > 1 ? (s[s.length - 1].p - s[0].p) / Math.max(1, s[s.length - 1].t - s[0].t) : 0
    const projected = pRef.current + v * 150
    const done = !cancelled && (d.forward ? projected > 0.5 : projected < 0.5)
    animateTo(d.forward === done ? 1 : 0, easeOut)
  }

  const onKeyDown = (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const r = live.current.rtl
    const keys = {
      ArrowRight: r ? api.prev : api.next,
      ArrowLeft: r ? api.next : api.prev,
      PageDown: api.next,
      PageUp: api.prev,
      Home: api.first,
      End: api.last,
    }
    const fn = keys[e.key]
    if (fn) { e.preventDefault(); fn() }
  }

  /* ---------- Render ---------- */

  const pages = paged?.pages || []
  const total = pages.length
  const sp = !!paged?.spread
  const pageProps = { book, size, spread: sp }

  const viewSlots = (v, isLive) => {
    const s = sidesOf(v, total, sp)
    return (
      <>
        {s.start != null && (
          <div className="fb-slot fb-slot-start" style={{ '--fb-edge': `${edgeWidth(s.start)}px` }}>
            <Page {...pageProps} page={pages[s.start]} index={s.start} side="start" live={isLive} />
            <span className="fb-corner" aria-hidden="true" />
          </div>
        )}
        {s.end != null && (
          <div className="fb-slot fb-slot-end" style={{ '--fb-edge': `${edgeWidth(total - 1 - s.end)}px` }}>
            <Page {...pageProps} page={pages[s.end]} index={s.end} side="end" live={isLive} />
            <span className="fb-corner" aria-hidden="true" />
          </div>
        )}
      </>
    )
  }

  let content = null
  if (paged && turn) {
    const lo = sidesOf(turn.lo, total, sp)
    const hi = sidesOf(turn.hi, total, sp)
    content = (
      <>
        {sp && lo.start != null && (
          <div className="fb-slot fb-slot-start" style={{ '--fb-edge': `${edgeWidth(lo.start)}px` }}>
            <Page {...pageProps} page={pages[lo.start]} index={lo.start} side="start" />
            <span className="fb-shade" />
          </div>
        )}
        {hi.end != null && (
          <div className="fb-slot fb-slot-end" style={{ '--fb-edge': `${edgeWidth(total - 1 - hi.end)}px` }}>
            <Page {...pageProps} page={pages[hi.end]} index={hi.end} side="end" />
            <span className="fb-shade" />
          </div>
        )}
        <div className="fb-leafbox" aria-hidden="true">
          <div className="fb-leaf">
            <div className="fb-face fb-face-front">
              {lo.end != null ? <Page {...pageProps} page={pages[lo.end]} index={lo.end} side="end" /> : <div className="fb-page is-end" />}
              <span className="fb-shade" />
            </div>
            <div className="fb-face fb-face-back">
              {sp && hi.start != null ? <Page {...pageProps} page={pages[hi.start]} index={hi.start} side="start" /> : <div className="fb-page is-start" />}
              <span className="fb-shade" />
            </div>
          </div>
        </div>
      </>
    )
  } else if (paged) {
    content = viewSlots(view, true)
  }

  return (
    <div ref={stageRef} className={cx('fb-stage', rtl && 'fb-rtl')}>
      {dims && (
        <div className="fb-measure" aria-hidden="true" inert style={{ inlineSize: dims.pageW }}>
          <div
            ref={measureRef}
            className={cx('fb-page', `fb-size-${size}`, pageW >= JUSTIFY_FROM && 'fb-justify')}
            data-spread={spread ? 'true' : 'false'}
            style={{ inlineSize: dims.pageW, blockSize: dims.pageH }}
          >
            <p className="fb-run">{book.title}</p>
            <div className="fb-body" />
            <p className="fb-folio">1</p>
          </div>
        </div>
      )}

      {dims && (
        <div
          ref={bookRef}
          className={cx('fb-book', sp ? 'is-spread' : 'is-single', turn && 'is-turning', pageW >= JUSTIFY_FROM && 'fb-justify')}
          style={{ inlineSize: sp ? dims.pageW * 2 : dims.pageW, blockSize: dims.pageH, '--fb-perspective': `${dims.pageW * 5}px` }}
          tabIndex={0}
          role="group"
          aria-label={`${book.title}, pages`}
          aria-keyshortcuts="ArrowLeft ArrowRight Home End"
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={(e) => { if (!dragRef.current && e.pointerType === 'mouse' && bookRef.current) bookRef.current.dataset.zone = '' }}
        >
          {content}
          {fade && (
            <div key={fade.key} className="fb-fade" aria-hidden="true">
              {viewSlots(fade.view, false)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
