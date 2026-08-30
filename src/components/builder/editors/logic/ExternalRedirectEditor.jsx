import { QuestionRuleEditor } from './QuestionRuleEditor'

function MatrixRedirectFields({ rule, question, onChange }) {
  const rows = question.matrixConfig?.rows || []
  const cols = question.matrixConfig?.columns || []

  const toggleMatrixColumn = (optId) => {
    const current = rule.matrixColumnIds || []
    const next = current.includes(optId)
      ? current.filter(id => id !== optId)
      : [...current, optId]
    onChange({ matrixColumnIds: next })
  }

  return (
    <>
      <div>
        <label className="text-xs text-ink-500 mb-1 block">Matrix row</label>
        <select
          value={rule.matrixRowId || ''}
          onChange={e => onChange({ matrixRowId: e.target.value, matrixColumnIds: [] })}
          className="input-base py-1.5 text-xs"
        >
          <option value="">— Select row —</option>
          {rows.map(row => (
            <option key={row.id} value={row.id}>{row.text || '(untitled row)'}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-ink-500 mb-1.5 block">Columns</label>
        <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
          {cols.map(col => {
            const selected = (rule.matrixColumnIds || []).includes(col.id)
            return (
              <label key={col.id} className="flex items-center gap-2 cursor-pointer group py-0.5">
                <div
                  onClick={() => toggleMatrixColumn(col.id)}
                  className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                    selected ? 'border-emerald-600 bg-emerald-600' : 'border-ink-300 group-hover:border-emerald-400'
                  }`}
                >
                  {selected && (
                    <svg viewBox="0 0 10 10" className="w-2 h-2" fill="none">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-ink-700 truncate">{col.text || '(untitled)'}</span>
              </label>
            )
          })}
        </div>
      </div>
    </>
  )
}

export function ExternalRedirectEditor({ question, dispatch, contextItems = [] }) {
  return (
    <QuestionRuleEditor
      purpose="redirect"
      question={question}
      dispatch={dispatch}
      contextItems={contextItems}
      renderMatrixFields={MatrixRedirectFields}
    />
  )
}

export default ExternalRedirectEditor
