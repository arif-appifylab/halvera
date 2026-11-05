import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { cx } from '@/design-system'
import { richTextExtensions, toContent } from './extensions.js'
import './rich-text-editor.css'

// Read-only render of an answer saved by RichTextEditor (Tiptap JSON, HTML from the same schema, or
// plain text). It goes through a non-editable Tiptap editor with the same extensions, so anything the
// schema doesn't allow is dropped instead of injected. Never dangerouslySetInnerHTML.

const VIEW_PROPS = { attributes: { class: 'rte-prose' } }

export default function RichTextView({ value, className, ...rest }) {
  const [extensions] = useState(() => richTextExtensions())
  const editor = useEditor({
    extensions,
    content: toContent(value),
    editable: false,
    editorProps: VIEW_PROPS,
  })
  const shown = useRef(value)

  useEffect(() => {
    if (!editor || editor.isDestroyed || shown.current === value) return
    shown.current = value
    editor.commands.setContent(toContent(value), { emitUpdate: false })
  }, [editor, value])

  return <EditorContent editor={editor} className={cx('rte-view', className)} {...rest} />
}
