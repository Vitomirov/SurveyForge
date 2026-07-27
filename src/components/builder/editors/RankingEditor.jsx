import { useRef } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { SectionLabel, Divider, Toggle } from '@/components/ui'
import { makeRankingItem } from '@/store/surveyStore'

function ItemRow({ item, index, items, onUpdate, onDelete, canDelete, inputRefs, onAddAfter, onBulkReplace }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); onAddAfter(item.id) }
    if (e.key === 'Backspace' && !item.text && canDelete) {
      e.preventDefault(); onDelete(item.id)
      const idx = items.findIndex(i => i.id === item.id)
      if (idx > 0) setTimeout(() => inputRefs.current[items[idx - 1].id]?.focus(), 30)
    }
  }
  const handlePaste = (e) => {
    const lines = e.clipboardData.getData('text').split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length <= 1) return
    e.preventDefault()
    onUpdate(item.id, lines[0])
    const newItems = lines.slice(1).map(t => makeRankingItem(t))
    const idx = items.findIndex(i => i.id === item.id)
    onBulkReplace([...items.slice(0, idx + 1), ...newItems, ...items.slice(idx + 1)])
    setTimeout(() => inputRefs.current[newItems[newItems.length - 1].id]?.focus(), 30)
  }
  return (
    <div className="flex items-center gap-2 group">
      <div className="text-ink-200 group-hover:text-ink-400 cursor-grab p-0.5">
        <GripVertical size={14} />
      </div>
      <span className="text-xs text-ink-400 font-mono w-5 text-right shrink-0">{index + 1}.</span>
      <input
        ref={el => { inputRefs.current[item.id] = el }}
        type="text"
        value={item.text}
        onChange={e => onUpdate(item.id, e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={`Item ${index + 1}`}
        className="input-base py-1.5 text-sm flex-1"
      />
      {canDelete && (
        <button onClick={() => onDelete(item.id)}
          className="p-1.5 text-ink-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

export function RankingEditor({ question, dispatch }) {
  const cfg = question.rankingConfig
  const inputRefs = useRef({})

  const updateCfg = (patch) =>
    dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { rankingConfig: { ...cfg, ...patch } } })

  const updateItem   = (id, text) => updateCfg({ items: cfg.items.map(i => i.id === id ? { ...i, text } : i) })
  const deleteItem   = (id)        => updateCfg({ items: cfg.items.filter(i => i.id !== id) })
  const bulkReplace  = (items)     => updateCfg({ items })
  const addItemAfter = (afterId) => {
    const idx  = cfg.items.findIndex(i => i.id === afterId)
    const next = makeRankingItem()
    updateCfg({ items: [...cfg.items.slice(0, idx + 1), next, ...cfg.items.slice(idx + 1)] })
    setTimeout(() => inputRefs.current[next.id]?.focus(), 30)
  }
  const addItem = () => {
    const next = makeRankingItem()
    updateCfg({ items: [...cfg.items, next] })
    setTimeout(() => inputRefs.current[next.id]?.focus(), 30)
  }

  const maxTopN = Math.max(1, cfg.items.length - 1)

  return (
    <div className="space-y-4">
      {/* Instruction */}
      <div>
        <label className="text-xs text-ink-500 mb-1 block">Instruction (optional)</label>
        <input type="text" value={cfg.instruction}
          onChange={e => updateCfg({ instruction: e.target.value })}
          placeholder="Drag to rank these items from most to least preferred..."
          className="input-base text-sm" />
      </div>

      {/* Items */}
      <div>
        <SectionLabel>Items to rank ({cfg.items.length})</SectionLabel>
        <p className="text-xs text-ink-400 mb-2"><strong>Enter</strong> to add · <strong>Paste lines</strong> to bulk-add</p>
        <div className="space-y-1.5">
          {cfg.items.map((item, i) => (
            <ItemRow key={item.id} item={item} index={i} items={cfg.items}
              onUpdate={updateItem} onDelete={deleteItem}
              onAddAfter={addItemAfter} onBulkReplace={bulkReplace}
              canDelete={cfg.items.length > 2} inputRefs={inputRefs} />
          ))}
        </div>
        <button onClick={addItem}
          className="mt-2 flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium px-2 py-1.5 hover:bg-brand-50 rounded-lg transition-all w-full">
          <Plus size={14} /> Add item
        </button>
      </div>

      <Divider label="Ranking mode" />

      {/* Rank all vs top N */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => updateCfg({ rankAll: true })}
            className={`p-3 rounded-xl border-2 text-left transition-all ${cfg.rankAll ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300'}`}>
            <p className={`text-sm font-semibold ${cfg.rankAll ? 'text-brand-700' : 'text-ink-700'}`}>Rank all</p>
            <p className="text-xs text-ink-400 mt-0.5">Order every item (1st to last)</p>
          </button>
          <button onClick={() => updateCfg({ rankAll: false })}
            className={`p-3 rounded-xl border-2 text-left transition-all ${!cfg.rankAll ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300'}`}>
            <p className={`text-sm font-semibold ${!cfg.rankAll ? 'text-brand-700' : 'text-ink-700'}`}>Top N only</p>
            <p className="text-xs text-ink-400 mt-0.5">Rank only the top N items</p>
          </button>
        </div>

        {!cfg.rankAll && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-ink-700">Rank top</label>
              <span className="text-base font-bold text-brand-600">{Math.min(cfg.topN, maxTopN)}</span>
            </div>
            <input type="range" min={1} max={maxTopN}
              value={Math.min(cfg.topN, maxTopN)}
              onChange={e => updateCfg({ topN: parseInt(e.target.value) })}
              className="w-full accent-brand-600" />
            <p className="text-xs text-ink-400 mt-1">
              Respondent drags their top {Math.min(cfg.topN, maxTopN)} into order. Remaining items are unranked.
            </p>
          </div>
        )}
      </div>

      {/* Preview */}
      <Divider label="Preview" />
      <div className="rounded-xl border border-dashed border-ink-200 p-4 bg-ink-50 space-y-1.5">
        {cfg.instruction && <p className="text-xs text-ink-500 italic mb-2">{cfg.instruction}</p>}
        {cfg.items.slice(0, cfg.rankAll ? undefined : cfg.topN).map((item, i) => (
          <div key={item.id} className="flex items-center gap-3 bg-white border border-ink-200 rounded-lg px-3 py-2">
            <div className="text-ink-200"><GripVertical size={14} /></div>
            <span className="text-xs font-bold text-ink-400 w-5">{i + 1}</span>
            <span className="text-sm text-ink-700">{item.text || `Item ${i + 1}`}</span>
          </div>
        ))}
        {!cfg.rankAll && cfg.items.length > cfg.topN && (
          <div className="mt-2 border-t border-dashed border-ink-200 pt-2">
            <p className="text-xs text-ink-400 italic">Remaining items (unranked):</p>
            {cfg.items.slice(cfg.topN).map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-ink-50 border border-ink-100 rounded-lg px-3 py-1.5 mt-1 opacity-60">
                <span className="text-sm text-ink-500">{item.text || 'Item'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
