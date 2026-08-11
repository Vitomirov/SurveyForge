import { useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { SectionLabel, Divider, Toggle } from '@/components/ui'
import { makeSemanticRow } from '@/store/surveyStore'

const POINT_OPTIONS = [3, 5, 7]

function RowItem({ row, index, rows, onUpdate, onDelete, canDelete, addRefs }) {
  return (
    <div className="flex items-center gap-2 group">
      <input
        ref={el => { if (addRefs) addRefs.left.current[row.id] = el }}
        type="text"
        value={row.leftLabel}
        onChange={e => onUpdate(row.id, 'leftLabel', e.target.value)}
        placeholder="Negative pole"
        className="input-base py-1.5 text-sm flex-1 text-right"
      />
      <div className="flex gap-1 shrink-0">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="w-5 h-5 rounded-full border-2 border-ink-200 bg-white" />
        ))}
        <div className="w-5 h-5 rounded-full border-2 border-fuchsia-400 bg-fuchsia-400 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white" />
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="w-5 h-5 rounded-full border-2 border-ink-200 bg-white" />
        ))}
      </div>
      <input
        type="text"
        value={row.rightLabel}
        onChange={e => onUpdate(row.id, 'rightLabel', e.target.value)}
        placeholder="Positive pole"
        className="input-base py-1.5 text-sm flex-1"
      />
      {canDelete && (
        <button onClick={() => onDelete(row.id)}
          className="p-1.5 text-ink-300 hover:text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0">
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

export function SemanticDiffEditor({ question, dispatch }) {
  const cfg = question.semanticDiffConfig

  const updateCfg = (patch) =>
    dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { semanticDiffConfig: { ...cfg, ...patch } } })

  const updateRow  = (id, field, val) =>
    updateCfg({ rows: cfg.rows.map(r => r.id === id ? { ...r, [field]: val } : r) })
  const deleteRow  = (id) =>
    updateCfg({ rows: cfg.rows.filter(r => r.id !== id) })
  const addRow = () =>
    updateCfg({ rows: [...cfg.rows, makeSemanticRow()] })

  const midPoint = Math.ceil(cfg.points / 2)

  return (
    <div className="space-y-4">
      {/* Points selector */}
      <div>
        <SectionLabel>Scale points</SectionLabel>
        <div className="flex gap-2">
          {POINT_OPTIONS.map(n => (
            <button key={n} onClick={() => updateCfg({ points: n, defaultValue: null })}
              className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                cfg.points === n ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700' : 'border-ink-200 text-ink-600 hover:border-ink-300'
              }`}
            >
              {n}-point
            </button>
          ))}
        </div>
      </div>

      {/* Default value */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-ink-700">Default (pre-selected) position</label>
          <Toggle size="sm"
            checked={cfg.defaultValue !== null}
            onChange={on => updateCfg({ defaultValue: on ? midPoint : null })}
            label={cfg.defaultValue !== null ? `Position ${cfg.defaultValue}` : 'No default (unselected)'}
          />
        </div>
        {cfg.defaultValue !== null && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-400 w-4 text-center shrink-0">1</span>
            <input type="range" min={1} max={cfg.points} step={1}
              value={cfg.defaultValue}
              onChange={e => updateCfg({ defaultValue: parseInt(e.target.value) })}
              className="flex-1 accent-fuchsia-500" />
            <span className="text-xs text-ink-400 w-4 text-center shrink-0">{cfg.points}</span>
            <span className="text-sm font-bold text-fuchsia-600 w-6 text-center shrink-0">{cfg.defaultValue}</span>
          </div>
        )}
      </div>

      {/* Show numbers toggle */}
      <div className="flex items-center justify-between p-2.5 bg-ink-50 rounded-lg">
        <p className="text-sm font-medium text-ink-700">Show scale numbers</p>
        <Toggle checked={cfg.showNumbers} onChange={val => updateCfg({ showNumbers: val })} />
      </div>

      {/* Instruction */}
      <div>
        <label className="text-xs text-ink-500 mb-1 block">Instruction (optional)</label>
        <input type="text" value={cfg.instruction}
          onChange={e => updateCfg({ instruction: e.target.value })}
          placeholder="For each pair, indicate your position on the scale…"
          className="input-base text-sm" />
      </div>

      <Divider label="Bipolar pairs" />

      {/* Row pairs */}
      <div>
        <p className="text-xs text-ink-400 mb-2">Left label → negative pole · Right label → positive pole</p>
        <div className="space-y-2">
          {cfg.rows.map((row, i) => (
            <RowItem key={row.id} row={row} index={i} rows={cfg.rows}
              onUpdate={updateRow} onDelete={deleteRow}
              canDelete={cfg.rows.length > 1} />
          ))}
        </div>
        <button onClick={addRow}
          className="mt-2 flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium px-2 py-1.5 hover:bg-brand-50 rounded-lg transition-all">
          <Plus size={14} /> Add pair
        </button>
      </div>

      {/* Summary */}
      <div className="p-3 bg-fuchsia-50 border border-fuchsia-100 rounded-xl text-xs text-fuchsia-700">
        <p className="font-semibold mb-1">Summary</p>
        <p>· {cfg.rows.length} bipolar pair{cfg.rows.length !== 1 ? 's' : ''} · {cfg.points}-point scale</p>
        <p>· {cfg.defaultValue !== null ? `Default: position ${cfg.defaultValue}` : 'No default — respondent must interact'}</p>
        <p>· CSV: one value per row as 1–{cfg.points} integer</p>
      </div>
    </div>
  )
}

export default SemanticDiffEditor
