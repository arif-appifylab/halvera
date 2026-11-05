// The persistent mini player bar at the bottom of an audio library or podcast page: stays while
// you browse episodes. Play / pause, skip 15 seconds back or forward, speed 0.75–2×, progress.
// The timeline and controls stay left to right in right-to-left languages.
import { cx, Icon, IconButton } from '@/design-system'
import { RATES } from './useLibraryAudio.js'
import { SkipIcon } from './LibraryParts.jsx'
import { itemLabel, timecode } from './schedule.js'

export default function MiniPlayer({ product, player }) {
  const ep = player.episode
  if (!ep) return null
  const { position, duration, playing, rate } = player
  const pct = duration ? Math.min(100, (position / duration) * 100) : 0

  return (
    <>
      <section className="mlb" aria-label="Audio player">
        <div className="sg-container mlb-inner">
          <div className="mlb-info">
            {product.image
              ? <img className="mlb-cover" src={product.image} alt="" width="48" height="48" />
              : <span className="mlb-cover mlb-cover-ph"><Icon name="headphones" size={20} /></span>}
            <div className="mlb-text">
              <p className="mlb-title">{ep.title}</p>
              <p className="mlb-sub">{itemLabel(product, ep)} · {product.title}</p>
            </div>
          </div>

          <div className="mlb-controls" dir="ltr">
            <button type="button" className="mlb-skip" onClick={() => player.skip(-15)} aria-label="Back 15 seconds">
              <SkipIcon />
            </button>
            <button type="button" className={cx('mlb-play', playing && 'is-playing')} onClick={player.toggle} aria-label={playing ? `Pause ${ep.title}` : `Play ${ep.title}`}>
              <Icon name={playing ? 'pause' : 'play'} size={22} />
            </button>
            <button type="button" className="mlb-skip" onClick={() => player.skip(15)} aria-label="Forward 15 seconds">
              <SkipIcon forward />
            </button>
          </div>

          <div className="mlb-progress" dir="ltr">
            <span className="mlb-time">{timecode(position)}</span>
            <input
              type="range"
              className="mlb-range"
              min={0}
              max={Math.max(1, Math.round(duration))}
              step={1}
              value={Math.round(position)}
              onChange={(e) => player.seek(Number(e.target.value))}
              aria-label="Position"
              aria-valuetext={`${timecode(position)} of ${timecode(duration)}`}
              style={{ '--mlb-fill': `${pct}%` }}
            />
            <span className="mlb-time">−{timecode(Math.max(0, duration - position))}</span>
          </div>

          <label className="mlb-speed">
            <span className="sg-sr">Playback speed</span>
            <select value={rate} onChange={(e) => player.setRate(Number(e.target.value))}>
              {RATES.map((r) => <option key={r} value={r}>{r}×</option>)}
            </select>
            <Icon name="chevron-down" size={16} className="mlb-speed-icon" />
          </label>

          <IconButton icon="x" label="Close the player" size="sm" className="mlb-close" onClick={player.close} />
        </div>
      </section>
    </>
  )
}
