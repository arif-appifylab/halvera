import { useId, useMemo, useState } from 'react'
import { cx, Avatar, Badge, Button, EmptyState, SegmentedToggle } from '@/design-system'
import RichTextEditor from '@/components/editor/RichTextEditor.jsx'
import RichTextView from '@/components/editor/RichTextView.jsx'
import { relativeTime } from './state.js'
import { LtIcon } from './icons.jsx'

const SORTS = [{ value: 'newest', label: 'Newest' }, { value: 'top', label: 'Top' }]

// Per-lesson discussion: questions about this lesson, practitioner replies, likes and a composer.
// State comes from useDiscussion (./state.js) so the count can show on the tool's button.
export default function Discussion({ discussion, canPost, lessonTitle }) {
  const { threads, ask, reply, toggleLike } = discussion
  const [sort, setSort] = useState('newest')
  const [asking, setAsking] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [status, setStatus] = useState('')

  const sorted = useMemo(() => {
    const list = [...threads]
    if (sort === 'top') list.sort((a, b) => b.likes + b.replies.length - (a.likes + a.replies.length) || b.at - a.at)
    else list.sort((a, b) => b.at - a.at)
    return list
  }, [threads, sort])

  const post = (html) => {
    ask(html)
    setAsking(false)
    setSort('newest')
    setStatus('Your question is posted. We’ll show replies here.')
  }

  return (
    <div className="lt-disc">
      <div className="lt-disc-top">
        {canPost && !asking && (
          <Button size="sm" iconStart="plus" onClick={() => { setAsking(true); setStatus('') }}>Ask a question</Button>
        )}
      </div>

      {asking && (
        <Composer
          label="Ask a question"
          hint={`About “${lessonTitle}”. Your practitioner and other students can reply.`}
          submitLabel="Post question"
          onSubmit={post}
          onCancel={() => setAsking(false)}
        />
      )}

      <p className={cx('lt-disc-status', !status && 'is-empty')} role="status" aria-live="polite">{status}</p>

      {!canPost && (
        <p className="lt-hint">Enrol in this programme to ask questions and reply.</p>
      )}

      {threads.length === 0 ? (
        !asking && (
          <EmptyState
            icon="users"
            title="No questions yet"
            action={canPost && <Button size="sm" variant="secondary" onClick={() => setAsking(true)}>Ask the first question</Button>}
          >
            Ask about anything in this lesson. Your practitioner reads every question.
          </EmptyState>
        )
      ) : (
        <>
          <div className="lt-disc-bar">
            <p className="lt-disc-count">{threads.length} {threads.length === 1 ? 'question' : 'questions'}</p>
            <SegmentedToggle label="Sort questions" options={SORTS} value={sort} onChange={setSort} />
          </div>
          <ol className="lt-threads">
            {sorted.map((t) => (
              <li key={t.id} className="lt-thread">
                <Post item={t} onLike={() => toggleLike(t.id)}>
                  {canPost && (
                    <button
                      type="button"
                      className="lt-textbtn"
                      aria-expanded={replyTo === t.id}
                      onClick={() => setReplyTo(replyTo === t.id ? null : t.id)}
                    >
                      <LtIcon name="reply" size={16} />Reply<span className="lt-sr"> to {t.author}</span>
                    </button>
                  )}
                </Post>
                {t.replies.length > 0 && (
                  <ol className="lt-replies" aria-label={`Replies to ${t.author}`}>
                    {t.replies.map((r) => (
                      <li key={r.id} className="lt-reply">
                        <Post item={r} small onLike={() => toggleLike(r.id)} />
                      </li>
                    ))}
                  </ol>
                )}
                {replyTo === t.id && (
                  <div className="lt-replies">
                    <Composer
                      label={`Reply to ${t.author}`}
                      submitLabel="Post reply"
                      minHeight={96}
                      onSubmit={(html) => { reply(t.id, html); setReplyTo(null); setStatus('Your reply is posted.') }}
                      onCancel={() => setReplyTo(null)}
                    />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}

function Post({ item, small, onLike, children }) {
  return (
    <article className={cx('lt-post', small && 'is-small')} aria-label={`${item.author}, ${relativeTime(item.at)}`}>
      <Avatar src={item.avatar} name={item.author} size="sm" className="lt-post-avatar" />
      <div className="lt-post-main">
        <p className="lt-post-head">
          <span className="lt-post-author">{item.author}</span>
          {item.practitioner && <Badge tone="primary" icon="check">Practitioner</Badge>}
          {item.mine && <Badge>You</Badge>}
          <span className="lt-meta"><time dateTime={new Date(item.at).toISOString()}>{relativeTime(item.at)}</time></span>
        </p>
        <RichTextView value={item.text} className="lt-post-text" />
        <div className="lt-post-actions">
          <button type="button" className={cx('lt-like', item.liked && 'is-on')} aria-pressed={item.liked} onClick={onLike}>
            <LtIcon name="like" size={16} />
            <span>{item.liked ? 'Liked' : 'Like'}</span>
            {item.likes > 0 && <span className="lt-like-count">{item.likes}<span className="lt-sr"> {item.likes === 1 ? 'like' : 'likes'}</span></span>}
          </button>
          {children}
        </div>
      </div>
    </article>
  )
}

function Composer({ label, hint, submitLabel, onSubmit, onCancel, minHeight = 120 }) {
  const [html, setHtml] = useState('')
  const [words, setWords] = useState(0)
  const [error, setError] = useState('')
  const id = useId()
  const submit = (e) => {
    e.preventDefault()
    if (!words) { setError('Write your question or reply first.'); return }
    onSubmit(html)
  }
  return (
    <form className="lt-composer" onSubmit={submit} aria-labelledby={`${id}-label`}>
      <RichTextEditor
        id={id}
        label={label}
        hint={hint}
        value={html}
        minHeight={minHeight}
        maxLength={2000}
        error={error || undefined}
        onChange={(next, _json, meta) => { setHtml(next); setWords(meta?.words || 0); if (error) setError('') }}
      />
      <div className="lt-composer-actions">
        <Button type="submit" size="sm">{submitLabel}</Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}
