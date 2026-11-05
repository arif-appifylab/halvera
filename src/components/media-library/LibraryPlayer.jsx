// The media library's open page (/media-library/:slug/open) for people with access:
// a playlist player for video libraries, the episode list with a mini player bar for audio and podcasts.
import { EmptyState } from '@/design-system'
import VideoLibrary from './VideoLibrary.jsx'
import AudioLibrary from './AudioLibrary.jsx'
import { isVideo, itemWord, libraryEpisodes } from './schedule.js'
import './media-library.css'


export default function LibraryPlayer({ product }) {
  if (!libraryEpisodes(product).episodes.length) {
    return (
      <EmptyState icon={isVideo(product) ? 'video' : 'headphones'} title="Nothing here yet">
        The first {itemWord(product)} is on its way. We’ll email you when it’s ready.
      </EmptyState>
    )
  }
  return isVideo(product) ? <VideoLibrary product={product} /> : <AudioLibrary product={product} />
}
