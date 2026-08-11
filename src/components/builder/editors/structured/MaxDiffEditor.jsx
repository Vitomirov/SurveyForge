import { useRef } from 'react'
import { Plus } from 'lucide-react'
import { SectionLabel, Divider, Toggle } from '@/components/ui'
import { EditableListRow } from '@/components/shared'
import { makeMaxDiffItem } from '@/store/surveyStore'

// ─── Recommended trials calculation ───────────────────────────────────────
function recommendedTrials(n, k) {
  if (!n || !k || k >= n) return 1
  return Math.max(3, Math.ceil(2 * n / k))
}

// ─── Main MaxDiffEditor ────────────────────────────────────────────────────
export function MaxDiffEditor({ question, dispatch }) {
  const cfg      = question.maxDiffConfig
  const inputRefs = useRef({})

  const updateCfg = (patch) =>
    dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { maxDiffConfig: { ...cfg, ...patch } } })

  const updateItem = (itemId, text) =>
    updateCfg({ items: cfg.items.map(i => i.id === itemId ? { ...i, text } : i) })

  const deleteItem = (itemId) =>
    updateCfg({ items: cfg.items.filter(i => i.id !== itemId) })

  const bulkReplace = (items) => updateCfg({ items })

  const addItemAfter = (afterId) => {
    const idx  = cfg.items.findIndex(i => i.id === afterId)
    const next = makeMaxDiffItem()
    updateCfg({ items: [...cfg.items.slice(0, idx + 1), next, ...cfg.items.slice(idx + 1)] })
    setTimeout(() => inputRefs.current[next.id]?.focus(), 30)
  }

  const addItem = () => {
    const next = makeMaxDiffItem()
    updateCfg({ items: [...cfg.items, next] })
    setTimeout(() => inputRefs.current[next.id]?.focus(), 30)
  }

  const n = cfg.items.length
  const k = Math.min(cfg.itemsPerTrial, n)
  const autoTrials = recommendedTrials(n, k)
  const displayTrials = cfg.trialsPerRespondent || autoTrials

  return (
    <div className="space-y-4">
      {/* Labels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink-500 mb-1 block font-medium">Best label</label>
          <input type="text" value={cfg.bestLabel} onChange={e => updateCfg({ bestLabel: e.target.value })}
            placeholder="Most Important" className="input-base" />
        </div>
        <div>
          <label className="text-xs text-ink-500 mb-1 block font-medium">Worst label</label>
          <input type="text" value={cfg.worstLabel} onChange={e => updateCfg({ worstLabel: e.target.value })}
            placeholder="Least Important" className="input-base" />
        </div>
      </div>

      {/* Instruction */}
      <div>
        <label className="text-xs text-ink-500 mb-1 block">Trial instruction (optional)</label>
        <input type="text" value={cfg.instruction}
          onChange={e => updateCfg({ instruction: e.target.value })}
          placeholder="From the options shown, select the most and least important..."
          className="input-base text-sm" />
      </div>

      {/* Items */}
      <div>
        <SectionLabel>Items ({n})</SectionLabel>
        <p className="text-xs text-ink-400 mb-2"><strong>Enter</strong> to add next · <strong>Paste lines</strong> to bulk-add</p>
        <div className="space-y-1.5">
          {cfg.items.map((item, i) => (
            <EditableListRow
              key={item.id}
              item={item}
              index={i}
              items={cfg.items}
              onUpdate={updateItem}
              onDelete={deleteItem}
              onAddAfter={addItemAfter}
              onBulkReplace={bulkReplace}
              makeItem={makeMaxDiffItem}
              canDelete={cfg.items.length > 2}
              inputRefs={inputRefs}
              showGrip
              indexSuffix=""
            />
          ))}
        </div>
        <button onClick={addItem}
          className="mt-2 flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium px-2 py-1.5 hover:bg-brand-50 rounded-lg transition-all w-full">
          <Plus size={14} /> Add item
        </button>
      </div>

      <Divider label="Trial Settings" />

      {/* Items per trial */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-ink-700">Items shown per trial</label>
          <span className="text-sm font-bold text-brand-600">{cfg.itemsPerTrial}</span>
        </div>
        <input type="range" min={2} max={Math.min(8, n)} value={cfg.itemsPerTrial}
          onChange={e => updateCfg({ itemsPerTrial: parseInt(e.target.value) })}
          className="w-full accent-brand-600" />
        <div className="flex justify-between text-xs text-ink-400 mt-0.5">
          <span>2 (min)</span><span>{Math.min(8, n)} (max)</span>
        </div>
      </div>

      {/* Number of trials */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-ink-700">Number of trials</label>
          <Toggle
            checked={cfg.trialsPerRespondent !== null}
            onChange={val => updateCfg({ trialsPerRespondent: val ? autoTrials : null })}
            label="Custom"
            size="sm"
          />
        </div>
        {cfg.trialsPerRespondent !== null ? (
          <input type="number" min={1} max={20} value={cfg.trialsPerRespondent}
            onChange={e => updateCfg({ trialsPerRespondent: Math.max(1, parseInt(e.target.value) || 1) })}
            className="input-base w-24" />
        ) : (
          <p className="text-xs text-ink-400 bg-ink-50 rounded-lg px-3 py-2">
            Auto: <strong>{autoTrials} trials</strong> recommended for {n} items at {k} per trial
            (each item appears ~{Math.round(autoTrials * k / n * 10) / 10}× on average)
          </p>
        )}
      </div>

      <div className="flex items-center justify-between p-2.5 bg-ink-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-ink-700">Randomize trial order</p>
          <p className="text-xs text-ink-400">Shuffle items within each trial</p>
        </div>
        <Toggle checked={cfg.randomizeTrials} onChange={val => updateCfg({ randomizeTrials: val })} />
      </div>

      {/* Stats summary */}
      <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-xs text-brand-700 space-y-0.5">
        <p className="font-semibold mb-1">Trial summary</p>
        <p>· {n} total items, {k} per trial, {displayTrials} trial{displayTrials !== 1 ? 's' : ''}</p>
        <p>· Each item appears ≈{Math.round(displayTrials * k / Math.max(n, 1) * 10) / 10} times</p>
        <p>· Respondent makes {displayTrials * 2} total selections ({displayTrials}× best + {displayTrials}× worst)</p>
      </div>
    </div>
  )
}

export default MaxDiffEditor
