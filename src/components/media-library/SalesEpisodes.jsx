// The media library block on the product (sales) page: release and expiry info, then every
// episode grouped by its divider, numbered, with duration, Main / Bonus / Free badges and when it
// unlocks. Free episodes play right here; owners jump straight into the library.
import { useState } from 'react'
import { cx, Button, Icon, Notice } from '@/design-system'
import { openHref, isFree } from '@/lib/products.js'
import { useViewer } from '@/app/viewer.jsx'
import { getPractitioner } from '@/data/people.js'
import { buildLibrary, isVideo, itemLabel, itemWord, minutes, releaseSummary } from './schedule.js'
import { EpisodeBadges, LibraryFacts } from './LibraryParts.jsx'
import { AudioSample, VideoSample } from './LibraryPromo.jsx'
import './media-library.css'


function intro(product, library, owned) {
  const bits = []
  const summary = releaseSummary(product)
  if (summary) bits.push(summary)
  const free = library.episodes.filter((e) => e.free).length
  if (owned) bits.push(library.episodes.some((e) => e.lock) ? 'Everything that has unlocked is ready in your library.' : 'Everything is unlocked for you.')
  else if (library.expiry?.passed) return bits.join(' ')
  else if (free) bits.push(`${free === 1 ? `The free ${itemWord(product)} plays` : `The ${free} free ${itemWord(product, true)} play`} right here. The rest open when you join.`)
  return bits.join(' ')
}

function EpisodeRow({ product, ep, owned, closed }) {
  const [open, setOpen] = useState(false)
  const video = isVideo(product)
  const by = getPractitioner(product.practitioner)?.name
  const panelId = `mls-play-${ep.id}`
  const meta = [minutes(ep.duration), ep.released && `Released ${ep.released}`].filter(Boolean).join(' · ')

  let action = null
  if (ep.lock && !closed) {
    action = <span className="mls-when" title={ep.lock.hint}><Icon name="clock" size={16} />{ep.lock.label}</span>
  } else if (owned) {
    action = <Button variant="ghost" size="sm" iconStart="play" href={`${openHref(product)}?episode=${ep.id}`} aria-label={`${video ? 'Watch' : 'Play'} ${ep.title} in your library`}>{video ? 'Watch' : 'Play'}</Button>
  } else if (ep.playable) {
    action = (
      <Button variant="secondary" size="sm" iconStart={open ? 'x' : 'play'} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)}>
        {open ? 'Close' : video ? 'Watch free' : 'Listen free'}
      </Button>
    )
  } else {
    const label = closed ? 'No longer available' : isFree(product) ? 'Free with an account' : 'Join to unlock'
    action = <span className="mls-when"><Icon name="lock" size={16} />{label}</span>
  }

  return (
    <li className={cx('mls-row', ep.lock && 'is-waiting', !ep.playable && !ep.lock && 'is-locked')}>
      <div className="mls-line">
        <span className="mls-num" aria-hidden="true">{ep.n}</span>
        <span className="mls-text">
          <span className="mls-title"><span className="sg-sr">{itemLabel(product, ep)}: </span>{ep.title}</span>
          <span className="mls-meta">{meta}</span>
        </span>
        <EpisodeBadges ep={ep} />
        <span className="mls-action">{action}</span>
      </div>
      {open && (
        <div id={panelId} className="mls-sample">
          {video
            ? <VideoSample title={ep.title} resumeKey={`library/${product.slug}/${ep.id}`} />
            : <AudioSample title={ep.title} subtitle={by} duration={ep.duration} />}
        </div>
      )}
    </li>
  )
}

export default function SalesEpisodes({ product, owned: bought }) {
  const { signedIn } = useViewer()
  // A free library is open to anyone signed in (the password-protected one still asks for its password).
  const owned = bought || (signedIn && isFree(product) && !product.password && product.availability === 'available')
  const library = buildLibrary(product, { owned })
  const id = 'pd-episodes'
  const title = itemWord(product, true).replace(/^./, (c) => c.toUpperCase())
  const text = intro(product, library, owned)
  return (
    <section className="pd-section mls" aria-labelledby={id}>
      <h2 id={id} className="t-heading-2">{title}</h2>
      <LibraryFacts product={product} library={library} />
      {library.expiry?.passed && (
        <Notice tone="warning" title={library.expiry.label}>
          It’s no longer open to new members. Everyone who joined before then keeps their access.
        </Notice>
      )}
      {text && <p className="t-muted">{text}</p>}
      {library.groups.map((g, gi) => (
        <div key={g.title || gi} className="mls-group">
          {g.title && <h3 className="t-heading-4 mls-divider">{g.title}</h3>}
          <ol className="mls-list" aria-label={g.title || title}>
            {g.episodes.map((ep) => <EpisodeRow key={ep.id} product={product} ep={ep} owned={owned} closed={!owned && library.expiry?.passed} />)}
          </ol>
        </div>
      ))}
    </section>
  )
}
