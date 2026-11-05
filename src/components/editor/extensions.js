import { Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Plugin, PluginKey } from '@tiptap/pm/state'

// The one schema shared by RichTextEditor and RichTextView. Anything not listed here (images, tables,
// code, strike, underline, inline styles, classes, other heading levels) is dropped when content is
// pasted or loaded, because ProseMirror only keeps what the schema can hold. See docs/rich-text-editor.md.

const PROTOCOLS = ['http:', 'https:', 'mailto:']

// Returns a normalised URL (https:// added when the scheme is missing) or null when it isn't allowed.
export function normaliseUrl(input) {
  const raw = String(input || '').trim()
  if (!raw || /\s/.test(raw)) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(withScheme)
    if (!PROTOCOLS.includes(url.protocol)) return null
    if (url.protocol !== 'mailto:' && !url.hostname.includes('.')) return null
    return url.href
  } catch {
    return null
  }
}

export const charCount = (doc) => doc.textContent.length
export const wordCount = (text) => (String(text || '').trim().match(/\S+/g) || []).length

const isPasteOrDrop = (tr) => tr.getMeta('paste') || ['paste', 'drop'].includes(tr.getMeta('uiEvent'))

// Keeps the text within `limit` characters: typing past it is blocked, pasted text is trimmed.
const CharacterLimit = Extension.create({
  name: 'rteCharacterLimit',
  addOptions: () => ({ limit: null }),
  addProseMirrorPlugins() {
    const { limit } = this.options
    if (!limit) return []
    return [
      new Plugin({
        key: new PluginKey('rteCharacterLimit'),
        filterTransaction: (tr, state) => {
          if (!tr.docChanged || isPasteOrDrop(tr)) return true
          const next = charCount(tr.doc)
          return next <= limit || next <= charCount(state.doc)
        },
        appendTransaction: (trs, _old, state) => {
          if (!trs.some(isPasteOrDrop)) return null
          const over = charCount(state.doc) - limit
          if (over <= 0) return null
          const to = state.selection.$head.pos
          return state.tr.deleteRange(Math.max(1, to - over), to)
        },
      }),
    ]
  },
})

export function richTextExtensions({ placeholder, maxLength } = {}) {
  return [
    StarterKit.configure({
      heading: { levels: [3] },
      code: false,
      codeBlock: false,
      strike: false,
      underline: false,
      horizontalRule: false,
      link: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: 'https',
      protocols: ['http', 'https', 'mailto'],
      isAllowedUri: (url) => normaliseUrl(url) !== null,
      HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer nofollow', class: null },
    }),
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
    ...(maxLength ? [CharacterLimit.configure({ limit: maxLength })] : []),
  ]
}

// Value can be Tiptap JSON, an HTML string from this schema, or plain text from older answers.
export function toContent(value) {
  if (!value) return ''
  if (typeof value === 'object') return value
  const text = String(value)
  if (/<[a-z][\s\S]*>/i.test(text)) return text
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return text.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')
}
