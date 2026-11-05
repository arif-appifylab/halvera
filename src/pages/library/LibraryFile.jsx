// One library file: /asset-library/:slug/file/:fileId. Shows the file in the viewer for its type
// (document, slides, video, audio, image, link or web page), a download button when the file
// allows it, prev / next inside its folder, and the unlock options when it's locked.
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { cx, Breadcrumbs, Button, Card, Icon, IconButton } from '@/design-system'
import { useViewer } from '@/app/viewer.jsx'
import { track } from '@/lib/analytics/index.js'
import DocumentViewer from '@/components/media/DocumentViewer.jsx'
import VideoPlayer from '@/components/media/VideoPlayer.jsx'
import AudioStage from '@/components/media/AudioStage.jsx'
import { AccessChip } from '@/components/library/LibraryCards.jsx'
import { LibIcon, TypeArt } from '@/components/library/TypeArt.jsx'
import UnlockOptions from '@/components/library/UnlockOptions.jsx'
import {
  getLibrary, getLibraryItem, pathOf, libraryHref, libraryAccess, siblingsOf, fileMeta, hostOf, isExternal, FILE_TYPES,
} from '@/lib/library.js'
import NotFound from '@/pages/NotFound.jsx'
import './library.css'

const ZOOMS = [1, 1.5, 2]

// Where a file can be downloaded from, or null (links, stream-only files, audio without a file yet).
const downloadSrc = (f) => (isExternal(f) || f.download === false ? null : f.type === 'video' ? f.source?.src : f.src || null)

function Lightbox({ file, onClose }) {
  const [zoom, setZoom] = useState(0)
  const closeRef = useRef(null)
  useEffect(() => {
    const back = document.activeElement
    closeRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))
      if (e.key === '-') setZoom((z) => Math.max(0, z - 1))
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); back?.focus?.() }
  }, [onClose])
  return (
    <div className="lib-lightbox" role="dialog" aria-modal="true" aria-label={file.title} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lib-lightbox-bar">
        <span className="lib-lightbox-zoom" aria-live="polite">{Math.round(ZOOMS[zoom] * 100)}%</span>
        <IconButton icon="minus" label="Zoom out" variant="outline" onClick={() => setZoom((z) => Math.max(0, z - 1))} disabled={zoom === 0} />
        <IconButton icon="plus" label="Zoom in" variant="outline" onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))} disabled={zoom === ZOOMS.length - 1} />
        <IconButton ref={closeRef} icon="x" label="Close" variant="outline" onClick={onClose} />
      </div>
      <div className={cx('lib-lightbox-stage', zoom > 0 && 'is-zoomed')}>
        <img src={file.src} alt={file.alt || file.title} style={zoom > 0 ? { inlineSize: `${ZOOMS[zoom] * 100}%` } : undefined} />
      </div>
    </div>
  )
}

function ImageView({ file }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="lib-image" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <img src={file.src} alt={file.alt || file.title} />
        <span className="lib-image-hint"><Icon name="search" size={16} />View larger</span>
      </button>
      {open && <Lightbox file={file} onClose={() => setOpen(false)} />}
    </>
  )
}

function LinkView({ file, item }) {
  const web = file.type === 'web'
  return (
    <Card padding="lg" className="lib-link">
      <span className="lib-link-icon" aria-hidden="true"><LibIcon name={file.type} size={28} /></span>
      <div className="pg-stack-sm">
        <p className="t-body-sm t-muted">{web ? 'Web page' : 'Link'} · {hostOf(file.href)}</p>
        <h2 className="t-heading-3">{file.title}</h2>
        {file.description && <p>{file.description}</p>}
        <div className="pg-row">
          <Button
            href={file.href}
            target="_blank"
            rel="noopener noreferrer"
            iconEnd="arrow-right"
            onClick={() => track('file_open_link', { ref: item.ref, href: file.href })}
          >
            {web ? 'Open page' : 'Open link'}<span className="sg-sr"> (opens in a new tab)</span>
          </Button>
        </div>
      </div>
    </Card>
  )
}

function Viewer({ file, item }) {
  switch (file.type) {
    case 'pdf':
    case 'doc':
      return <DocumentViewer file={file.src} mode="document" title={file.title} rememberKey={`library/${file.id}`} />
    case 'slides':
      return <DocumentViewer file={file.src} mode="slides" title={file.title} rememberKey={`library/${file.id}`} />
    case 'video':
      return <VideoPlayer source={file.source} title={file.title} resumeKey={`library/${file.id}`} />
    case 'audio':
      return <AudioStage title={file.title} subtitle={getLibraryItem(item.parent)?.title} duration={file.duration} src={file.src} cover={file.thumb} resumeKey={`library/${file.id}`} />
    case 'image':
      return <ImageView file={file} />
    default:
      return <LinkView file={file} item={item} />
  }
}

// What a locked file looks like: its art or thumbnail, what it is, and the ways to open it.
function LockedFile({ file, item }) {
  return (
    <div className="lib-locked">
      <div className="lib-locked-preview">
        {file.thumb ? <img src={file.thumb} alt="" /> : <TypeArt type={file.type} size="lg" />}
        <span className="lib-locked-badge"><Icon name="lock" size={16} />Locked</span>
      </div>
      <Card padding="lg" className="lib-locked-card">
        <h2 className="t-heading-3">Unlock this file</h2>
        {file.description && <p className="t-muted">{file.description}</p>}
        <UnlockOptions itemRef={item.ref} />
      </Card>
    </div>
  )
}

function Neighbour({ item, dir, viewer }) {
  if (!item) return <span />
  const open = libraryAccess(item.ref, viewer).open
  return (
    <a className={cx('lib-nav-link', dir === 'next' && 'is-next')} href={item.href}>
      <span className="lib-nav-dir">
        {dir === 'prev' && <Icon name="arrow-left" size={16} />}
        {dir === 'prev' ? 'Previous' : 'Next'}
        {dir === 'next' && <Icon name="arrow-right" size={16} />}
      </span>
      <span className="lib-nav-title">
        {!open && <Icon name="lock" size={14} label="Locked" />}
        {item.title}
      </span>
    </a>
  )
}

export default function LibraryFile() {
  const { slug, fileId } = useParams()
  const { viewer } = useViewer()
  const ref = `file:${fileId}`
  const item = getLibrary(slug) ? getLibraryItem(ref) : null
  const access = libraryAccess(ref, viewer)

  useEffect(() => {
    if (item) track('file_view', { ref: item.ref, fileType: item.file.type, open: access.open, via: access.via })
  }, [item, access.open, access.via])

  if (!item) return <NotFound />
  const file = item.file
  const path = pathOf(ref)
  const crumbs = [{ label: 'Library', href: libraryHref() }, ...path.map((p) => ({ label: p.title, href: p.href }))]
  const { prev, next, index, total } = siblingsOf(ref)
  const download = access.open ? downloadSrc(file) : null
  const parent = getLibraryItem(item.parent)

  return (
    <div className="lib lib-filepage">
      <header className="pg-head">
        <div className="sg-container">
          <div className="pg-head-inner lib-file-head">
            <Breadcrumbs items={crumbs} />
            <p className="sg-eyebrow">{FILE_TYPES[file.type].label}</p>
            <h1 className="t-heading-1">{file.title}</h1>
            <div className="pg-row">
              <AccessChip itemRef={ref} viewer={viewer} />
              <span className="t-body-sm t-muted">{fileMeta(file)}{file.duration && file.type === 'audio' ? ` · ${file.duration}` : ''}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="sg-container lib-file-body-wrap pg-stack-lg">
        {access.open ? (
          <section className="pg-stack" aria-label={file.title}>
            <Viewer file={file} item={item} />
            {(file.description && !isExternal(file)) || download ? (
              <div className="lib-file-foot">
                {file.description && !isExternal(file) && <p className="t-muted">{file.description}</p>}
                {download && (
                  <Button
                    variant="secondary"
                    iconStart="download"
                    href={download}
                    download
                    onClick={() => track('file_download', { ref, fileType: file.type, file: download })}
                  >
                    Download
                  </Button>
                )}
              </div>
            ) : null}
            {!download && file.download === false && <p className="t-body-sm t-muted">This file streams only, so there’s no download.</p>}
          </section>
        ) : (
          <LockedFile file={file} item={item} />
        )}

        {total > 1 && (
          <nav className="lib-nav" aria-label={`More in ${parent?.title}`}>
            <Neighbour item={prev} dir="prev" viewer={viewer} />
            <span className="lib-nav-pos t-body-sm t-muted">{index + 1} of {total} in {parent?.title}</span>
            <Neighbour item={next} dir="next" viewer={viewer} />
          </nav>
        )}
      </div>
    </div>
  )
}
