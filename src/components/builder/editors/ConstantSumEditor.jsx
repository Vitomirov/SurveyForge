import { useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { SectionLabel, Divider, Toggle } from '@/components/ui'
import { makeConstantSumItem } from '@/store/surveyStore'

// ─── Item row — label input with Enter / Backspace / paste ────────────────
function ItemRow({ item, index, items, onUpdate, onDelete, onAddAfter, onBulkReplace, canDelete, inputRefs }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onAddAfter(item.id)
    }
    if (e.key === 'Backspace' && !item.label && canDelete) {
      e.preventDefault()
      onDelete(item.id)
      const idx = items.findIndex(i => i.id === item.id)
      if (idx > 0) setTimeout(() => inputRefs.current[items[idx - 1].id]?.focus(), 30)
    }
  }

  const handlePaste = (e) => {
    const raw   = e.clipboardData.getData('text')
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length <= 1) return
    e.preventDefault()
    onUpdate(item.id, lines[0])
    const newItems  = lines.slice(1).map(t => makeConstantSumItem(t))
    const idx       = items.findIndex(i => i.id === item.id)
    const merged    = [...items.slice(0, idx + 1), ...newItems, ...items.slice(idx + 1)]
    onBulkReplace(merged)
    setTimeout(() => inputRefs.current[newItems[newItems.length - 1].id]?.focus(), 30)
  }

  return (
    <div className="flex items-center gap-2 group">
      <span className="text-xs text-ink-400 w-5 text-right shrink-0">{index + 1}.</span>
      <input
        ref={el => { inputRefs.current[item.id] = el }}
        type="text"
        value={item.label}
        onChange={e => onUpdate(item.id, e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={`Item ${index + 1}`}
        className="input-base py-1.5 text-sm flex-1"
      />
      {canDelete && (
        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 text-ink-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

// ─── Main ConstantSumEditor ────────────────────────────────────────────────
export function ConstantSumEditor({ question, dispatch }) {
  const cfg      = question.constantSumConfig
  const inputRefs = useRef({})

  const updateCfg = (patch) =>
    dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { constantSumConfig: { ...cfg, ...patch } } })

  const updateItem   = (id, label) => updateCfg({ items: cfg.items.map(i => i.id === id ? { ...i, label } : i) })
  const deleteItem   = (id)        => updateCfg({ items: cfg.items.filter(i => i.id !== id) })
  const bulkReplace  = (items)     => updateCfg({ items })

  const addItemAfter = (afterId) => {
    const idx  = cfg.items.findIndex(i => i.id === afterId)
    const next = makeConstantSumItem()
    updateCfg({ items: [...cfg.items.slice(0, idx + 1), next, ...cfg.items.slice(idx + 1)] })
    setTimeout(() => inputRefs.current[next.id]?.focus(), 30)
  }

  const addItem = () => {
    const next = makeConstantSumItem()
    updateCfg({ items: [...cfg.items, next] })
    setTimeout(() => inputRefs.current[next.id]?.focus(), 30)
  }

  const perItemShare = cfg.items.length > 0
    ? Math.round((cfg.targetSum / cfg.items.length) * 10) / 10
    : 0

  return (
    <div className="space-y-4">
      {/* Target sum + unit row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-ink-500 mb-1 block">Target total</label>
          <input
            type="number"
            min={1}
            value={cfg.targetSum}
            onChange={e => updateCfg({ targetSum: parseFloat(e.target.value) || 100 })}
            className="input-base font-mono text-lg font-bold text-brand-700"
          />
          <p className="text-xs text-ink-400 mt-1">Respondent's values must sum exactly to this</p>
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-500 mb-1 block">Unit label (optional)</label>
          <input
            type="text"
            value={cfg.unit}
            onChange={e => updateCfg({ unit: e.target.value })}
            placeholder="%, points, hrs…"
            className="input-base"
          />
          <p className="text-xs text-ink-400 mt-1">Shown after each input field</p>
        </div>
      </div>

      {/* Instruction */}
      <div>
        <label className="text-xs text-ink-500 mb-1 block">Instruction (optional)</label>
        <input
          type="text"
          value={cfg.instruction}
          onChange={e => updateCfg({ instruction: e.target.value })}
          placeholder={`Enter values that total ${cfg.targetSum}${cfg.unit ? ' ' + cfg.unit : ''}…`}
          className="input-base text-sm"
        />
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <SectionLabel>Fields ({cfg.items.length})</SectionLabel>
          <span className="text-xs text-ink-400">Equal share ≈ {perItemShare}{cfg.unit}</span>
        </div>
        <p className="text-xs text-ink-400 mb-2">
          <strong>Enter</strong> to add next · <strong>Paste lines</strong> to bulk-add
        </p>
        <div className="space-y-1.5">
          {cfg.items.map((item, i) => (
            <ItemRow
              key={item.id}
              item={item}
              index={i}
              items={cfg.items}
              onUpdate={updateItem}
              onDelete={deleteItem}
              onAddAfter={addItemAfter}
              onBulkReplace={bulkReplace}
              canDelete={cfg.items.length > 1}
              inputRefs={inputRefs}
            />
          ))}
        </div>
        <button
          onClick={addItem}
          className="mt-2 flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium px-2 py-1.5 hover:bg-brand-50 rounded-lg transition-all w-full"
        >
          <Plus size={14} /> Add field
        </button>
      </div>

      <Divider label="Options" />

      <div className="space-y-2">
        <div className="flex items-center justify-between p-2.5 bg-ink-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-ink-700">Allow decimal values</p>
            <p className="text-xs text-ink-400">e.g. 33.3% instead of integers only</p>
          </div>
          <Toggle
            checked={cfg.allowDecimals}
            onChange={val => updateCfg({ allowDecimals: val })}
          />
        </div>
        <div className="flex items-center justify-between p-2.5 bg-ink-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-ink-700">Show remaining balance</p>
            <p className="text-xs text-ink-400">Live counter showing how much is left to allocate</p>
          </div>
          <Toggle
            checked={cfg.showRemaining}
            onChange={val => updateCfg({ showRemaining: val })}
          />
        </div>
      </div>

      {/* Preview summary */}
      <div className="p-3 bg-cyan-50 border border-cyan-100 rounded-xl text-xs text-cyan-700 space-y-0.5">
        <p className="font-semibold mb-1">Summary</p>
        <p>· {cfg.items.length} field{cfg.items.length !== 1 ? 's' : ''} · target {cfg.targetSum}{cfg.unit ? ' ' + cfg.unit : ''}</p>
        <p>· {cfg.allowDecimals ? 'Decimals allowed' : 'Integers only'} · {cfg.showRemaining ? 'Remaining balance shown' : 'No balance counter'}</p>
        <p>· Validation fails if total ≠ {cfg.targetSum} or any field is empty</p>
      </div>
    </div>
  )
}
