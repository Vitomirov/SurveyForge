import { useRef, useEffect, useState } from 'react'
import {
  Bold, Italic, Underline, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Eraser,
} from 'lucide-react'

function ToolBtn({ icon: Icon, onClick, title, active }) {
  return (
    <button
      type="button"
      // Prevent the contentEditable from losing its text selection before
      // the click handler fires — without this, Bold/Italic etc. would
      // apply to nothing because focus already moved to the button.
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active ? 'bg-brand-100 text-brand-700' : 'text-ink-500 hover:text-ink-800 hover:bg-ink-200'
      }`}
    >
      <Icon size={13} />
    </button>
  )
}

/**
 * Lightweight rich text editor for short content (survey descriptions, etc).
 * Renders an editable HTML string. Deliberately uncontrolled after mount —
 * we never re-apply `value` to the DOM via React rendering, only via an
 * explicit imperative sync when the value changes from OUTSIDE this editor
 * (e.g. programmatic reset) and the editor isn't currently focused. This
 * avoids the classic contentEditable+React cursor-jump-to-start bug.
 */
export function RichTextEditor({ value, onChange, placeholder = 'Start typing…' }) {
  const editorRef        = useRef(null)
  const lastEmittedRef    = useRef(value || '')
  const [initialHtml]     = useState(value || '') // frozen at mount on purpose
  const [isEmpty, setIsEmpty] = useState(!value || value === '<br>')

  // Sync external value changes (not ones that originated from typing here)
  useEffect(() => {
    if (!editorRef.current) return
    if (value !== lastEmittedRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = value || ''
      lastEmittedRef.current = value || ''
      setIsEmpty(!value || value === '<br>')
    }
  }, [value])

  const emit = () => {
    const html = editorRef.current?.innerHTML || ''
    lastEmittedRef.current = html
    setIsEmpty(!html || html === '<br>')
    onChange(html)
  }

  const exec = (cmd, arg) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, arg)
    emit()
  }

  const clearFormatting = () => {
    editorRef.current?.focus()
    document.execCommand('removeFormat')
    document.execCommand('formatBlock', false, 'div')
    emit()
  }

  return (
    <div className="border border-ink-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-400 transition-all bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 bg-ink-50 border-b border-ink-200">
        <ToolBtn icon={Bold}      onClick={() => exec('bold')}      title="Bold" />
        <ToolBtn icon={Italic}    onClick={() => exec('italic')}    title="Italic" />
        <ToolBtn icon={Underline} onClick={() => exec('underline')} title="Underline" />
        <div className="w-px h-4 bg-ink-200 mx-1" />
        <ToolBtn icon={List}        onClick={() => exec('insertUnorderedList')} title="Bullet list" />
        <ToolBtn icon={ListOrdered} onClick={() => exec('insertOrderedList')}  title="Numbered list" />
        <div className="w-px h-4 bg-ink-200 mx-1" />
        <ToolBtn icon={AlignLeft}   onClick={() => exec('justifyLeft')}   title="Align left" />
        <ToolBtn icon={AlignCenter} onClick={() => exec('justifyCenter')} title="Align center" />
        <ToolBtn icon={AlignRight}  onClick={() => exec('justifyRight')}  title="Align right" />
        <div className="w-px h-4 bg-ink-200 mx-1" />
        <ToolBtn icon={Eraser} onClick={clearFormatting} title="Clear formatting" />
      </div>

      {/* Editable area */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          className="rte-content min-h-[72px] max-h-64 overflow-y-auto px-3 py-2.5 text-sm text-ink-700 outline-none"
          dangerouslySetInnerHTML={{ __html: initialHtml }}
        />
        {isEmpty && (
          <span className="absolute top-2.5 left-3 text-sm text-ink-300 pointer-events-none select-none">
            {placeholder}
          </span>
        )}
      </div>
    </div>
  )
}
