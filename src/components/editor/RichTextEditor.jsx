import { useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { cx, Button, Icon } from '@/design-system'
import { track } from '@/lib/analytics/index.js'
import { richTextExtensions, toContent, normaliseUrl, wordCount, charCount } from './extensions.js'
import './rich-text-editor.css'

// Rich text answer field (Tiptap). Looks and behaves like the design-system TextField, with a small
// toolbar, word and character counts and an optional autosaved draft. Output is limited to the schema in
// ./extensions.js; see docs/rich-text-editor.md.
//
//   <RichTextEditor label="Your answer" value={html} onChange={(html, json, { text, words }) => …}
//     autosaveKey="assignment:gut-health-reset:rhythm-map" ref={editorRef} />
//
// ref exposes { focus(), saveDraft(), clearDraft(), editor }.

const DRAFT_PREFIX = 'rte-draft:'

function readDraft(key) {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key)
    const draft = raw && JSON.parse(raw)
    return draft && draft.json ? draft : null
  } catch {
    return null
  }
}

function writeDraft(key, draft) {
  try {
    if (draft) localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(draft))
    else localStorage.removeItem(DRAFT_PREFIX + key)
    return true
  } catch {
    return false
  }
}

function savedAgo(at, now) {
  const mins = Math.floor((now - at) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const d = new Date(at)
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return new Date(now).toDateString() === d.toDateString()
    ? `at ${time}`
    : `on ${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
const keyHint = (keys) => keys.replace('Mod', isMac ? '⌘' : 'Ctrl').replace(/Alt/, isMac ? '⌥' : 'Alt')
const ariaKeys = (keys) => (isMac ? keys.replace('Mod', 'Meta') : keys.replace('Mod', 'Control'))

// Line icons drawn on the design-system grid (24px, 1.75 stroke, currentColor).
const PATHS = {
  bold: ['M6 4h7a4 4 0 0 1 0 8H6Z', 'M6 12h8a4 4 0 0 1 0 8H6Z'],
  italic: ['M19 4h-9', 'M14 20H5', 'M15 4 9 20'],
  heading: ['M6 12h12', 'M6 20V4', 'M18 20V4'],
  bullet: ['M9 6h12', 'M9 12h12', 'M9 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  ordered: ['M10 6h11', 'M10 12h11', 'M10 18h11', 'M4 4h1v5', 'M4 9h2', 'M6 19H4c0-1 2-2 2-3s-1-1.5-2-1'],
  quote: ['M17 6H3', 'M21 12H8', 'M21 18H8', 'M3 12v6'],
  link: ['M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7', 'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7'],
  undo: ['M3 7v6h6', 'M21 17a9 9 0 0 0-15-6.7L3 13'],
  redo: ['M21 7v6h-6', 'M3 17a9 9 0 0 1 15-6.7l3 2.7'],
}
const FLIPS = { bullet: 1, ordered: 1, quote: 1, undo: 1, redo: 1 }

function ToolIcon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      className={cx('sg-icon', FLIPS[name] && 'sg-icon-dir')}
    >
      {PATHS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  )
}

// `toggle` tools get aria-pressed; `group` starts a new visual group.
const TOOLS = [
  { id: 'bold', label: 'Bold', keys: 'Mod+B', toggle: true, run: (c) => c.toggleBold() },
  { id: 'italic', label: 'Italic', keys: 'Mod+I', toggle: true, run: (c) => c.toggleItalic() },
  { id: 'heading', label: 'Heading', keys: 'Mod+Alt+3', toggle: true, run: (c) => c.toggleHeading({ level: 3 }), group: true },
  { id: 'bullet', label: 'Bulleted list', keys: 'Mod+Shift+8', toggle: true, run: (c) => c.toggleBulletList() },
  { id: 'ordered', label: 'Numbered list', keys: 'Mod+Shift+7', toggle: true, run: (c) => c.toggleOrderedList() },
  { id: 'quote', label: 'Quote', keys: 'Mod+Shift+B', toggle: true, run: (c) => c.toggleBlockquote() },
  { id: 'link', label: 'Link', keys: 'Mod+K', toggle: true, popover: true, group: true },
  { id: 'undo', label: 'Undo', keys: 'Mod+Z', run: (c) => c.undo(), group: true },
  { id: 'redo', label: 'Redo', keys: 'Mod+Shift+Z', run: (c) => c.redo() },
]

export default function RichTextEditor({
  value, onChange, label, hint, placeholder, error, disabled, minHeight = 160, maxLength, autosaveKey,
  id, className, ref,
}) {
  const auto = useId()
  const fid = id || auto
  const ids = { label: `${fid}-label`, msg: `${fid}-msg`, count: `${fid}-count`, link: `${fid}-link` }

  const [initial] = useState(() => {
    const draft = autosaveKey ? readDraft(autosaveKey) : null
    return { content: draft ? draft.json : toContent(value), draft }
  })
  const [savedAt, setSavedAt] = useState(initial.draft?.at || null)
  const [now, setNow] = useState(() => Date.now())
  const [focused, setFocused] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState(null)
  const [activeTool, setActiveTool] = useState(0)

  const onChangeRef = useRef(onChange)
  const saveTimer = useRef(null)
  const lastEmitted = useRef(null)
  const prevValue = useRef(value)
  const openLinkRef = useRef(() => {})
  const saveDraftRef = useRef(() => {})
  const toolRefs = useRef([])
  const linkInputRef = useRef(null)

  useEffect(() => { onChangeRef.current = onChange })

  const [extensions] = useState(() => richTextExtensions({ placeholder, maxLength }))
  const describedBy = [(error || hint) && ids.msg, maxLength && ids.count].filter(Boolean).join(' ') || undefined

  // Kept referentially stable so useEditor only calls setOptions when the aria wiring changes.
  const editorProps = useMemo(() => ({
    attributes: {
      class: 'rte-content rte-prose',
      role: 'textbox',
      'aria-multiline': 'true',
      ...(label ? { 'aria-labelledby': ids.label } : {}),
      ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      ...(error ? { 'aria-invalid': 'true' } : {}),
      ...(disabled ? { 'aria-disabled': 'true', 'aria-readonly': 'true' } : {}),
    },
    handleKeyDown: (_view, e) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        openLinkRef.current()
        return true
      }
      return false
    },
  }), [label, ids.label, describedBy, error, disabled])

  const editor = useEditor({
    extensions,
    content: initial.content,
    editable: !disabled,
    editorProps,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onUpdate: ({ editor: ed }) => {
      emit(ed)
      if (autosaveKey) {
        clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => saveDraftRef.current(ed), 1000)
      }
    },
  })

  function emit(ed) {
    const html = ed.isEmpty ? '' : ed.getHTML()
    const json = ed.getJSON()
    const text = ed.getText({ blockSeparator: '\n\n' })
    lastEmitted.current = { html, json }
    onChangeRef.current?.(html, json, { text, words: wordCount(text), characters: charCount(ed.state.doc) })
  }

  function saveDraft(ed = editor) {
    clearTimeout(saveTimer.current)
    saveTimer.current = null
    if (!autosaveKey || !ed || ed.isDestroyed) return
    if (ed.isEmpty) {
      writeDraft(autosaveKey, null)
      setSavedAt(null)
      return
    }
    const at = Date.now()
    if (writeDraft(autosaveKey, { json: ed.getJSON(), html: ed.getHTML(), at })) {
      setSavedAt(at)
      setNow(at)
      track('assignment_draft_saved', { words: wordCount(ed.getText()) })
    }
  }

  function clearDraft() {
    clearTimeout(saveTimer.current)
    saveTimer.current = null
    if (autosaveKey) writeDraft(autosaveKey, null)
    setSavedAt(null)
  }

  useImperativeHandle(ref, () => ({
    focus: () => editor?.commands.focus('end'),
    saveDraft: () => saveDraft(),
    clearDraft,
    editor,
  }))

  // A restored draft is handed to the parent once, so its state matches what's on screen.
  useEffect(() => {
    if (editor && initial.draft) emit(editor)
  }, [editor, initial.draft])

  // Flush a pending autosave when the editor goes away (lesson change, leaving the page).
  useEffect(() => { saveDraftRef.current = saveDraft })
  useEffect(() => () => { if (saveTimer.current) saveDraftRef.current() }, [])

  // "Draft saved · 3 min ago" keeps itself current.
  useEffect(() => {
    if (!savedAt) return undefined
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [savedAt])

  // Controlled updates from the parent (anything other than what we just emitted).
  useEffect(() => {
    if (!editor || value === prevValue.current) return
    prevValue.current = value
    const last = lastEmitted.current
    if (last && (value === last.html || value === last.json)) return
    editor.commands.setContent(toContent(value), { emitUpdate: false })
  }, [editor, value])

  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.isEditable === Boolean(disabled)) editor.setEditable(!disabled, false)
  }, [editor, disabled])

  const state = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed) return null
      const text = ed.getText()
      return {
        bold: ed.isActive('bold'),
        italic: ed.isActive('italic'),
        heading: ed.isActive('heading', { level: 3 }),
        bullet: ed.isActive('bulletList'),
        ordered: ed.isActive('orderedList'),
        quote: ed.isActive('blockquote'),
        link: ed.isActive('link'),
        undo: ed.can().undo(),
        redo: ed.can().redo(),
        words: wordCount(text),
        chars: charCount(ed.state.doc),
      }
    },
  })

  /* ---------- Link popover ---------- */

  function openLink() {
    if (!editor || disabled) return
    setLinkUrl(editor.getAttributes('link').href || '')
    setLinkError(null)
    setLinkOpen(true)
  }
  useEffect(() => { openLinkRef.current = openLink })

  useEffect(() => {
    if (linkOpen) linkInputRef.current?.focus()
  }, [linkOpen])

  function closeLink({ toEditor = true } = {}) {
    setLinkOpen(false)
    setLinkError(null)
    if (toEditor) editor?.commands.focus()
    else toolRefs.current[TOOLS.findIndex((t) => t.id === 'link')]?.focus()
  }

  function applyLink() {
    const href = normaliseUrl(linkUrl)
    if (!href) {
      setLinkError('Enter a full web address, like https://example.org')
      linkInputRef.current?.focus()
      return
    }
    const chain = editor.chain().focus()
    if (editor.isActive('link')) chain.extendMarkRange('link').setLink({ href }).run()
    else if (editor.state.selection.empty) {
      chain.insertContent({ type: 'text', text: linkUrl.trim(), marks: [{ type: 'link', attrs: { href } }] }).unsetMark('link').run()
    } else chain.setLink({ href }).run()
    closeLink()
  }

  function removeLink() {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    closeLink()
  }

  /* ---------- Toolbar (roving tabindex) ---------- */

  function runTool(tool) {
    if (!editor || disabled) return
    if (tool.popover) { if (linkOpen) closeLink(); else openLink(); return }
    if (tool.id === 'undo' && !state?.undo) return
    if (tool.id === 'redo' && !state?.redo) return
    tool.run(editor.chain().focus()).run()
  }

  function onToolbarKey(e) {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key]
    let next = null
    if (step) next = (activeTool + step + TOOLS.length) % TOOLS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TOOLS.length - 1
    if (next === null) return
    e.preventDefault()
    setActiveTool(next)
    toolRefs.current[next]?.focus()
  }

  const atLimit = maxLength && state && state.chars >= maxLength
  const words = state?.words ?? 0
  const chars = state?.chars ?? 0

  return (
    <div className={cx('sg-field rte', error && 'has-error', disabled && 'is-disabled', className)}>
      {label && (
        <span className="sg-label" id={ids.label} onClick={() => editor?.commands.focus()}>{label}</span>
      )}

      <div
        className={cx('rte-frame', focused && 'is-focused')}
        style={{ '--rte-min-height': typeof minHeight === 'number' ? `${minHeight}px` : minHeight }}
      >
        <div className="rte-head">
          <div
            className="rte-toolbar"
            role="toolbar"
            aria-label={label ? `Formatting for ${label.toLowerCase()}` : 'Formatting'}
            aria-controls={fid}
            onKeyDown={onToolbarKey}
          >
            {TOOLS.map((tool, i) => {
              const unavailable = (tool.id === 'undo' && !state?.undo) || (tool.id === 'redo' && !state?.redo)
              return (
                <span key={tool.id} className={cx('rte-tool-wrap', tool.group && i > 0 && 'is-group')}>
                  <button
                    ref={(el) => { toolRefs.current[i] = el }}
                    type="button"
                    className={cx('rte-tool', tool.toggle && state?.[tool.id] && 'is-active')}
                    tabIndex={i === activeTool ? 0 : -1}
                    aria-label={tool.label}
                    title={`${tool.label} (${keyHint(tool.keys)})`}
                    aria-keyshortcuts={ariaKeys(tool.keys)}
                    aria-pressed={tool.toggle ? Boolean(state?.[tool.id]) : undefined}
                    aria-expanded={tool.popover ? linkOpen : undefined}
                    aria-controls={tool.popover && linkOpen ? ids.link : undefined}
                    aria-disabled={unavailable || undefined}
                    disabled={disabled}
                    onMouseDown={(e) => e.preventDefault()}
                    onFocus={() => setActiveTool(i)}
                    onClick={() => runTool(tool)}
                  >
                    <ToolIcon name={tool.id} />
                  </button>
                </span>
              )
            })}
          </div>
  
          {linkOpen && (
            <div
              className="rte-link"
              id={ids.link}
              role="dialog"
              aria-label={state?.link ? 'Edit link' : 'Add a link'}
              onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeLink({ toEditor: false }) } }}
            >
              <label className="sg-label" htmlFor={`${ids.link}-url`}>Web address</label>
              <input
                ref={linkInputRef}
                id={`${ids.link}-url`}
                className="sg-input rte-link-input"
                type="url"
                inputMode="url"
                dir="ltr"
                placeholder="https://"
                value={linkUrl}
                aria-invalid={linkError ? true : undefined}
                aria-describedby={linkError ? `${ids.link}-error` : `${ids.link}-hint`}
                onChange={(e) => { setLinkUrl(e.target.value); setLinkError(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink() } }}
              />
              {linkError ? (
                <p className="sg-field-msg sg-field-error" id={`${ids.link}-error`}><Icon name="alert" size={16} />{linkError}</p>
              ) : (
                <p className="sg-field-msg" id={`${ids.link}-hint`}>Links open in a new tab.</p>
              )}
              <div className="rte-link-actions">
                <Button size="sm" onClick={applyLink}>{state?.link ? 'Update link' : 'Add link'}</Button>
                {state?.link && (
                  <Button size="sm" variant="ghost" onClick={removeLink}>Remove link</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => closeLink({ toEditor: false })}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        <EditorContent editor={editor} id={fid} className="rte-body" />
      </div>

      <div className="rte-foot">
        <p className={cx('rte-count', atLimit && 'is-limit')} id={ids.count}>
          {words} {words === 1 ? 'word' : 'words'} · {maxLength ? `${chars} of ${maxLength} characters` : `${chars} ${chars === 1 ? 'character' : 'characters'}`}
        </p>
        {autosaveKey && (
          <p className="rte-saved" role="status">
            {savedAt ? <><Icon name="check" size={14} />Draft saved · {savedAgo(savedAt, now)}</> : null}
          </p>
        )}
      </div>
      <span className="rte-vh" role="status">{atLimit ? `You’ve reached the ${maxLength} character limit.` : ''}</span>

      {error ? (
        <p className="sg-field-msg sg-field-error" id={ids.msg}><Icon name="alert" size={16} />{error}</p>
      ) : hint ? (
        <p className="sg-field-msg" id={ids.msg}>{hint}</p>
      ) : null}
    </div>
  )
}
