import { useParams } from 'react-router-dom'
import NotFound from '@/pages/NotFound.jsx'
import { getProduct } from '@/lib/products.js'
import PlayerClassroom from '@/pages/learn/PlayerClassroom.jsx'

// Course player (the Classroom layout). It renders without the site header and footer.
export default function Learn() {
  const { slug, lessonId } = useParams()
  const product = getProduct(slug)
  if (!product || !['course', 'cohort'].includes(product.type) || !product.curriculum?.length) return <NotFound />
  return <PlayerClassroom key={slug} product={product} lessonId={lessonId} />
}
