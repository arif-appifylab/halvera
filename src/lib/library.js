// Asset library: categories → folders → files, each with its own access and price.
// Interface (stable; checkout and the cart code against it):
//
//   getLibraryItem(ref)   ref = 'category:<id>' | 'folder:<id>' | 'file:<id>' (a 'library:' prefix is ignored)
//                         → { ref, kind: 'category'|'folder'|'file', id, title, librarySlug,
//                             access: 'free'|'members'|'paid', plans?: [planId], prices: [price] } | null
//                         Prices use the product price shape: { id, kind, label, amount, price, count?, interval? }.
//                         Files: one-time only. Folders: one-time. Categories: one-time, subscription or installments.
//                         Also carries: type 'library', description, parent (ref or null), image, files
//                         (file count), folders (folder count, categories), detail ("Folder · 5 files"), href.
//
// Cart / checkout item ids for library items are 'library:<ref>', e.g. 'library:folder:soups-and-stews'.
//
// Access (inherits downwards; see src/data/library.js):
//   libraryAccess(ref, viewer) → { open, via: 'free'|'owned'|'membership'|null, state: 'open'|'locked'|'site-access-ended' }
//   canOpen(ref, viewer)       → boolean
//   unlockOptions(ref, viewer) → the ways to open a locked item, smallest first: this file → its folder →
//                                its category → a membership (when anything on the way is members-only).
//   librarySummary(ref?)       → counts and a label for the whole library or one item
import { library, categories, folders, files } from '@/data/library.js'
import { owned, ownedLibrary, memberships } from '@/data/account.js'
import { products } from '@/data/products.js'
import { getPlan } from '@/data/plans.js'
import { siteAccess, needsSiteAccess, viewerHasSiteAccess } from '@/lib/access.js'

export const FILE_TYPES = {
  pdf: { label: 'PDF', tag: 'PDF', filter: 'PDF' },
  doc: { label: 'Document', tag: 'DOC', filter: 'Docs' },
  slides: { label: 'Slides', tag: 'PPT', filter: 'Slides' },
  video: { label: 'Video', tag: 'VID', filter: 'Video' },
  image: { label: 'Image', tag: 'IMG', filter: 'Images' },
  audio: { label: 'Audio', tag: 'AUD', filter: 'Audio' },
  link: { label: 'Link', tag: 'LINK', filter: 'Links' },
  web: { label: 'Web page', tag: 'WEB', filter: 'Web pages' },
}
export const TYPE_FILTERS = [{ value: 'all', label: 'All' }, ...Object.entries(FILE_TYPES).map(([value, t]) => ({ value, label: t.filter }))]
export const isExternal = (file) => file.type === 'link' || file.type === 'web'

const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`
const byId = (list, id) => list.find((x) => x.id === id)
const stripPrefix = (ref) => (ref?.startsWith('library:') ? ref.slice(8) : ref)

export function parseRef(ref) {
  const r = stripPrefix(ref) || ''
  const i = r.indexOf(':')
  return i < 0 ? { kind: null, id: null } : { kind: r.slice(0, i), id: r.slice(i + 1) }
}

export const getLibrary = (slug) => (slug === library.slug ? library : null)
export const libraryProductSlug = library.slug

const fileCategory = (f) => f.category || byId(folders, f.folder)?.category
const filesOfFolder = (id) => files.filter((f) => f.folder === id)
const filesOfCategory = (id) => files.filter((f) => fileCategory(f) === id)

// Dates are ISO in the data; shown as "9 Oct".
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function formatDate(iso) {
  const [, m, d] = (iso || '').split('-').map(Number)
  return m && d ? `${d} ${MONTHS[m - 1]}` : ''
}

const UNITS = { KB: 1e3, MB: 1e6, GB: 1e9 }
export function sizeBytes(size) {
  const m = /^([\d.]+)\s*(KB|MB|GB)$/i.exec(size || '')
  return m ? Number(m[1]) * UNITS[m[2].toUpperCase()] : 0
}
export const hostOf = (href) => { try { return new URL(href).hostname.replace(/^www\./, '') } catch { return '' } }

// "7.1 MB · 9 Oct", or "nhs.uk · 9 Oct" for links and web pages.
export const fileMeta = (file) => [isExternal(file) ? hostOf(file.href) : file.size, formatDate(file.date)].filter(Boolean).join(' · ')

// Build every item once: the data is static.
const items = new Map()
const href = (kind, id) => `/asset-library/${library.slug}/${kind}/${id}`

for (const c of categories) {
  const fileCount = filesOfCategory(c.id).length
  const folderCount = folders.filter((f) => f.category === c.id).length
  items.set(`category:${c.id}`, {
    ref: `category:${c.id}`, kind: 'category', id: c.id, title: c.title, description: c.description, librarySlug: library.slug,
    access: c.access, plans: c.plans, prices: c.prices || [], type: 'library', parent: null, image: c.image,
    files: fileCount, folders: folderCount, href: href('category', c.id),
    detail: `Category · ${[folderCount && plural(folderCount, 'folder'), plural(fileCount, 'file')].filter(Boolean).join(', ')}`,
  })
}
for (const f of folders) {
  const cat = items.get(`category:${f.category}`)
  const fileCount = filesOfFolder(f.id).length
  items.set(`folder:${f.id}`, {
    ref: `folder:${f.id}`, kind: 'folder', id: f.id, title: f.title, description: f.description, librarySlug: library.slug,
    access: f.access || cat.access, plans: f.plans || cat.plans, prices: f.prices || [], type: 'library', parent: cat.ref,
    image: cat.image, files: fileCount, href: href('folder', f.id), detail: `Folder · ${plural(fileCount, 'file')}`,
  })
}
for (const f of files) {
  const parent = items.get(f.folder ? `folder:${f.folder}` : `category:${f.category}`)
  items.set(`file:${f.id}`, {
    ref: `file:${f.id}`, kind: 'file', id: f.id, title: f.title, description: f.description, librarySlug: library.slug,
    access: f.access || parent.access, plans: f.plans || parent.plans, prices: f.price ? [f.price] : [], type: 'library',
    parent: parent.ref, image: f.thumb, files: 1, href: href('file', f.id), detail: `${FILE_TYPES[f.type].label} · ${fileMeta(f)}`,
    file: f,
  })
}

export const getLibraryItem = (ref) => items.get(stripPrefix(ref)) || null

// Parent chain, nearest first: a file's folder, then its category.
export function ancestorsOf(ref) {
  const out = []
  let it = getLibraryItem(ref)
  while (it?.parent) { it = getLibraryItem(it.parent); out.push(it) }
  return out
}

// Library › Category › Folder › File, for breadcrumbs.
export const pathOf = (ref) => [...ancestorsOf(ref)].reverse().concat(getLibraryItem(ref) || [])

export const libraryHref = (ref) => (ref ? getLibraryItem(ref)?.href : `/asset-library/${library.slug}`)
export const checkoutHref = (ref, priceId) => `/checkout/library:${stripPrefix(ref)}${priceId ? `?price=${priceId}` : ''}`
export const cartItemFor = (ref, priceId) => ({ productId: `library:${stripPrefix(ref)}`, priceId })
// Subscriptions and installment plans are bought on their own (R-CART: solo items skip the cart).
export const isSoloPrice = (price) => price?.kind === 'subscription' || price?.kind === 'installments'

export const listCategories = () => categories.map((c) => items.get(`category:${c.id}`))
export const foldersIn = (categoryId) => folders.filter((f) => !categoryId || f.category === categoryId).map((f) => items.get(`folder:${f.id}`))

// Files in a scope. Category: its loose files only, or every file inside it with { deep: true }.
export function filesIn(ref, { deep = false } = {}) {
  const { kind, id } = parseRef(ref)
  let list = files
  if (kind === 'folder') list = filesOfFolder(id)
  else if (kind === 'category') list = deep ? filesOfCategory(id) : files.filter((f) => f.category === id)
  return list.map((f) => items.get(`file:${f.id}`))
}

// Neighbours inside the file's folder (or category, for loose files), for prev / next links.
export function siblingsOf(ref) {
  const it = getLibraryItem(ref)
  if (!it || it.kind !== 'file') return { prev: null, next: null, index: 0, total: 0 }
  const list = filesIn(it.parent)
  const i = list.findIndex((x) => x.ref === it.ref)
  return { prev: list[i - 1] || null, next: list[i + 1] || null, index: i, total: list.length }
}

// Refs the viewer bought, directly or through a bundle.
export function ownedLibraryRefs(viewer) {
  if (!viewer || viewer.role === 'visitor') return []
  const viaBundles = products.filter((p) => p.library && owned.includes(p.slug)).flatMap((p) => p.library)
  return [...new Set([...ownedLibrary, ...viaBundles])]
}

export function libraryAccess(ref, viewer = {}) {
  const item = getLibraryItem(ref)
  if (!item) return { open: false, via: null, state: 'locked' }
  if (item.access === 'free') return { open: true, via: 'free', state: 'open' }
  const chain = [item, ...ancestorsOf(ref)]
  const mine = ownedLibraryRefs(viewer)
  const ownedVia = chain.find((it) => mine.includes(it.ref))
  if (ownedVia) {
    const ended = viewer.siteAccess === 'ended' && siteAccess.whenEnds === 'lock' && needsSiteAccess(ownedVia)
    return ended ? { open: false, via: 'owned', state: 'site-access-ended', ownedVia: ownedVia.ref } : { open: true, via: 'owned', state: 'open', ownedVia: ownedVia.ref }
  }
  // Library items a membership plan includes on its own (Contents → items), e.g. Gut Health Club's folders.
  const planRefs = viewer.plan ? memberships.flatMap((m) => getPlan(m.planId)?.contents || []) : []
  if (chain.some((it) => planRefs.includes(it.ref))) return { open: true, via: 'membership', state: 'open' }
  const members = chain.find((it) => it.access === 'members')
  if (members && viewer.plan && (!members.plans || members.plans.includes(viewer.plan))) return { open: true, via: 'membership', state: 'open' }
  return { open: false, via: null, state: 'locked' }
}

export const canOpen = (ref, viewer) => libraryAccess(ref, viewer).open

// Does buying this item add the Site access line at checkout for this viewer?
export const needsSiteAccessFor = (ref, viewer) => {
  const it = getLibraryItem(ref)
  return Boolean(it && needsSiteAccess(it) && !viewerHasSiteAccess(viewer))
}

const list = (names) => names.join(', ').replace(/, ([^,]*)$/, ' or $1')

// Ways to open a locked item, smallest first. Each option:
//   { key, kind: 'file'|'folder'|'category'|'membership', ref, title, heading, scope,
//     prices: [{ ...price, solo, href, cartItem }], plans? }
export function unlockOptions(ref, viewer = {}) {
  const item = getLibraryItem(ref)
  if (!item || canOpen(ref, viewer)) return []
  const chain = [item, ...ancestorsOf(ref)]
  const heading = { file: 'Buy this file', folder: 'Buy the folder', category: 'Buy the category' }
  const scope = (it) => (it.kind === 'file' ? 'Just this file'
    : it.kind === 'folder' ? `${it.title} · ${plural(it.files, 'file')}`
      : `${it.title} · ${[it.folders && plural(it.folders, 'folder'), plural(it.files, 'file')].filter(Boolean).join(', ')}`)
  const options = chain.filter((it) => it.prices.length).map((it) => ({
    key: it.ref, kind: it.kind, ref: it.ref, title: it.title, heading: heading[it.kind], scope: scope(it),
    prices: it.prices.map((p) => ({ ...p, solo: isSoloPrice(p), href: checkoutHref(it.ref, p.id), cartItem: cartItemFor(it.ref, p.id) })),
  }))
  // Library items a membership plan includes on its own (Contents → items), e.g. Gut Health Club's folders.
  const planRefs = viewer.plan ? memberships.flatMap((m) => getPlan(m.planId)?.contents || []) : []
  if (chain.some((it) => planRefs.includes(it.ref))) return { open: true, via: 'membership', state: 'open' }
  const members = chain.find((it) => it.access === 'members')
  if (members) {
    const names = (members.plans || []).map((id) => getPlan(id)?.name).filter(Boolean)
    options.push({
      key: 'membership', kind: 'membership', ref: members.ref, title: members.title, heading: 'Included in a membership',
      scope: `${members.title} comes with ${names.length ? list(names) : 'a membership'}`, plans: members.plans || [], prices: [],
    })
  }
  return options
}

// Counts and a label. No ref: the whole library ("4 categories · 8 folders · 33 files").
export function librarySummary(ref) {
  if (!ref) {
    return {
      categories: categories.length, folders: folders.length, files: files.length,
      label: [plural(categories.length, 'category', 'categories'), plural(folders.length, 'folder'), plural(files.length, 'file')].join(' · '),
    }
  }
  const it = getLibraryItem(ref)
  return it ? { folders: it.folders || 0, files: it.files, label: it.detail } : null
}

// The small access chip on cards: Owned · Included · Free · Members · $12 · Locked.
export function accessChip(ref, viewer) {
  const it = getLibraryItem(ref)
  if (!it) return null
  const a = libraryAccess(ref, viewer)
  if (a.state === 'site-access-ended') return { label: 'Locked', tone: 'warning', icon: 'lock' }
  if (a.via === 'owned') return { label: 'Owned', tone: 'success', icon: 'check' }
  if (a.via === 'membership') return { label: 'Included', tone: 'primary', icon: 'leaf' }
  if (a.via === 'free') return { label: 'Free', tone: 'success' }
  if (it.prices.length) {
    const p = it.prices[0]
    return { label: p.price.installments ? `${p.price.installments} × ${p.price.amount}` : p.price.interval ? `${p.price.amount} / ${p.price.interval}` : p.price.amount, tone: 'accent', icon: 'lock' }
  }
  if (it.access === 'members') return { label: 'Members', tone: 'primary', icon: 'leaf' }
  return { label: 'Locked', tone: 'neutral', icon: 'lock' }
}

// Library items the viewer can open through a purchase (dashboard "My programmes").
export const ownedLibraryItems = (viewer) => ownedLibraryRefs(viewer).map(getLibraryItem).filter(Boolean)

// ProductCard props for library items a bundle includes (product.library), so a bundle shows
// "Recipes and meal plans" rather than the whole library.
export function bundleLibraryCards(product, viewer) {
  return (product.library || []).map(getLibraryItem).filter(Boolean).map((it) => {
    const open = canOpen(it.ref, viewer)
    return {
      key: it.ref,
      type: 'asset-library',
      title: it.title,
      href: libraryHref(it.ref),
      image: it.image,
      summary: it.description,
      meta: it.detail ? [{ icon: 'file', label: it.detail }] : [],
      price: open ? undefined : it.prices[0]?.price,
      availability: open ? 'owned' : 'available',
    }
  })
}
