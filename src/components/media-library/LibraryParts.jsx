// Small pieces shared by the media library's sales block and library page.
import { useState } from 'react'
import { Badge, Button, Icon } from '@/design-system'
import {
  FORMAT_LABEL, formatOf, releaseShort, totalTime, itemWord, isVideo,
} from './schedule.js'

// Main / Bonus / Free, the admin's classification plus "Available for free".
export function EpisodeBadges({ ep }) {
  return (
    <span className="mlx-badges">
      {ep.free && <Badge tone="accent">Free</Badge>}
      {(ep.tag === 'Bonus' || !ep.free) && <Badge tone={ep.tag === 'Bonus' ? 'info' : 'neutral'}>{ep.tag}</Badge>}
    </span>
  )
}

// Skip back / forward 15 seconds. Drawn on the design system's 24px, 1.75px stroke grid.
export function SkipIcon({ forward = false, size = 22 }) {
  return (
    <svg className="mlx-skip" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <g transform={forward ? 'matrix(-1 0 0 1 24 0)' : undefined}>
        <path d="M4 12a8 8 0 1 0 2.4-5.7" />
        <path d="M4 3.5v3.2h3.2" />
      </g>
      <text x="12" y="15.4" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="currentColor" stroke="none" fontFamily="inherit">15</text>
    </svg>
  )
}

// The facts line under a library's heading: format and count, running time, release, downloads, expiry.
export function LibraryFacts({ product, library }) {
  const count = library.episodes.length
  const items = [
    { icon: isVideo(product) ? 'video' : 'headphones', label: `${FORMAT_LABEL[formatOf(product)]} · ${count} ${itemWord(product, count !== 1)}` },
    { icon: 'clock', label: `${totalTime(library.total)} in total` },
    product.mediaLibrary?.release?.mode !== 'immediate' && { icon: 'calendar', label: releaseShort(product) },
    product.mediaLibrary?.downloads
      ? { icon: 'download', label: 'Download for offline listening' }
      : isVideo(product) && { icon: 'eye', label: 'Streaming only' },
    library.expiry && !library.expiry.passed && { icon: 'alert', label: library.expiry.label },
  ].filter(Boolean)
  return (
    <ul className="mlx-facts" aria-label="About this library">
      {items.map((i) => <li key={i.label}><Icon name={i.icon} size={16} />{i.label}</li>)}
    </ul>
  )
}

// "Download for offline": a real file downloads; without one (the theme preview) it marks the episode as saved.
export function DownloadButton({ ep }) {
  const [saved, setSaved] = useState(false)
  if (ep.src) {
    return <Button variant="ghost" size="sm" iconStart="download" href={ep.src} download>Download</Button>
  }
  return (
    <Button
      variant="ghost" size="sm" iconStart={saved ? 'check' : 'download'}
      aria-label={saved ? `${ep.title} is saved for offline` : `Download ${ep.title} for offline`}
      onClick={() => setSaved(true)} disabled={saved}
    >
      {saved ? 'Saved for offline' : 'Download'}
    </Button>
  )
}
