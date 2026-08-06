import { Eye, EyeOff, GitBranch } from 'lucide-react'
import { Toggle } from '@/components/ui'
import { ConditionBuilder } from './ConditionBuilder'

/**
 * VisibilityEditor — drop this into any item's expanded editor panel
 * (question, page break, group). `itemId` must point at the item itself;
 * `vis` is `item.visibility`; `availableQuestions` should be every question
 * that appears before this item in the survey flow.
 */
export function VisibilityEditor({ itemId, vis, availableQuestions, contextItems, dispatch }) {
  const conditions = vis?.conditions || []
  const enabled    = vis?.enabled || false
  const mode       = vis?.mode || 'show_if'

  const setMode = (m) =>
    dispatch({ type: 'SET_ITEM_VISIBILITY_MODE', itemId, patch: { mode: m } })

  const setEnabled = (val) =>
    dispatch({ type: 'SET_ITEM_VISIBILITY_MODE', itemId, patch: { enabled: val } })

  return (
    <div className="border border-violet-300 rounded-xl overflow-hidden bg-violet-50/60">
      {/* Header / toggle */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-violet-100/80 border-b border-violet-200/80">
        <div className="flex items-center gap-2">
          <GitBranch size={13} className="text-violet-700" />
          <span className="text-sm font-semibold text-violet-900">Conditional visibility</span>
        </div>
        <Toggle checked={enabled} onChange={setEnabled} />
      </div>

      {enabled && (
        <div className="p-3 space-y-3">
          {/* Mode selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => setMode('show_if')}
              className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                mode === 'show_if' ? 'border-emerald-400 bg-emerald-50' : 'border-ink-200 bg-white hover:border-ink-300'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Eye size={12} className={mode === 'show_if' ? 'text-emerald-600' : 'text-ink-400'} />
                <span className={`text-xs font-bold ${mode === 'show_if' ? 'text-emerald-700' : 'text-ink-600'}`}>Show if</span>
              </div>
              <p className="text-xs text-ink-500 leading-snug">Only visible when conditions match</p>
            </button>
            <button
              onClick={() => setMode('hide_if')}
              className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                mode === 'hide_if' ? 'border-rose-400 bg-rose-50' : 'border-ink-200 bg-white hover:border-ink-300'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <EyeOff size={12} className={mode === 'hide_if' ? 'text-rose-600' : 'text-ink-400'} />
                <span className={`text-xs font-bold ${mode === 'hide_if' ? 'text-rose-700' : 'text-ink-600'}`}>Hide if</span>
              </div>
              <p className="text-xs text-ink-500 leading-snug">Hidden when conditions match</p>
            </button>
          </div>

          <ConditionBuilder
            variant="visibility"
            conditions={conditions}
            availableQuestions={availableQuestions}
            contextItems={contextItems}
            onUpdateCondition={(conditionId, patch) =>
              dispatch({ type: 'UPDATE_VISIBILITY_CONDITION', itemId, conditionId, patch })}
            onDeleteCondition={(conditionId) =>
              dispatch({ type: 'DELETE_VISIBILITY_CONDITION', itemId, conditionId })}
            onAddCondition={() =>
              dispatch({ type: 'ADD_VISIBILITY_CONDITION', itemId })}
            previewLabel={mode === 'hide_if' ? 'Hidden when' : 'Shown only when'}
          />
        </div>
      )}
    </div>
  )
}
