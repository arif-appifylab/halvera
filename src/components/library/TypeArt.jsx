import { cx, Icon } from '@/design-system'
import { FILE_TYPES } from '@/lib/library.js'
import './library-components.css'

// Line icons the design system's set doesn't have (folder, image, link, slides, document), drawn on the
// same 24px grid with 1.75px round strokes in currentColor. Decorative: always aria-hidden.
const PATHS = {
  folder: <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.4l2 2.2h8.6A1.5 1.5 0 0 1 21 9.7v8.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />,
  image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m20.5 16-4.8-4.6L7 19.5" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.2 1.2" /><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.2-1.2" /></>,
  slides: <><rect x="3" y="4" width="18" height="12.5" rx="1.5" /><path d="M12 16.5V20M8.5 20h7M7.5 12.5l3-3 2.5 2 3.5-3.5" /></>,
  doc: <><path d="M6.5 3.5h7l4 4v13h-11z" /><path d="M13.5 3.5v4h4M9 12h6M9 15h6M9 18h4" /></>,
  pdf: <><path d="M6.5 3.5h7l4 4v13h-11z" /><path d="M13.5 3.5v4h4" /><rect x="8.5" y="12" width="7" height="5" rx="1" /></>,
}
const DS_ICON = { video: 'video', audio: 'headphones', web: 'globe' }

export function LibIcon({ name, size = 24 }) {
  if (DS_ICON[name]) return <Icon name={DS_ICON[name]} size={size} />
  return (
    <svg className="sg-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name] || PATHS.doc}
    </svg>
  )
}

// The tinted tile shown in place of a thumbnail, with the file type's icon.
export function TypeArt({ type, size = 'md', className }) {
  return (
    <span className={cx('lib-art', `lib-art-${type}`, `lib-art-${size}`, className)} aria-hidden="true">
      <LibIcon name={type} size={size === 'sm' ? 20 : 32} />
    </span>
  )
}

// The short type tag on a file's corner: PDF, DOC, PPT, VID, IMG, AUD, LINK, WEB.
export function TypeTag({ type }) {
  const t = FILE_TYPES[type]
  return <span className="lib-tag"><span className="sg-sr">{t.label}: </span><span aria-hidden="true">{t.tag}</span></span>
}
