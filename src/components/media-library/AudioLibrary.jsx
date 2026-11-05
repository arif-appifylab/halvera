// An audio library or podcast for people with access: episodes grouped by divider, a "continue
// listening" card, and the mini player bar that keeps playing while you browse. Podcasts add show
// notes, a transcript and a private feed for podcast apps.
import { useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { cx, Button, Card, Icon, ProgressBar } from '@/design-system'
import { getPractitioner } from '@/data/people.js'
import { episodeNotes, podcastFeed } from '@/data/media-library.js'
import useLibraryAudio from './useLibraryAudio.js'
import MiniPlayer from './MiniPlayer.jsx'
import { LibraryNotices } from './LibraryNotices.jsx'
import { EpisodeBadges, DownloadButton } from './LibraryParts.jsx'
import {
  buildLibrary, formatOf, itemLabel, itemWord, minutes, releaseShort, timecode, totalTime, FORMAT_LABEL,
} from './schedule.js'

function Transcript({ lines, onSeek }) {
  if (!lines?.length) return <p className="t-body-sm t-muted">The transcript for this episode is on its way. It usually appears a day after release.</p>
  return (
    <ol className="mla-transcript">
      {lines.map(([time, who, text]) => (
        <li key={time}>
          <button type="button" className="mla-stamp" dir="ltr" onClick={() => onSeek(time)} aria-label={`Play from ${time}`}>{time}</button>
          <p><span className="t-strong">{who}</span> {text}</p>
        </li>
      ))}
    </ol>
  )
}

function EpisodeRow({ product, ep, player, done, podcast }) {
  const [panel, setPanel] = useState(null) // null | 'notes' | 'transcript'
  const content = episodeNotes[product.slug]?.[ep.id] || {}
  const current = player.episode?.id === ep.id
  const playing = current && player.playing
  const panelId = `mla-panel-${ep.id}`
  const toSeconds = (t) => t.split(':').reduce((s, n) => s * 60 + Number(n), 0)
  const meta = [
    minutes(ep.duration),
    ep.released && `Released ${ep.released}`,
    done && 'Finished',
  ].filter(Boolean).join(' · ')

  const toggle = (name) => setPanel((p) => (p === name ? null : name))

  return (
    <li className={cx('mla-row', current && 'is-current', ep.lock && 'is-locked')}>
      <div className="mla-line">
        {ep.lock ? (
          <span className="mla-play is-locked" aria-hidden="true"><Icon name="lock" size={18} /></span>
        ) : (
          <button
            type="button"
            className="mla-play"
            aria-label={`${playing ? 'Pause' : 'Play'} ${itemLabel(product, ep)}: ${ep.title}`}
            onClick={() => (current ? player.toggle() : player.load(ep))}
          >
            <Icon name={playing ? 'pause' : 'play'} size={18} />
          </button>
        )}
        <div className="mla-text">
          <p className="mla-title">
            <span className="mla-num">{ep.n}.</span> {ep.title}
          </p>
          <p className="mla-meta">
            {ep.lock
              ? <span className="mla-when" title={ep.lock.hint}><Icon name="clock" size={14} />{ep.lock.label}</span>
              : <span>{meta}</span>}
            {current && <span className="mla-now">{playing ? 'Playing' : 'Paused'}</span>}
          </p>
        </div>
        <EpisodeBadges ep={ep} />
      </div>

      {!ep.lock && (podcast || ep.download) && (
        <div className="mla-tools">
          {podcast && (
            <>
              <Button variant="ghost" size="sm" aria-expanded={panel === 'notes'} aria-controls={panelId} onClick={() => toggle('notes')}>
                Show notes
              </Button>
              <Button variant="ghost" size="sm" aria-expanded={panel === 'transcript'} aria-controls={panelId} onClick={() => toggle('transcript')}>
                Transcript
              </Button>
            </>
          )}
          {ep.download && <DownloadButton ep={ep} />}
        </div>
      )}

      {panel && (
        <div id={panelId} className="mla-panel">
          {panel === 'notes' ? (
            <>
              <p>{content.notes || `Notes for ${ep.title} are on their way.`}</p>
              {content.links?.length > 0 && (
                <>
                  <p className="t-body-sm t-strong">Mentioned in this episode</p>
                  <ul className="pg-ticks">
                    {content.links.map((l) => <li key={l}><Icon name="check" size={16} /><span className="t-body-sm">{l}</span></li>)}
                  </ul>
                </>
              )}
            </>
          ) : (
            <Transcript lines={content.transcript} onSeek={(t) => player.load(ep, { at: toSeconds(t) })} />
          )}
        </div>
      )}
    </li>
  )
}

function PodcastSubscribe({ product }) {
  const feed = podcastFeed[product.slug]
  const [copied, setCopied] = useState(null) // null | 'ok' | 'failed'
  const inputRef = useRef(null)
  if (!feed) return null
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(feed.url)
      setCopied('ok')
    } catch {
      inputRef.current?.select()
      setCopied('failed')
    }
  }
  return (
    <Card padding="lg" className="pg-stack-sm">
      <h2 className="t-heading-4">Subscribe in your podcast app</h2>
      <p className="t-body-sm t-muted">
        Paste your private feed into {feed.apps.join(', ')} or any other app that takes an RSS link. New episodes arrive there every week.
      </p>
      <label className="mla-feed">
        <span className="sg-sr">Your private feed link</span>
        <input ref={inputRef} className="sg-input mla-feed-input" readOnly value={feed.url} dir="ltr" onFocus={(e) => e.target.select()} />
      </label>
      <Button variant="secondary" iconStart={copied === 'ok' ? 'check' : 'file'} onClick={copy}>
        {copied === 'ok' ? 'Link copied' : 'Copy feed link'}
      </Button>
      <p className="t-body-sm t-muted" role="status">
        {copied === 'failed' ? 'Copying didn’t work in this browser. The link is selected, so you can copy it yourself.' : 'This link is yours alone. Keep it to yourself, as it’s tied to your account.'}
      </p>
    </Card>
  )
}

export default function AudioLibrary({ product }) {
  const { search } = useLocation()
  const library = useMemo(() => buildLibrary(product, { owned: true }), [product])
  const { place, groups, episodes, open } = library
  const [done, setDone] = useState(() => new Set(place.done))
  const player = useLibraryAudio(product, { onEnded: (ep) => setDone((s) => new Set(s).add(ep.id)) })
  const podcast = formatOf(product) === 'podcast'
  const by = getPractitioner(product.practitioner)?.name

  const asked = open.find((e) => e.id === new URLSearchParams(search).get('episode'))
  const resume = asked || open.find((e) => e.id === place.last && !done.has(e.id))
  const resumeAt = resume && resume.id === place.last ? place.position : 0
  const finished = episodes.filter((e) => done.has(e.id)).length

  return (
    <>
      <div className="pg-split mla">
        <div className="pg-stack-lg">
          <LibraryNotices product={product} library={library} />

          {resume && !player.episode && (
            <Card tone="sage" padding="lg" className="mla-continue">
              <div className="pg-stack-sm">
                <p className="sg-eyebrow">{asked ? 'Ready to play' : 'Continue where you left off'}</p>
                <h2 className="t-heading-3">{resume.title}</h2>
                <p className="t-body-sm t-muted">
                  {itemLabel(product, resume)} · {resumeAt > 0 ? `${timecode(resumeAt)} of ${timecode(resume.seconds)}` : minutes(resume.duration)}
                </p>
                {resumeAt > 0 && <ProgressBar value={resumeAt} max={resume.seconds} label={`${Math.round((resumeAt / resume.seconds) * 100)}% listened`} showValue={false} />}
              </div>
              <Button iconStart="play" onClick={() => player.load(resume, { at: resumeAt })}>
                {resumeAt > 0 ? 'Continue listening' : 'Play'}
              </Button>
            </Card>
          )}

          {groups.map((g, gi) => (
            <section key={g.title || gi} className="mla-group" aria-labelledby={`mla-g-${gi}`}>
              <h2 id={`mla-g-${gi}`} className="t-heading-4 mla-divider">{g.title || `All ${itemWord(product, true)}`}</h2>
              <ol className="mla-list">
                {g.episodes.map((ep) => (
                  <EpisodeRow key={ep.id} product={product} ep={ep} player={player} done={done.has(ep.id)} podcast={podcast} />
                ))}
              </ol>
            </section>
          ))}
        </div>

        <aside className="pg-split-aside">
          <Card padding="lg" className="pg-stack-sm">
            <h2 className="t-heading-4">About this {podcast ? 'podcast' : 'library'}</h2>
            <dl className="pg-facts">
              <dt>Format</dt><dd>{FORMAT_LABEL[formatOf(product)]}</dd>
              <dt>{itemWord(product, true).replace(/^./, (c) => c.toUpperCase())}</dt><dd>{episodes.length} · {totalTime(library.total)}</dd>
              <dt>Release</dt><dd>{releaseShort(product)}</dd>
              <dt>Offline</dt><dd>{product.mediaLibrary?.downloads ? `Download any ${itemWord(product)}` : 'Streaming only'}</dd>
              {library.expiry && <><dt>{library.expiry.passed ? 'Closed on' : 'Open until'}</dt><dd>{library.expiry.date}</dd></>}
              {by && <><dt>With</dt><dd>{by}</dd></>}
            </dl>
            <ProgressBar value={finished} max={episodes.length} label={`${finished} of ${episodes.length} finished`} />
          </Card>
          {podcast && <PodcastSubscribe product={product} />}
        </aside>
      </div>
      <MiniPlayer product={product} player={player} />
    </>
  )
}
