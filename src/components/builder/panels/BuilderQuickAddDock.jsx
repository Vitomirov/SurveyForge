import { Plus, Scissors, FileText, Layers } from 'lucide-react'

export function BuilderQuickAddDock({ dispatch, onOpenMore }) {
  return (
    <div
      role="toolbar"
      aria-label="Add survey content"
      className="card p-1 flex items-stretch divide-x divide-ink-100 shadow-md shadow-ink-900/[0.06]"
    >
      <button
        onClick={() => dispatch({ type: 'ADD_QUESTION', qtype: 'single_select' })}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium text-ink-700 hover:bg-brand-50 hover:text-brand-700 transition-colors focus-ring min-h-[44px] lg:min-h-0"
      >
        <Plus size={15} className="text-brand-600 shrink-0" />
        <span className="truncate">Question</span>
      </button>
      <button
        onClick={() => dispatch({ type: 'ADD_PAGE_BREAK' })}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors focus-ring min-h-[44px] lg:min-h-0"
      >
        <Scissors size={15} className="text-ink-400 shrink-0" />
        <span className="truncate hidden sm:inline">Page break</span>
        <span className="truncate sm:hidden">Page</span>
      </button>
      <button
        onClick={() => dispatch({ type: 'ADD_TEXT_BLOCK' })}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium text-ink-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors focus-ring min-h-[44px] lg:min-h-0"
      >
        <FileText size={15} className="text-emerald-500 shrink-0" />
        <span className="truncate hidden sm:inline">Text / Media</span>
        <span className="truncate sm:hidden">Text</span>
      </button>
      <button
        onClick={onOpenMore}
        className="lg:hidden flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium text-ink-500 hover:bg-ink-50 hover:text-ink-800 transition-colors focus-ring min-h-[44px] shrink-0"
        title="More question types and structure"
      >
        <Layers size={15} />
      </button>
    </div>
  )
}
