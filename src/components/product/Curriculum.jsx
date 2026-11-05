// Course and cohort curriculum: chapters (collapsible) with LessonRows.
import { Icon, LessonRow } from '@/design-system'
import { lessonLock } from '@/lib/access.js'
import { shownType } from '@/components/player/lesson-types.js'
import { salesLessonMeta } from '@/components/course/cohort.js'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export default function Curriculum({ product, owned }) {
  const chapters = product.curriculum || []
  if (!chapters.length) return null
  const lessons = chapters.flatMap((c) => c.lessons)
  const previews = lessons.filter((l) => l.preview).length
  const learn = (l) => `/course/${product.slug}/learn/${l.id}`

  return (
    <section className="pd-section" aria-labelledby="pd-curriculum">
      <div className="pg-row-between">
        <h2 id="pd-curriculum" className="t-heading-2">Curriculum</h2>
        <p className="t-body-sm t-muted">
          {plural(chapters.length, 'chapter')} · {plural(lessons.length, 'lesson')}
          {previews > 0 && <> · {plural(previews, 'free preview')}</>}
        </p>
      </div>
      <div className="pd-chapters">
        {chapters.map((chapter, i) => (
          <details key={chapter.title} className="pd-chapter" open={i === 0 || undefined}>
            <summary>
              <span className="pd-chapter-title">{chapter.title}</span>
              <span className="pd-chapter-count">{plural(chapter.lessons.length, 'lesson')}</span>
              <Icon name="chevron-down" size={18} className="pd-chapter-chevron" />
            </summary>
            <div className="pd-chapter-lessons">
              {chapter.lessons.map((l) => {
                // On the sales page the previous lesson is never done, so prerequisites show as locked.
                const lock = lessonLock(l, { previous: lessons[lessons.indexOf(l) - 1], previousDone: false })
                return (
                  <LessonRow
                    key={l.id}
                    title={l.title}
                    type={shownType(l)}
                    duration={product.cohort ? salesLessonMeta(product, l, owned) : l.duration}
                    state={lock ? lock.state : 'open'}
                    unlockDate={lock?.unlockDate}
                    preview={l.preview}
                    href={!lock && (l.preview || owned) ? learn(l) : undefined}
                  />
                )
              })}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
