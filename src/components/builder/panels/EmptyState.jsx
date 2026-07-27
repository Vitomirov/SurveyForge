import { Plus, Layers } from 'lucide-react'

export function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
        <Layers size={28} className="text-brand-400" />
      </div>
      <h3 className="text-base font-semibold text-ink-700 mb-1">No questions yet</h3>
      <p className="text-sm text-ink-400 mb-6 max-w-xs">
        Add your first question from the panel on the right.
      </p>
      <button onClick={() => onAdd('single_select')} className="btn-primary">
        <Plus size={15} /> Add first question
      </button>
    </div>
  )
}
