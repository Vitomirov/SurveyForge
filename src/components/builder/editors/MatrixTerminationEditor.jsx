import { Plus, Trash2, UserX } from 'lucide-react'
import { SectionLabel } from '@/components/ui'

/**
 * Per-question screen-out rules for matrix grids — row + column targeting.
 */
export function MatrixTerminationEditor({ question, dispatch }) {
  const cfg   = question.matrixConfig || {}
  const rows  = cfg.rows || []
  const cols  = cfg.columns || []
  const rules = question.terminationRules || []
  const logic = question.terminationLogic || 'if_any'

  const setLogic = (val) =>
    dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { terminationLogic: val } })

  const addRule = () =>
    dispatch({
      type: 'ADD_TERMINATION_RULE',
      questionId: question.id,
      ruleType: 'matrix',
      matrixRowId: rows[0]?.id || '',
    })

  const updateRule = (ruleId, patch) =>
    dispatch({ type: 'UPDATE_TERMINATION_RULE', questionId: question.id, ruleId, patch })

  const deleteRule = (ruleId) =>
    dispatch({ type: 'DELETE_TERMINATION_RULE', questionId: question.id, ruleId })

  const toggleCol = (rule, colId) => {
    const next = (rule.matrixColumnIds || []).includes(colId)
      ? rule.matrixColumnIds.filter(id => id !== colId)
      : [...(rule.matrixColumnIds || []), colId]
    updateRule(rule.id, { matrixColumnIds: next })
  }

  return (
    <div className="space-y-3">
      {rules.length > 0 && (
        <div className="flex gap-2 mb-2">
          {[
            { v: 'if_any', label: 'Terminate if ANY rule fires' },
            { v: 'if_none', label: 'Terminate if NONE fire' },
          ].map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setLogic(v)}
              className={`flex-1 text-xs font-medium px-2 py-1.5 rounded-lg border transition-all ${
                logic === v ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-ink-200 text-ink-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {rules.map((rule, ri) => {
        const row = rows.find(r => r.id === rule.matrixRowId)
        const colLabels = (rule.matrixColumnIds || []).map(id =>
          cols.find(c => c.id === id)?.text || '?'
        )
        return (
          <div key={rule.id} className="border border-rose-200 rounded-xl overflow-hidden bg-white">
            <div className="flex items-center gap-2 px-3 py-2 bg-rose-50">
              <UserX size={12} className="text-rose-500 shrink-0" />
              <span className="text-xs font-bold text-rose-600">Rule {ri + 1}</span>
              <span className="text-xs text-rose-400 flex-1 truncate">
                {row?.text || 'Row'} → {colLabels.length ? colLabels.join(', ') : 'no columns'}
              </span>
              <button onClick={() => deleteRule(rule.id)} className="p-1 text-rose-400 hover:text-rose-600">
                <Trash2 size={12} />
              </button>
            </div>
            <div className="px-3 py-3 space-y-2.5">
              <div>
                <label className="text-xs text-ink-500 mb-1 block">Matrix row</label>
                <select
                  value={rule.matrixRowId || ''}
                  onChange={e => updateRule(rule.id, { matrixRowId: e.target.value, matrixColumnIds: [] })}
                  className="input-base py-1.5 text-xs w-full"
                >
                  <option value="">— Select row —</option>
                  {rows.map(r => (
                    <option key={r.id} value={r.id}>{r.text || '(untitled)'}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-500 shrink-0">Fire if</span>
                <div className="flex rounded-lg overflow-hidden border border-ink-200">
                  {[['any', 'ANY column'], ['all', 'ALL columns']].map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => updateRule(rule.id, { matchMode: v })}
                      className={`px-2 py-1 text-xs font-medium ${
                        (rule.matchMode || 'any') === v ? 'bg-ink-800 text-white' : 'bg-white text-ink-500'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {rule.matrixRowId && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {cols.map(col => {
                    const sel = (rule.matrixColumnIds || []).includes(col.id)
                    return (
                      <label key={col.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                        <div
                          onClick={() => toggleCol(rule, col.id)}
                          className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 ${
                            sel ? 'border-rose-500 bg-rose-500' : 'border-ink-300'
                          }`}
                        >
                          {sel && (
                            <svg viewBox="0 0 10 10" className="w-2 h-2" fill="none">
                              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs text-ink-700">{col.text || '(untitled)'}</span>
                      </label>
                    )
                  })}
                </div>
              )}
              <input
                type="text"
                value={rule.note || ''}
                onChange={e => updateRule(rule.id, { note: e.target.value })}
                placeholder="Internal note (optional)…"
                className="w-full text-xs border border-ink-100 rounded-lg px-2 py-1 bg-ink-50"
              />
            </div>
          </div>
        )
      })}

      {rules.length === 0 && (
        <p className="text-xs text-ink-400 italic">No screen-out rules — add one to terminate based on a row/column selection.</p>
      )}

      <button
        onClick={addRule}
        disabled={!rows.length || !cols.length}
        className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium px-3 py-1.5 border border-rose-200 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-40"
      >
        <Plus size={12} /> Matrix screen-out rule
      </button>
    </div>
  )
}

export default MatrixTerminationEditor
