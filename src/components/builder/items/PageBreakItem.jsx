import { memo } from 'react'
import { Trash2, GripVertical, FileText, GitBranch, ChevronDown } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { VisibilityEditor } from '@/components/shared'
import { visibilitySummary } from '@/utils/visibilityEngine'

export const PageBreakItem = memo(function PageBreakItem({
  item, pageNumber, dispatch, isActive, onActivateItem, availableQuestions = [], contextItems = [],
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  const visEnabled = item.visibility?.enabled
  const summary    = visEnabled ? visibilitySummary(item.visibility, availableQuestions) : null

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-3 py-1 group">
        {/* Drag handle */}
        <div {...attributes} {...listeners} className="drag-handle text-ink-200 hover:text-ink-400 transition-colors">
          <GripVertical size={15} />
        </div>

        {/* Left line */}
        <div className="flex-1 border-t-2 border-dashed border-ink-200" />

        {/* Page break badge */}
        <button
          onClick={() => onActivateItem(item.id)}
          className={`flex items-center gap-2 px-3 py-1.5 bg-white border rounded-full shadow-sm transition-all ${
            isActive ? 'border-violet-400 ring-2 ring-violet-100' : 'border-ink-200'
          }`}
        >
          <FileText size={12} className="text-ink-400" />
          <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
            Page {pageNumber}
          </span>
          <div className="w-px h-3 bg-ink-200" />
          <input
            type="text"
            value={item.title || ''}
            onChange={e => dispatch({ type: 'UPDATE_ITEM', id: item.id, patch: { title: e.target.value } })}
            placeholder="Page title (optional)"
            className="text-xs text-ink-500 bg-transparent border-none outline-none w-28 placeholder:text-ink-300"
            onClick={e => e.stopPropagation()}
          />
          {visEnabled && (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">
              <GitBranch size={9} /> Conditional
            </span>
          )}
          <ChevronDown size={12} className={`text-ink-300 transition-transform ${isActive ? 'rotate-180' : ''}`} />
        </button>

        {/* Right line */}
        <div className="flex-1 border-t-2 border-dashed border-ink-200" />

        {/* Delete */}
        <button
          onClick={() => dispatch({ type: 'DELETE_ITEM', id: item.id })}
          className="p-1.5 text-ink-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
          title="Remove page break"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Expanded visibility settings */}
      {isActive && (
        <div className="ml-8 mr-8 mb-2 mt-1">
          {summary && (
            <p className="text-xs text-violet-800 italic mb-1.5 px-1">{summary}</p>
          )}
          <VisibilityEditor
            itemId={item.id}
            vis={item.visibility}
            availableQuestions={availableQuestions}
            contextItems={contextItems}
            dispatch={dispatch}
          />
        </div>
      )}
    </div>
  )
})
