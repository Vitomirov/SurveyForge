import { Plus } from 'lucide-react'
import { Toggle, SectionLabel, Divider } from '@/components/ui'
import { DeletableTextInput } from '@/components/shared'
import { MatrixTerminationEditor } from './MatrixTerminationEditor'

// ── Preview grid ─────────────────────────────────────────────────────────────
function MatrixPreview({ rows, columns, subType }) {
  if (!rows.length || !columns.length) return null
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left px-2 py-1.5 text-ink-400 font-medium min-w-[100px]" />
            {columns.map(col => (
              <th key={col.id} className="px-2 py-1.5 text-center text-ink-600 font-medium border-b border-ink-100">
                {col.text || '—'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.id} className={ri % 2 === 0 ? 'bg-ink-50/50' : ''}>
              <td className="px-2 py-2 text-ink-700 font-medium text-left">{row.text || '—'}</td>
              {columns.map(col => (
                <td key={col.id} className="px-2 py-2 text-center">
                  {subType === 'single'
                    ? <div className="w-3.5 h-3.5 rounded-full border-2 border-ink-300 mx-auto" />
                    : <div className="w-3.5 h-3.5 rounded border-2 border-ink-300 mx-auto" />
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MatrixEditor({ question, dispatch }) {
  const cfg = question.matrixConfig

  const updateCfg = (patch) =>
    dispatch({ type: 'UPDATE_MATRIX_CONFIG', questionId: question.id, configKey: 'matrixConfig', patch })

  const addRow = () =>
    dispatch({ type: 'ADD_MATRIX_ROW', questionId: question.id, configKey: 'matrixConfig' })

  const addCol = () =>
    dispatch({ type: 'ADD_MATRIX_COL', questionId: question.id, configKey: 'matrixConfig' })

  const updateRow = (rowId, text) =>
    dispatch({ type: 'UPDATE_MATRIX_ROW', questionId: question.id, configKey: 'matrixConfig', rowId, text })

  const updateCol = (colId, text) =>
    dispatch({ type: 'UPDATE_MATRIX_COL', questionId: question.id, configKey: 'matrixConfig', colId, text })

  const deleteRow = (rowId) =>
    dispatch({ type: 'DELETE_MATRIX_ROW', questionId: question.id, configKey: 'matrixConfig', rowId })

  const deleteCol = (colId) =>
    dispatch({ type: 'DELETE_MATRIX_COL', questionId: question.id, configKey: 'matrixConfig', colId })

  return (
    <div className="space-y-4">
      {/* Sub-type */}
      <div>
        <SectionLabel>Selection type per row</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { key: 'single', title: 'Single select', desc: 'One choice per row (radio)' },
            { key: 'multi',  title: 'Multi select',  desc: 'Multiple per row (checkbox)' },
          ].map(({ key, title, desc }) => (
            <button
              key={key}
              onClick={() => updateCfg({ subType: key })}
              className={`p-2.5 rounded-lg border text-sm text-left transition-all ${
                cfg.subType === key
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-ink-200 text-ink-500 hover:border-ink-300'
              }`}
            >
              <div className="font-semibold">{title}</div>
              <div className="text-xs opacity-70 mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div>
        <SectionLabel>Rows (statements / items)</SectionLabel>
        <div className="space-y-1.5">
          {cfg.rows.map((row, i) => (
            <DeletableTextInput
              key={row.id}
              value={row.text}
              onChange={text => updateRow(row.id, text)}
              onDelete={() => deleteRow(row.id)}
              canDelete={cfg.rows.length > 1}
              placeholder={`Row ${i + 1}`}
              blurOnEnter
            />
          ))}
        </div>
        <button onClick={addRow} className="mt-2 flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium px-2 py-1 hover:bg-brand-50 rounded-lg transition-all">
          <Plus size={14} /> Add row
        </button>
      </div>

      {/* Columns */}
      <div>
        <SectionLabel>Columns (scale points)</SectionLabel>
        <div className="space-y-1.5">
          {cfg.columns.map((col, i) => (
            <DeletableTextInput
              key={col.id}
              value={col.text}
              onChange={text => updateCol(col.id, text)}
              onDelete={() => deleteCol(col.id)}
              canDelete={cfg.columns.length > 1}
              placeholder={`Column ${i + 1}`}
              blurOnEnter
            />
          ))}
        </div>
        <button onClick={addCol} className="mt-2 flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium px-2 py-1 hover:bg-brand-50 rounded-lg transition-all">
          <Plus size={14} /> Add column
        </button>
      </div>

      {/* Options */}
      <div className="flex items-center justify-between p-2.5 bg-ink-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-ink-700">Randomize rows</p>
          <p className="text-xs text-ink-400">Shuffle row order for each respondent</p>
        </div>
        <Toggle checked={cfg.randomizeRows || false} onChange={val => updateCfg({ randomizeRows: val })} />
      </div>
      {cfg.randomizeRows && (
        <p className="text-xs text-ink-400 -mt-2">
          Row order is shuffled for each respondent in preview and live surveys (builder list stays in your order).
        </p>
      )}

      {/* Preview */}
      <Divider label="Preview" />
      <div className="rounded-lg border border-dashed border-ink-200 p-3 bg-ink-50">
        <MatrixPreview rows={cfg.rows} columns={cfg.columns} subType={cfg.subType} />
      </div>

      <Divider label="Screen-out Rules" />
      <MatrixTerminationEditor question={question} dispatch={dispatch} />
    </div>
  )
}

export default MatrixEditor
