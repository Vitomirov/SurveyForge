import { Trash2, GripVertical, ChevronDown, ChevronRight, Layers, GitBranch, Settings2 } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { VisibilityEditor } from './VisibilityEditor.jsx'
import { visibilitySummary } from '../utils/visibilityEngine.js'

export function GroupItem({ item, questionCount, dispatch, isActive, onActivate, availableQuestions = [] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  const toggleCollapse = () =>
    dispatch({ type: 'UPDATE_ITEM', id: item.id, patch: { collapsed: !item.collapsed } })

  const visEnabled = item.visibility?.enabled
  const summary    = visEnabled ? visibilitySummary(item.visibility, availableQuestions) : null

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2 px-3 py-2.5 bg-ink-800 rounded-xl group">
        {/* Drag handle */}
        <div {...attributes} {...listeners} className="drag-handle text-ink-500 hover:text-ink-300 transition-colors">
          <GripVertical size={15} />
        </div>

        {/* Collapse toggle (builder-only display collapse) */}
        <button
          onClick={toggleCollapse}
          title="Collapse/expand in builder"
          className="text-ink-400 hover:text-white transition-colors"
        >
          {item.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>

        <Layers size={14} className="text-ink-400" />

        {/* Group title */}
        <input
          type="text"
          value={item.title || ''}
          onChange={e => dispatch({ type: 'UPDATE_ITEM', id: item.id, patch: { title: e.target.value } })}
          placeholder="Group name..."
          className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-white placeholder:text-ink-500"
          onClick={e => e.stopPropagation()}
        />

        {/* Conditional badge */}
        {visEnabled && (
          <span className="flex items-center gap-0.5 text-xs font-semibold text-violet-300 bg-violet-900/60 px-1.5 py-0.5 rounded-full shrink-0">
            <GitBranch size={9} /> Conditional
          </span>
        )}

        {/* Question count badge */}
        <span className="text-xs text-ink-500 bg-ink-700 px-2 py-0.5 rounded-full shrink-0">
          {questionCount} question{questionCount !== 1 ? 's' : ''}
          {item.collapsed ? ' (hidden)' : ''}
        </span>

        {/* Visibility settings toggle */}
        <button
          onClick={onActivate}
          title="Conditional visibility settings"
          className={`p-1.5 rounded-lg transition-all shrink-0 ${
            isActive ? 'text-violet-300 bg-violet-900/60' : 'text-ink-500 hover:text-violet-300 hover:bg-ink-700'
          }`}
        >
          <Settings2 size={13} />
        </button>

        {/* Delete */}
        <button
          onClick={() => dispatch({ type: 'DELETE_ITEM', id: item.id })}
          className="p-1.5 text-ink-500 hover:text-rose-400 hover:bg-ink-700 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
          title="Remove group (questions stay)"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Expanded visibility settings */}
      {isActive && (
        <div className="mt-1.5 mb-1">
          {summary && (
            <p className="text-xs text-violet-500 italic mb-1.5 px-1">{summary}</p>
          )}
          <VisibilityEditor
            itemId={item.id}
            vis={item.visibility}
            availableQuestions={availableQuestions}
            dispatch={dispatch}
          />
        </div>
      )}
    </div>
  )
}
