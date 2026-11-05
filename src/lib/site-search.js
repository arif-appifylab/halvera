// Site-wide search: one static index over everything a visitor can find on the storefront, and a
// small matcher that ranks it. The header palette (src/components/GlobalSearch.jsx) and /search use it.
//
// What is indexed: products of every type (events get their own group), course lesson titles (they
// link to the product page's curriculum, never into a gated lesson), library categories, folders and
// files, blog posts, newsletter posts (when src/data/newsletter.js exists), conditions, practitioners
// and the main pages. Hidden products (direct link only) are left out.
import { conditions } from '@/data/conditions.js'
import { practitioners } from '@/data/people.js'
import { posts, postHref, categoryLabel } from '@/data/posts.js'
import { plans } from '@/data/plans.js'
import { siteAccess } from '@/lib/access.js'
import { school } from '@/data/school.js'
import { productHref, TYPE_LABEL, ROUTE_FOR, listCatalog } from '@/lib/products.js'
import { listCategories, foldersIn, filesIn } from '@/lib/library.js'

// Newsletter posts come from src/data/newsletter.js, which may not exist in every build. An eager glob
// returns {} when the file is missing, so the build never breaks over it.
const newsletterModules = import.meta.glob('../data/newsletter.js', { eager: true })

// Group order on the results page and in the palette. No counts beside these (sentence case labels).
export const KINDS = [
  { value: 'page', label: 'Pages', icon: 'home' },
  { value: 'product', label: 'Programmes and products', icon: 'leaf' },
  { value: 'event', label: 'Events', icon: 'calendar' },
  { value: 'lesson', label: 'Lessons', icon: 'play' },
  { value: 'condition', label: 'Health topics', icon: 'heart' },
  { value: 'library', label: 'Library', icon: 'file' },
  { value: 'post', label: 'Blog', icon: 'book' },
  { value: 'newsletter', label: 'Newsletter', icon: 'mail' },
  { value: 'practitioner', label: 'Practitioners', icon: 'user' },
]
export const kindInfo = (value) => KINDS.find((k) => k.value === value) || KINDS[0]

const conditionTitle = (slug) => conditions.find((c) => c.slug === slug)?.title || ''
// Every listed product and appointment (hidden products are reached by direct link only).
const visible = listCatalog().filter((p) => p.visibility !== 'hidden')

const PAGES = [
  { title: 'About us', href: '/about-us', description: `Who we are, how we work and the practitioners at ${school.name}.`, keywords: 'team story values' },
  { title: 'Contact us', href: '/contact-us', description: 'Send us a message, call or find us in Bristol.', keywords: 'email phone address help support' },
  { title: 'Memberships', href: '/memberships', description: 'Plans that include guided audio, the community and time with a practitioner.', keywords: `membership plans subscription ${plans.map((p) => p.name).join(' ')}` },
  ...(siteAccess.enabled ? [{ title: 'Site access', href: '/site-access', description: 'What site access is, what it costs and how to renew it.', keywords: 'access renew yearly lifetime' }] : []),
  { title: 'Book a consultation', href: school.consultation.href, description: 'A first conversation with a practitioner about where you are right now.', keywords: 'appointment booking call' },
  { title: 'Programmes', href: '/courses', description: 'Self-paced courses and small live groups.', keywords: 'courses cohorts catalogue' },
  { title: 'All products', href: '/all-products', description: 'Programmes, workshops, coaching, guided audio and downloads.', keywords: 'shop catalogue' },
  { title: 'Health topics', href: '/conditions', description: 'Gut health, men’s health, sleep, energy, stress and mindful eating.', keywords: 'conditions topics' },
  { title: 'Blog', href: '/blog', description: 'Articles and recipes from our practitioners.', keywords: 'articles posts recipes' },
  { title: 'Verify a certificate', href: '/verify', description: 'Check a certificate of completion.', keywords: 'certificate verify' },
]

function newsletterEntries() {
  const mod = Object.values(newsletterModules)[0]
  const list = mod?.newsletterPosts
  if (!Array.isArray(list)) return []
  return list.filter((x) => x && x.title && x.slug && x.newsletter).map((x) => ({
    kind: 'newsletter',
    title: x.title,
    description: x.excerpt || '',
    meta: [x.date, x.issue && `Issue ${x.issue}`].filter(Boolean).join(' · '),
    href: `/newsletter/${x.newsletter}/${x.slug}`,
  }))
}

function build() {
  const out = []
  for (const p of PAGES) out.push({ kind: 'page', meta: '', ...p })

  for (const p of visible) {
    out.push({
      kind: p.type === 'event' ? 'event' : 'product',
      title: p.title,
      description: p.summary || '',
      meta: [TYPE_LABEL[p.type], conditionTitle(p.category)].filter(Boolean).join(' · '),
      keywords: [TYPE_LABEL[p.type], conditionTitle(p.category), ...(p.meta || []).map((m) => m.label)].join(' '),
      href: productHref(p),
      image: p.image,
    })
    if (ROUTE_FOR[p.type] === 'course') {
      for (const mod of p.curriculum || []) {
        for (const l of mod.lessons || []) {
          out.push({
            kind: 'lesson',
            title: l.title,
            description: `In ${p.title}${mod.title ? ` · ${mod.title}` : ''}`,
            meta: l.preview ? 'Free preview' : '',
            keywords: p.title,
            needsTitle: true,
            href: `${productHref(p)}#pd-curriculum`,
          })
        }
      }
    }
  }

  for (const c of conditions) {
    out.push({ kind: 'condition', title: c.title, description: c.text, meta: '', keywords: (c.symptoms || []).join(' '), href: `/conditions/${c.slug}` })
  }

  for (const cat of listCategories()) {
    out.push({ kind: 'library', title: cat.title, description: cat.description || '', meta: cat.detail, href: cat.href })
    for (const f of foldersIn(cat.id)) out.push({ kind: 'library', title: f.title, description: f.description || '', meta: `${f.detail} · ${cat.title}`, keywords: cat.title, needsTitle: true, href: f.href })
    for (const f of filesIn(cat.ref, { deep: true })) out.push({ kind: 'library', title: f.title, description: f.description || '', meta: f.detail, keywords: cat.title, needsTitle: true, href: f.href })
  }

  for (const p of posts) {
    out.push({
      kind: 'post',
      title: p.title,
      description: p.excerpt || '',
      meta: [categoryLabel(p.category), p.access === 'members' ? 'Members only' : ''].filter(Boolean).join(' · '),
      keywords: categoryLabel(p.category),
      href: postHref(p),
    })
  }

  out.push(...newsletterEntries())

  for (const p of practitioners) {
    out.push({ kind: 'practitioner', title: p.name, description: p.role, meta: '', keywords: (p.credentials || []).join(' '), href: `/about-us#team-${p.id}` })
  }

  return out.map((e, i) => ({ ...e, id: `${e.kind}-${i}`, keywords: e.keywords || '' }))
}

const INDEX = build()
const fold = (s) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
const SEARCH_TEXT = INDEX.map((e) => ({
  title: fold(e.title),
  rest: fold([e.description, e.meta, e.keywords].join(' ')),
  needsTitle: e.needsTitle,
}))

export const terms = (q) => fold(q || '').split(/\s+/).filter(Boolean)

// Every word must appear somewhere. Title matches rank first, whole-word starts next.
// Lessons and library items also need one word in their own title, so a search for a course or a
// category name doesn't list every lesson or file inside it.
function score(i, words) {
  const { title, rest, needsTitle } = SEARCH_TEXT[i]
  let total = 0
  let inTitle = false
  for (const w of words) {
    const t = title.indexOf(w)
    if (t >= 0) inTitle = true
    if (t === 0) total += 12
    else if (t > 0) total += /[\s\-–:(]/.test(title[t - 1]) ? 8 : 5
    else if (rest.includes(w)) total += 1
    else return 0
  }
  return needsTitle && !inTitle ? 0 : total
}

const KIND_ORDER = Object.fromEntries(KINDS.map((k, i) => [k.value, i]))

// Results, best first. `kind` limits to one group.
export function searchSite(q, { kind } = {}) {
  const words = terms(q)
  if (!words.length) return []
  const hits = []
  INDEX.forEach((e, i) => {
    if (kind && e.kind !== kind) return
    const s = score(i, words)
    if (s) hits.push({ ...e, score: s })
  })
  return hits.sort((a, b) => b.score - a.score || KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
}

// Results grouped in KINDS order: [{ kind, label, icon, items }].
export function groupResults(results) {
  return KINDS.map((k) => ({ ...k, kind: k.value, items: results.filter((r) => r.kind === k.value) })).filter((g) => g.items.length)
}

// Splits text into [{ text, match }] parts around the query's words, for <mark> highlighting.
export function highlight(text, q) {
  const words = terms(q).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!text || !words.length) return [{ text: text || '', match: false }]
  // Matching is done on a folded copy; folding keeps the length for Latin text, so slices line up.
  const folded = fold(text)
  if (folded.length !== text.length) return [{ text, match: false }]
  const re = new RegExp(words.sort((a, b) => b.length - a.length).join('|'), 'g')
  const parts = []
  let last = 0
  for (const m of folded.matchAll(re)) {
    if (!m[0]) continue
    if (m.index > last) parts.push({ text: text.slice(last, m.index), match: false })
    parts.push({ text: text.slice(m.index, m.index + m[0].length), match: true })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false })
  return parts
}

export const searchHref = (q = '') => (q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/search')

// A few useful places to show before anyone types.
export const SUGGESTIONS = ['Gut health', 'Sleep', 'Recipes', 'Breathwork', 'Men’s health']
