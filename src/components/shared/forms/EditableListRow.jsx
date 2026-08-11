import { Trash2, GripVertical } from 'lucide-react'

/**
 * Single editable list row with Enter-to-add, Backspace-to-delete, and
 * multi-line paste-to-bulk-add. Used by ranking, constant-sum, textbox-list,
 * maxdiff, and card-sort editors.
 */
export function EditableListRow({
  item,
  index,
  items,
  valueField = 'text',
  onUpdate,
  onDelete,
  onAddAfter,
  onBulkReplace,
  makeItem,
  canDelete,
  inputRefs,
  showGrip = false,
  indexSuffix = '.',
  placeholder,
  trailing,
  inputClassName = 'input-base py-1.5 text-sm flex-1',
}) {
  const value = item[valueField] ?? ''

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onAddAfter(item.id)
    }
    if (e.key === 'Backspace' && !value && canDelete) {
      e.preventDefault()
      onDelete(item.id)
      const idx = items.findIndex(i => i.id === item.id)
      if (idx > 0) {
        setTimeout(() => inputRefs.current[items[idx - 1].id]?.focus(), 30)
      }
    }
  }

  const handlePaste = (e) => {
    const lines = e.clipboardData.getData('text').split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length <= 1) return

    e.preventDefault()
    onUpdate(item.id, lines[0])

    const newItems = lines.slice(1).map(t => makeItem(t))
    const idx = items.findIndex(i => i.id === item.id)
    onBulkReplace([...items.slice(0, idx + 1), ...newItems, ...items.slice(idx + 1)])

    setTimeout(() => inputRefs.current[newItems[newItems.length - 1].id]?.focus(), 30)
  }

  return (
    <div className="flex items-center gap-2 group">
      {showGrip && (
        <div className="text-ink-200 group-hover:text-ink-400 cursor-grab p-0.5">
          <GripVertical size={14} />
        </div>
      )}
      <span className="text-xs text-ink-400 font-mono w-5 text-right shrink-0">
        {index + 1}{indexSuffix}
      </span>
      <input
        ref={el => { inputRefs.current[item.id] = el }}
        type="text"
        value={value}
        onChange={e => onUpdate(item.id, e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder ?? `Item ${index + 1}`}
        className={inputClassName}
      />
      {trailing}
      {canDelete && (
        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 text-ink-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}
