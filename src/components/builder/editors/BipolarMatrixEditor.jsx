import { Plus } from 'lucide-react'
import { Toggle, SectionLabel, Divider } from '@/components/ui'
import { DeletableTextInput } from '@/components/shared'

// Preview grid for bipolar matrix
function BipolarPreview({ cfg }) {
  const { rows, leftColumns, rightColumns, showCenter, centerLabel, leftLabel, rightLabel, leftSelectType, rightSelectType } = cfg
  if (!rows.length) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          {/* Side labels */}
          <tr>
            <th />
            <th colSpan={leftColumns.length} className="text-center text-rose-600 font-semibold py-1 bg-rose-50 rounded-tl-lg">
              {leftLabel || 'Left'} <span className="text-rose-400 font-normal">({leftSelectType})</span>
            </th>
            {showCenter && <th className="bg-ink-100 text-ink-500 font-medium px-2">{centerLabel}</th>}
            <th colSpan={rightColumns.length} className="text-center text-brand-600 font-semibold py-1 bg-brand-50 rounded-tr-lg">
              {rightLabel || 'Right'} <span className="text-brand-400 font-normal">({rightSelectType})</span>
            </th>
          </tr>
          {/* Column labels */}
          <tr>
            <th className="text-left px-2 py-1.5 min-w-[80px]" />
            {leftColumns.map(col => (
              <th key={col.id} className="px-1.5 py-1.5 text-center text-ink-600 font-medium border-b border-rose-100 bg-rose-50/40">
                {col.text || '—'}
              </th>
            ))}
            {showCenter && (
              <th className="px-1.5 py-1.5 text-center text-ink-400 font-medium border-b border-ink-200 bg-ink-50">
                {centerLabel || '—'}
              </th>
            )}
            {rightColumns.map(col => (
              <th key={col.id} className="px-1.5 py-1.5 text-center text-ink-600 font-medium border-b border-brand-100 bg-brand-50/40">
                {col.text || '—'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.id} className={ri % 2 === 0 ? 'bg-white' : 'bg-ink-50/40'}>
              <td className="px-2 py-2 text-ink-700 font-medium">{row.text || '—'}</td>
              {leftColumns.map(col => (
                <td key={col.id} className="px-1.5 py-2 text-center bg-rose-50/20">
                  {leftSelectType === 'single'
                    ? <div className="w-3.5 h-3.5 rounded-full border-2 border-rose-300 mx-auto" />
                    : <div className="w-3.5 h-3.5 rounded border-2 border-rose-300 mx-auto" />
                  }
                </td>
              ))}
              {showCenter && (
                <td className="px-1.5 py-2 text-center bg-ink-50">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-ink-300 mx-auto" />
                </td>
              )}
              {rightColumns.map(col => (
                <td key={col.id} className="px-1.5 py-2 text-center bg-brand-50/20">
                  {rightSelectType === 'single'
                    ? <div className="w-3.5 h-3.5 rounded-full border-2 border-brand-300 mx-auto" />
                    : <div className="w-3.5 h-3.5 rounded border-2 border-brand-300 mx-auto" />
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

export function BipolarMatrixEditor({ question, dispatch }) {
  const cfg = question.bipolarConfig

  const updateCfg = (patch) =>
    dispatch({ type: 'UPDATE_MATRIX_CONFIG', questionId: question.id, configKey: 'bipolarConfig', patch })

  const addRow = () =>
    dispatch({ type: 'ADD_MATRIX_ROW', questionId: question.id, configKey: 'bipolarConfig' })

  const addLeftCol = () =>
    dispatch({ type: 'ADD_MATRIX_COL', questionId: question.id, configKey: 'bipolarConfig', colKey: 'leftColumns' })

  const addRightCol = () =>
    dispatch({ type: 'ADD_MATRIX_COL', questionId: question.id, configKey: 'bipolarConfig', colKey: 'rightColumns' })

  const updateRow = (rowId, text) =>
    dispatch({ type: 'UPDATE_MATRIX_ROW', questionId: question.id, configKey: 'bipolarConfig', rowId, text })

  const updateLeftCol = (colId, text) =>
    dispatch({ type: 'UPDATE_MATRIX_COL', questionId: question.id, configKey: 'bipolarConfig', colKey: 'leftColumns', colId, text })

  const updateRightCol = (colId, text) =>
    dispatch({ type: 'UPDATE_MATRIX_COL', questionId: question.id, configKey: 'bipolarConfig', colKey: 'rightColumns', colId, text })

  const deleteRow = (rowId) =>
    dispatch({ type: 'DELETE_MATRIX_ROW', questionId: question.id, configKey: 'bipolarConfig', rowId })

  const deleteLeftCol = (colId) =>
    dispatch({ type: 'DELETE_MATRIX_COL', questionId: question.id, configKey: 'bipolarConfig', colKey: 'leftColumns', colId })

  const deleteRightCol = (colId) =>
    dispatch({ type: 'DELETE_MATRIX_COL', questionId: question.id, configKey: 'bipolarConfig', colKey: 'rightColumns', colId })

  const SelectTypeBtn = ({ side, value }) => (
    <div className="flex gap-1.5 mt-1">
      {['single', 'multi'].map(v => (
        <button
          key={v}
          onClick={() => updateCfg({ [side]: v })}
          className={`flex-1 py-1 rounded text-xs font-medium transition-all ${
            value === v
              ? (side === 'leftSelectType' ? 'bg-rose-100 text-rose-700' : 'bg-brand-100 text-brand-700')
              : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
          }`}
        >
          {v === 'single' ? '◉ Single' : '☑ Multi'}
        </button>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Labels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-rose-500 mb-1 block">Left side label</label>
          <input
            type="text" value={cfg.leftLabel || ''} onChange={e => updateCfg({ leftLabel: e.target.value })}
            placeholder="e.g. Negative" className="input-base border-rose-200 focus:ring-rose-400"
          />
          <p className="text-xs text-ink-400 mt-1">Selection type:</p>
          <SelectTypeBtn side="leftSelectType" value={cfg.leftSelectType} />
        </div>
        <div>
          <label className="text-xs font-semibold text-brand-500 mb-1 block">Right side label</label>
          <input
            type="text" value={cfg.rightLabel || ''} onChange={e => updateCfg({ rightLabel: e.target.value })}
            placeholder="e.g. Positive" className="input-base border-brand-200 focus:ring-brand-400"
          />
          <p className="text-xs text-ink-400 mt-1">Selection type:</p>
          <SelectTypeBtn side="rightSelectType" value={cfg.rightSelectType} />
        </div>
      </div>

      {/* Center column */}
      <div className="flex items-center justify-between p-2.5 bg-ink-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-ink-700">Center column</p>
          <p className="text-xs text-ink-400">Neutral midpoint (single select)</p>
        </div>
        <Toggle checked={cfg.showCenter} onChange={val => updateCfg({ showCenter: val })} />
      </div>
      {cfg.showCenter && (
        <div>
          <label className="text-xs text-ink-500 mb-1 block">Center column label</label>
          <input
            type="text" value={cfg.centerLabel || ''} onChange={e => updateCfg({ centerLabel: e.target.value })}
            placeholder="e.g. Neutral" className="input-base"
          />
        </div>
      )}

      {/* Rows */}
      <div>
        <SectionLabel>Rows</SectionLabel>
        <div className="space-y-1.5">
          {cfg.rows.map((row, i) => (
            <DeletableTextInput
              key={row.id}
              value={row.text}
              onChange={t => updateRow(row.id, t)}
              onDelete={() => deleteRow(row.id)}
              canDelete={cfg.rows.length > 1}
              placeholder={`Item ${i + 1}`}
            />
          ))}
        </div>
        <button onClick={addRow} className="mt-2 flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium px-2 py-1 hover:bg-brand-50 rounded-lg transition-all">
          <Plus size={14} /> Add row
        </button>
      </div>

      {/* Columns side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Left columns */}
        <div>
          <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-2">Left columns</p>
          <div className="space-y-1.5">
            {cfg.leftColumns.map((col, i) => (
              <DeletableTextInput
                key={col.id}
                value={col.text}
                onChange={t => updateLeftCol(col.id, t)}
                onDelete={() => deleteLeftCol(col.id)}
                canDelete={cfg.leftColumns.length > 1}
                placeholder={`L${i + 1}`}
                accent="left"
              />
            ))}
          </div>
          <button onClick={addLeftCol} className="mt-2 flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 font-medium px-2 py-1 hover:bg-rose-50 rounded-lg transition-all">
            <Plus size={12} /> Add
          </button>
        </div>

        {/* Right columns */}
        <div>
          <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-2">Right columns</p>
          <div className="space-y-1.5">
            {cfg.rightColumns.map((col, i) => (
              <DeletableTextInput
                key={col.id}
                value={col.text}
                onChange={t => updateRightCol(col.id, t)}
                onDelete={() => deleteRightCol(col.id)}
                canDelete={cfg.rightColumns.length > 1}
                placeholder={`R${i + 1}`}
                accent="right"
              />
            ))}
          </div>
          <button onClick={addRightCol} className="mt-2 flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 font-medium px-2 py-1 hover:bg-brand-50 rounded-lg transition-all">
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* Preview */}
      <Divider label="Preview" />
      <div className="rounded-lg border border-dashed border-ink-200 p-3 bg-ink-50 overflow-x-auto">
        <BipolarPreview cfg={cfg} />
      </div>
    </div>
  )
}
