import { useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { SectionLabel, Divider, Toggle } from '@/components/ui'
import { EditableListRow } from '@/components/shared'
import { makeCardSortCard, makeCardSortCategory } from '@/store/surveyStore'

const PRESET_COLORS = [
  '#6366f1','#3b82f6','#10b981','#f59e0b',
  '#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316',
]

// ─── Category row ──────────────────────────────────────────────────────────
function CategoryRow({ cat, onUpdate, onDelete, canDelete }) {
  return (
    <div className="flex items-center gap-2 group p-2 rounded-lg hover:bg-ink-50">
      {/* Color picker */}
      <div className="relative shrink-0">
        <div className="w-5 h-5 rounded-md border border-ink-200 cursor-pointer overflow-hidden"
          style={{ backgroundColor: cat.color }}>
          <input type="color" value={cat.color} onChange={e => onUpdate(cat.id, 'color', e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
        </div>
      </div>
      <input type="text" value={cat.label} onChange={e => onUpdate(cat.id, 'label', e.target.value)}
        placeholder="Category name" className="input-base py-1.5 text-sm flex-1" />
      {canDelete && (
        <button onClick={() => onDelete(cat.id)}
          className="p-1.5 text-ink-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

// ─── Main CardSortEditor ───────────────────────────────────────────────────
export function CardSortEditor({ question, dispatch }) {
  const cfg       = question.cardSortConfig
  const inputRefs  = useRef({})

  const updateCfg = (patch) =>
    dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { cardSortConfig: { ...cfg, ...patch } } })

  // ── Cards
  const updateCard = (id, text) =>
    updateCfg({ cards: cfg.cards.map(c => c.id === id ? { ...c, text } : c) })

  const deleteCard = (id) =>
    updateCfg({ cards: cfg.cards.filter(c => c.id !== id) })

  const addCardAfter = (afterId) => {
    const idx  = cfg.cards.findIndex(c => c.id === afterId)
    const next = makeCardSortCard()
    updateCfg({ cards: [...cfg.cards.slice(0, idx + 1), next, ...cfg.cards.slice(idx + 1)] })
    setTimeout(() => inputRefs.current[next.id]?.focus(), 30)
  }

  const addCard = () => {
    const next = makeCardSortCard()
    updateCfg({ cards: [...cfg.cards, next] })
    setTimeout(() => inputRefs.current[next.id]?.focus(), 30)
  }

  const bulkReplaceCards = (cards) => updateCfg({ cards })

  // ── Categories
  const updateCategory = (id, field, val) =>
    updateCfg({ categories: cfg.categories.map(c => c.id === id ? { ...c, [field]: val } : c) })

  const deleteCategory = (id) =>
    updateCfg({ categories: cfg.categories.filter(c => c.id !== id) })

  const addCategory = () => {
    const color = PRESET_COLORS[cfg.categories.length % PRESET_COLORS.length]
    updateCfg({ categories: [...cfg.categories, makeCardSortCategory(`Category ${cfg.categories.length + 1}`, color)] })
  }

  return (
    <div className="space-y-4">
      {/* Mode */}
      <div>
        <SectionLabel>Sort mode</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { v: 'closed', title: 'Closed sort', desc: 'Categories predefined by you' },
            { v: 'open',   title: 'Open sort',   desc: 'Respondent creates categories' },
          ].map(({ v, title, desc }) => (
            <button key={v} onClick={() => updateCfg({ mode: v })}
              className={`p-3 rounded-xl border-2 text-left transition-all ${cfg.mode === v ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300'}`}>
              <p className={`text-sm font-semibold ${cfg.mode === v ? 'text-brand-700' : 'text-ink-700'}`}>{title}</p>
              <p className="text-xs text-ink-400 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Instruction */}
      <div>
        <label className="text-xs text-ink-500 mb-1 block">Instruction (optional)</label>
        <input type="text" value={cfg.instruction}
          onChange={e => updateCfg({ instruction: e.target.value })}
          placeholder="Drag each card into the category where you'd expect to find it..."
          className="input-base text-sm" />
      </div>

      {/* Cards */}
      <div>
        <SectionLabel>Cards to sort ({cfg.cards.length})</SectionLabel>
        <p className="text-xs text-ink-400 mb-2"><strong>Enter</strong> to add next · <strong>Paste lines</strong> to bulk-add</p>
        <div className="space-y-1.5">
          {cfg.cards.map((card, i) => (
            <EditableListRow
              key={card.id}
              item={card}
              index={i}
              items={cfg.cards}
              onUpdate={updateCard}
              onDelete={deleteCard}
              onAddAfter={addCardAfter}
              onBulkReplace={bulkReplaceCards}
              makeItem={makeCardSortCard}
              canDelete={cfg.cards.length > 1}
              inputRefs={inputRefs}
              indexSuffix=""
              placeholder={`Card ${i + 1}`}
            />
          ))}
        </div>
        <button onClick={addCard}
          className="mt-2 flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium px-2 py-1.5 hover:bg-brand-50 rounded-lg transition-all w-full">
          <Plus size={14} /> Add card
        </button>
      </div>

      {/* Categories — only for closed/hybrid */}
      {cfg.mode === 'closed' && (
        <>
          <Divider label="Categories" />
          <div className="space-y-1">
            {cfg.categories.map(cat => (
              <CategoryRow key={cat.id} cat={cat} onUpdate={updateCategory}
                onDelete={deleteCategory} canDelete={cfg.categories.length > 1} />
            ))}
          </div>
          <button onClick={addCategory}
            className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium px-2 py-1.5 hover:bg-brand-50 rounded-lg transition-all">
            <Plus size={14} /> Add category
          </button>
        </>
      )}

      {cfg.mode === 'open' && (
        <div className="p-3 bg-ink-50 rounded-xl text-xs text-ink-500 border border-ink-100">
          <strong className="text-ink-700">Open sort:</strong> Respondents will create and name their own categories
          by dragging cards into new buckets. Their category names and groupings will be captured.
        </div>
      )}

      <Divider label="Options" />
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2.5 bg-ink-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-ink-700">Allow unsorted cards</p>
            <p className="text-xs text-ink-400">Respondent can skip sorting some cards</p>
          </div>
          <Toggle checked={cfg.allowUncategorized} onChange={val => updateCfg({ allowUncategorized: val })} />
        </div>
        <div className="flex items-center justify-between p-2.5 bg-ink-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-ink-700">Randomize card order</p>
            <p className="text-xs text-ink-400">Shuffle deck order per respondent</p>
          </div>
          <Toggle checked={cfg.randomizeCards} onChange={val => updateCfg({ randomizeCards: val })} />
        </div>
      </div>
    </div>
  )
}

export default CardSortEditor
