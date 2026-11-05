// Splits a book into pages that fit the page box. It fills a hidden page element (a real `.fb-page`
// at the same size and font size as the visible ones), so the result matches what the reader sees.
// Paragraphs flow across pages word by word. Every chapter starts on a new page; on spreads it also
// starts on a right-hand page (an even index, since page 0 is the cover on the right), with a blank
// page before it when needed.
//
// Pages: { kind: 'cover' } | { kind: 'blank' } |
//        { kind: 'text', chapter, opener, items: [{ text, para, from, indent, split }], sources }
// `sources` lists the authored pages (book.chapters[].pages, numbered from 0 across the book) whose
// text is on the page: analytics count those, so progress doesn't depend on font or screen size.

const KEY = (chapter, para, from) => chapter * 1e6 + para * 1e3 + from

// Where a page's text begins, as a sortable number (null for the cover and blank pages).
export function pageKey(page) {
  if (!page || page.kind !== 'text') return null
  if (page.opener || !page.items.length) return KEY(page.chapter, 0, 0)
  const it = page.items[0]
  return KEY(page.chapter, it.para, it.from)
}

// The page that holds the text at `key` (the last page starting at or before it).
export function pageAt(pages, key) {
  let found = 0
  pages.forEach((p, i) => {
    const k = pageKey(p)
    if (k != null && k <= key) found = i
  })
  return found
}

// Builds the same markup the Page component renders, for measuring.
function openerEl(n, title) {
  const header = document.createElement('header')
  header.className = 'fb-opener'
  const num = document.createElement('p')
  num.className = 'fb-opener-num'
  num.textContent = `Chapter ${n}`
  const h = document.createElement('h2')
  h.className = 'fb-opener-title'
  h.textContent = title
  header.append(num, h)
  return header
}

export const paraClass = (indent, split) => ['fb-p', indent && 'fb-indent', split && 'fb-split'].filter(Boolean).join(' ')

export function paginate(book, measurePage) {
  const spread = measurePage.dataset.spread === 'true'
  const body = measurePage.querySelector('.fb-body')
  const fits = () => body.scrollHeight <= body.clientHeight
  const pages = [{ kind: 'cover' }]
  const starts = []
  let cur = null

  // Authored page of each paragraph: srcOf[chapter][para].
  let n = 0
  const srcOf = book.chapters.map((ch) => ch.pages.flatMap((paras) => {
    const k = n++
    return paras.map(() => k)
  }))

  const close = () => {
    if (cur) {
      const src = cur.items.map((it) => srcOf[cur.chapter][it.para])
      cur.sources = [...new Set(src.length ? src : [srcOf[cur.chapter][0]])].filter((k) => k != null)
      pages.push(cur)
    }
    cur = null
    body.replaceChildren()
  }

  book.chapters.forEach((ch, ci) => {
    close()
    if (spread && pages.length % 2 === 1) pages.push({ kind: 'blank' })
    starts.push(pages.length)
    cur = { kind: 'text', chapter: ci, opener: true, items: [] }
    body.append(openerEl(ci + 1, ch.title))

    ch.pages.flat().forEach((text, pi) => {
      const words = text.split(/\s+/).filter(Boolean)
      let from = 0
      while (from < words.length) {
        if (!cur) cur = { kind: 'text', chapter: ci, opener: false, items: [] }
        const indent = pi > 0 && from === 0
        const el = document.createElement('p')
        el.className = paraClass(indent, false)
        el.textContent = words.slice(from).join(' ')
        body.append(el)
        if (fits()) {
          cur.items.push({ text: el.textContent, para: pi, from, indent, split: false })
          break
        }
        // The most words of this paragraph that still fit on the page.
        el.className = paraClass(indent, true)
        let lo = 0
        let hi = words.length - from - 1
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1
          el.textContent = words.slice(from, from + mid).join(' ')
          if (fits()) lo = mid
          else hi = mid - 1
        }
        // A page with nothing on it always takes at least one word, so the loop can't stall.
        if (lo === 0 && !cur.items.length && !cur.opener) lo = 1
        if (lo === 0) {
          el.remove()
          close()
          continue
        }
        cur.items.push({ text: words.slice(from, from + lo).join(' '), para: pi, from, indent, split: true })
        from += lo
        close()
      }
    })
  })
  close()
  return { pages, starts, spread }
}
