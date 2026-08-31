import { useEffect, useState } from 'react'
import { ClipboardPaste } from 'lucide-react'
import { Modal } from '@/components/ui'

/**
 * Bulk-paste modal: textarea + optional "remove existing" checkbox.
 * Used by cascade dropdown and other list-based editors.
 */
export function PasteOptionsModal({
  open,
  title = 'Paste in options',
  subtitle,
  placeholder = 'Paste options here — one per line',
  replaceLabel = 'Remove existing options',
  showReplaceCheckbox = true,
  onClose,
  onApply,
}) {
  const [text, setText] = useState('')
  const [replaceExisting, setReplaceExisting] = useState(false)

  useEffect(() => {
    if (open) {
      setText('')
      setReplaceExisting(false)
    }
  }, [open])

  if (!open) return null

  const handleApply = () => {
    onApply(text, replaceExisting)
    onClose()
  }

  return (
    <Modal
      icon={ClipboardPaste}
      iconClass="bg-brand-600"
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      maxWidth="max-w-md"
      footer={(
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!text.trim()}
            className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    >
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder}
        rows={10}
        autoFocus
        className="input-base text-sm w-full resize-y min-h-[160px] font-mono"
      />
      {showReplaceCheckbox && (
        <label className="flex items-center gap-2 mt-3 text-sm text-ink-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={replaceExisting}
            onChange={e => setReplaceExisting(e.target.checked)}
            className="rounded border-ink-300 text-brand-600 focus:ring-brand-400"
          />
          {replaceLabel}
        </label>
      )}
    </Modal>
  )
}

export default PasteOptionsModal
