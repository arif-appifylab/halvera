import { cx, Badge, Icon } from '@/design-system'
import { accessChip, fileMeta, libraryAccess, FILE_TYPES } from '@/lib/library.js'
import { LibIcon, TypeArt, TypeTag } from './TypeArt.jsx'

const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`

// Free · Members · Included · Owned · $12 · Locked, as a Badge with its icon.
export function AccessChip({ itemRef, viewer }) {
  const chip = accessChip(itemRef, viewer)
  if (!chip) return null
  return <Badge tone={chip.tone} icon={chip.icon}>{chip.label}</Badge>
}

// A folder: icon, name, item count and access. Always browsable: locked files show their own lock.
export function FolderCard({ folder, viewer, layout = 'grid' }) {
  return (
    <a className={cx('lib-folder', layout === 'list' && 'is-row')} href={folder.href}>
      <span className="lib-folder-icon" aria-hidden="true"><LibIcon name="folder" size={layout === 'list' ? 20 : 28} /></span>
      <span className="lib-folder-body">
        <span className="lib-folder-name">{folder.title}</span>
        <span className="lib-folder-meta">{plural(folder.files, 'item')}</span>
      </span>
      <span className="lib-folder-chip"><AccessChip itemRef={folder.ref} viewer={viewer} /></span>
    </a>
  )
}

// A file: thumbnail or type art with its type tag, name and "7.1 MB · 9 Oct". Open files link to the
// viewer; locked files open the unlock dialog (onLocked) and show the lock and price on the thumbnail.
export function FileCard({ file, viewer, layout = 'grid', onLocked }) {
  const f = file.file
  const open = libraryAccess(file.ref, viewer).open
  const chip = accessChip(file.ref, viewer)
  const media = (
    <span className="lib-file-media">
      {f.thumb && layout === 'grid' ? <img src={f.thumb} alt="" loading="lazy" /> : <TypeArt type={f.type} size={layout === 'list' ? 'sm' : 'md'} />}
      {layout === 'grid' && <TypeTag type={f.type} />}
      {!open && layout === 'grid' && (
        <span className="lib-file-lock" aria-hidden="true"><Icon name="lock" size={14} />{chip?.label !== 'Locked' && chip?.label}</span>
      )}
    </span>
  )
  const body = (
    <span className="lib-file-body">
      <span className="lib-file-name">{f.title}</span>
      <span className="lib-file-meta">
        {layout === 'list' && <span className="lib-file-type">{FILE_TYPES[f.type].label}</span>}
        {fileMeta(f)}
      </span>
      {!open && <span className="sg-sr">Locked. {chip?.label && chip.label !== 'Locked' ? `${chip.label}.` : ''}</span>}
    </span>
  )
  const cls = cx('lib-file', layout === 'list' && 'is-row', !open && 'is-locked')
  if (open) {
    return (
      <a className={cls} href={file.href}>
        {media}{body}
        {layout === 'list' && <span className="lib-file-chip"><AccessChip itemRef={file.ref} viewer={viewer} /></span>}
      </a>
    )
  }
  return (
    <button type="button" className={cls} aria-haspopup="dialog" onClick={() => onLocked?.(file.ref)}>
      {media}{body}
      {layout === 'list' && <span className="lib-file-chip"><AccessChip itemRef={file.ref} viewer={viewer} /></span>}
    </button>
  )
}
