import { Trash2 } from 'lucide-react'

const ACCENT_CLASS = {
  left:  'border-l-2 border-l-rose-300 pl-2',
  right: 'border-l-2 border-l-brand-300 pl-2',
}

/**
 * Text input with an optional hover-reveal delete button.
 * Used by matrix editors for row/column label editing.
 */
export function DeletableTextInput({
  value,
  onChange,
  onDelete,
  canDelete = true,
  placeholder,
  accent,
  blurOnEnter = false,
  inputClassName = 'input-base py-1.5 text-sm flex-1',
  className = '',
}) {
  const handleKeyDown = blurOnEnter
    ? (e) => { if (e.key === 'Enter') e.currentTarget.blur() }
    : undefined

  return (
    <div className={`flex items-center gap-1.5 group ${accent ? ACCENT_CLASS[accent] : ''} ${className}`.trim()}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClassName}
      />
      {canDelete && onDelete && (
        <button
          onClick={onDelete}
          className="p-1.5 text-ink-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}
