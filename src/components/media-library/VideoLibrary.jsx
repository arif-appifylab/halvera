// A video library for owners: the player with the episode playlist beside it. Opens where the
// viewer left off, marks finished classes, and can play the next one on its own ("Autoplay next").
// Playback speed, captions and full screen come from the player itself.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { cx, Button, Icon, ProgressBar, Switch } from '@/design-system'
import { setLessonContext } from '@/lib/analytics/index.js'
import { getPref, setPref } from './prefs.js'
import VideoPlayer from '@/components/media/VideoPlayer.jsx'
import { videoSourceFor } from '@/data/media.js'
import { episodeNotes } from '@/data/media-library.js'
import { buildLibrary, itemLabel, itemWord, minutes, timecode } from './schedule.js'
import { EpisodeBadges, DownloadButton, LibraryFacts } from './LibraryParts.jsx'
import { LibraryNotices } from './LibraryNotices.jsx'

const AUTOPLAY_KEY = 'sw-library-autoplay'

export default function VideoLibrary({ product }) {
  const { search } = useLocation()
  const library = useMemo(() => buildLibrary(product, { owned: true }), [product])
  const { place, groups, episodes, open } = library
  const asked = new URLSearchParams(search).get('episode')
  const firstId = [asked, place.last].map((id) => open.find((e) => e.id === id)).find(Boolean)?.id || open[0]?.id

  const [currentId, setCurrentId] = useState(firstId)
  const [done, setDone] = useState(() => new Set(place.done))
  const [autoplay, setAutoplay] = useState(() => getPref(AUTOPLAY_KEY) !== 'off')
  const stageRef = useRef(null)
  const startNowRef = useRef(false)
  const endedRef = useRef(null)

  const current = episodes.find((e) => e.id === currentId)
  const index = open.findIndex((e) => e.id === currentId)
  const next = index >= 0 ? open[index + 1] : null
  const resumeAt = current && current.id === place.last && !done.has(current.id) ? place.position : 0
  const notes = episodeNotes[product.slug]?.[currentId]?.notes

  // Analytics: every video_* event from the player carries this library and episode.
  useEffect(() => {
    if (!current) return undefined
    setLessonContext({ courseSlug: product.slug, lessonId: current.id, lessonType: 'video', productType: 'media-library' })
    return () => setLessonContext(null)
  }, [product.slug, current])

  // Autoplay next: start the new class once its player is on the page.
  useEffect(() => {
    if (!startNowRef.current) return
    startNowRef.current = false
    const video = stageRef.current?.querySelector('video')
    video?.play?.().catch(() => {})
  }, [currentId])

  // A class ended: the native <video> 'ended' (captured, it doesn't bubble) or the player's video_ended
  // event (Bunny's iframe). Either one, once per class, so autoplay works without analytics consent too.
  const onFinishedRef = useRef(null)
  useEffect(() => {
    const el = stageRef.current
    if (!el) return undefined
    const onEnded = () => onFinishedRef.current?.()
    const onPlay = () => { endedRef.current = null }
    el.addEventListener('ended', onEnded, true)
    el.addEventListener('play', onPlay, true)
    return () => {
      el.removeEventListener('ended', onEnded, true)
      el.removeEventListener('play', onPlay, true)
    }
  }, [])

  const choose = (ep, { play = false } = {}) => {
    endedRef.current = null
    startNowRef.current = play
    setCurrentId(ep.id)
    stageRef.current?.scrollIntoView?.({ block: 'nearest' })
  }
  const finished = () => {
    if (!current || endedRef.current === current.id) return
    endedRef.current = current.id
    setDone((s) => new Set(s).add(current.id))
    if (autoplay && next) choose(next, { play: true })
  }
  useEffect(() => { onFinishedRef.current = finished })
  const toggleAutoplay = (on) => { setAutoplay(on); setPref(AUTOPLAY_KEY, on ? 'on' : 'off') }
  const watchedCount = episodes.filter((e) => done.has(e.id)).length
  if (!current) return null

  return (
    <div className="pg-stack-lg">
      <LibraryNotices product={product} library={library} />
      <div className="mlv">
        <div className="mlv-main" ref={stageRef}>
          <VideoPlayer
            key={current.id}
            source={videoSourceFor(product.slug, current.id)}
            title={current.title}
            startAt={resumeAt}
            resumeKey={`library/${product.slug}/${current.id}`}
            onEvent={(e) => { if (e?.type === 'video_ended') finished() }}
          />
          <div className="mlv-now">
            <p className="sg-eyebrow">{itemLabel(product, current)}{current.group ? ` · ${current.group}` : ''}</p>
            <h2 className="t-heading-3">{current.title}</h2>
            <p className="sg-sr" aria-live="polite">Now playing: {current.title}</p>
            <p className="mlx-meta">
              <span>{minutes(current.duration)}</span>
              <EpisodeBadges ep={current} />
              {done.has(current.id) && <span className="mlx-done"><Icon name="check-circle" size={16} />Watched</span>}
            </p>
            {resumeAt > 0 && <p className="t-body-sm t-muted">Picking up at {timecode(resumeAt)}, where you left off.</p>}
            {notes && <p className="mlv-notes">{notes}</p>}
            <div className="mlv-actions">
              <Switch label="Autoplay next" description={`Starts the next ${itemWord(product)} when this one ends.`} checked={autoplay} onChange={toggleAutoplay} />
              <div className="pg-row">
                {current.download && <DownloadButton ep={current} />}
                {next && (
                  <Button variant="secondary" iconEnd="arrow-right" onClick={() => choose(next, { play: true })}>
                    Next {itemWord(product)}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="mlv-list" aria-label={`All ${itemWord(product, true)}`}>
          <div className="mlv-list-head">
            <p className="t-heading-4">{episodes.length} {itemWord(product, true)}</p>
            <ProgressBar value={watchedCount} max={episodes.length} label={`${watchedCount} of ${episodes.length} watched`} showValue={false} />
          </div>
          <div className="mlv-scroll">
            {groups.map((g, gi) => (
              <div key={g.title || gi} className="mlv-group">
                {g.title && <h3 className="mlv-divider">{g.title}</h3>}
                <ol>
                  {g.episodes.map((ep) => {
                    const isCurrent = ep.id === currentId
                    const watched = done.has(ep.id)
                    return (
                      <li key={ep.id}>
                        <button
                          type="button"
                          className={cx('mlv-item', isCurrent && 'is-current', ep.lock && 'is-locked')}
                          aria-current={isCurrent ? 'true' : undefined}
                          disabled={Boolean(ep.lock)}
                          onClick={() => choose(ep)}
                        >
                          <span className="mlv-mark" aria-hidden="true">
                            {ep.lock ? <Icon name="lock" size={16} /> : isCurrent ? <Icon name="play" size={16} /> : watched ? <Icon name="check" size={16} /> : ep.n}
                          </span>
                          <span className="mlv-item-text">
                            <span className="mlv-item-title"><span className="sg-sr">{itemLabel(product, ep)}: </span>{ep.title}</span>
                            <span className="mlv-item-meta">
                              {ep.lock ? ep.lock.label : [minutes(ep.duration), isCurrent ? 'Now playing' : watched ? 'Watched' : null, ep.free ? 'Free' : ep.tag === 'Bonus' ? 'Bonus' : null].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </div>
            ))}
          </div>
        </aside>
      </div>
      <LibraryFacts product={product} library={library} />
    </div>
  )
}
