// The promo video or audio at the top of a media library's sales page (admin: "A short trailer plays
// at the top of the library page"), and the inline player for free sample episodes.
import { Badge } from '@/design-system'
import VideoPlayer from '@/components/media/VideoPlayer.jsx'
import AudioStage from '@/components/media/AudioStage.jsx'
import { previewVideo } from '@/data/media.js'
import { altFor } from '@/data/media-credits.js'
import { getPractitioner } from '@/data/people.js'
import { isVideo, seconds, timecode } from './schedule.js'

// A free audio sample (or the trailer): the shared audio stage, compact, without artwork. It reports
// audio_play / pause / progress / ended / rate and keeps markMediaPlaying on while it plays.
export function AudioSample({ title, subtitle, duration, src, resumeKey }) {
  return <AudioStage compact title={title} subtitle={subtitle} duration={duration} src={src} resumeKey={resumeKey} className="mlx-audio" />
}

// A free video sample (or the trailer). The theme preview plays the preview clip; a school's
// episode would pass its Bunny Stream source.
export function VideoSample({ title, resumeKey, source = previewVideo }) {
  return <VideoPlayer source={source} title={title} resumeKey={resumeKey} />
}

export default function LibraryPromo({ product }) {
  const promo = product.mediaLibrary?.promo
  if (!promo) return null
  const by = getPractitioner(product.practitioner)?.name
  const length = timecode(seconds(promo.duration))

  if (isVideo(product)) {
    return (
      <figure className="mlp">
        <VideoSample title={promo.title} resumeKey={`library/${product.slug}/promo`} />
        <figcaption className="mlp-caption">
          <Badge tone="primary" icon="play">Trailer</Badge>
          <span>{promo.title} · {length}</span>
        </figcaption>
      </figure>
    )
  }

  return (
    <figure className="mlp">
      <div className="pg-media pd-media">
        {product.image && <img className="pd-media-img" src={product.image} alt={altFor(product.image)} width="1200" height="675" decoding="async" />}
      </div>
      <AudioSample title={promo.title} subtitle={`Trailer${by ? ` · ${by}` : ''}`} duration={length} />
    </figure>
  )
}
