import { useState } from 'react'
import { Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react'
import { SectionLabel } from '@/components/ui'
import { makeCascadeItem } from '@/store/surveyStore'

// ─── Level 3 items under a level 2 parent ─────────────────────────────────
function Level3Items({ parentId, items, onAdd, onUpdate, onDelete }) {
  const children = items.filter(i => i.level === 2 && i.parentId === parentId)

  return (
    <div className="ml-8 mt-1.5 space-y-1">
      {children.map(item => (
        <div key={item.id} className="flex items-center gap-2 group">
          <div className="w-3 h-px bg-ink-200 shrink-0" />
          <input
            type="text" value={item.label}
            onChange={e => onUpdate(item.id, e.target.value)}
            placeholder="Level 3 option"
            className="input-base py-1 text-xs flex-1"
          />
          <button onClick={() => onDelete(item.id)}
            className="p-1 text-ink-300 hover:text-rose-500 rounded opacity-0 group-hover:opacity-100 transition-all">
            <Trash2 size={11} />
          </button>
        </div>
      ))}
      <button onClick={() => onAdd(parentId, 2)}
        className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-brand-600 px-2 py-1 transition-all">
        <Plus size={11} /> Add option
      </button>
    </div>
  )
}

// ─── Level 2 items under a level 1 parent ─────────────────────────────────
function Level2Items({ parentId, items, onAdd, onUpdate, onDelete }) {
  const children = items.filter(i => i.level === 1 && i.parentId === parentId)
  const [expanded, setExpanded] = useState({})

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))
  const level3Count = (id) => items.filter(i => i.level === 2 && i.parentId === id).length

  return (
    <div className="ml-5 mt-1.5 space-y-1">
      {children.map(item => (
        <div key={item.id}>
          <div className="flex items-center gap-1.5 group">
            <button onClick={() => toggle(item.id)} className="p-0.5 text-ink-300 hover:text-ink-600">
              {expanded[item.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            <input
              type="text" value={item.label}
              onChange={e => onUpdate(item.id, e.target.value)}
              placeholder="Level 2 option"
              className="input-base py-1 text-sm flex-1"
            />
            <span className="text-xs text-ink-400 shrink-0">{level3Count(item.id)} L3</span>
            <button onClick={() => onDelete(item.id)}
              className="p-1 text-ink-300 hover:text-rose-500 rounded opacity-0 group-hover:opacity-100 transition-all">
              <Trash2 size={12} />
            </button>
          </div>
          {expanded[item.id] && (
            <Level3Items parentId={item.id} items={items} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />
          )}
        </div>
      ))}
      <button onClick={() => onAdd(parentId, 1)}
        className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-brand-600 ml-5 px-2 py-1 transition-all">
        <Plus size={11} /> Add {items.filter(i => i.level === 1 && i.parentId === parentId).length === 0 ? 'first ' : ''}option
      </button>
    </div>
  )
}

// ─── Main CascadeEditor ────────────────────────────────────────────────────
export function CascadeEditor({ question, dispatch }) {
  const cfg = question.cascadeConfig
  const [expanded, setExpanded] = useState({})

  const updateCfg = (patch) =>
    dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { cascadeConfig: { ...cfg, ...patch } } })

  const addItem = (parentId, level) => {
    const item = makeCascadeItem('', level, parentId)
    updateCfg({ items: [...cfg.items, item] })
    // Auto-expand parent
    if (parentId) setExpanded(e => ({ ...e, [parentId]: true }))
  }

  const updateItem = (id, label) =>
    updateCfg({ items: cfg.items.map(i => i.id === id ? { ...i, label } : i) })

  const deleteItem = (id) => {
    // Delete item and all its descendants
    const toDelete = new Set([id])
    const grow = () => {
      cfg.items.forEach(i => { if (toDelete.has(i.parentId)) toDelete.add(i.id) })
    }
    grow(); grow() // 2 passes covers 3 levels
    updateCfg({ items: cfg.items.filter(i => !toDelete.has(i.id)) })
  }

  const updateLabel = (levelIdx, val) => {
    const next = [...cfg.levelLabels]
    next[levelIdx] = val
    updateCfg({ levelLabels: next })
  }

  const level1 = cfg.items.filter(i => i.level === 0)
  const l2Count = (id) => cfg.items.filter(i => i.level === 1 && i.parentId === id).length
  const l3Count = (id) => {
    const l2s = cfg.items.filter(i => i.level === 1 && i.parentId === id).map(i => i.id)
    return cfg.items.filter(i => i.level === 2 && l2s.includes(i.parentId)).length
  }

  return (
    <div className="space-y-4">
      {/* Level labels */}
      <div>
        <SectionLabel>Dropdown labels</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {cfg.levelLabels.map((label, i) => (
            <div key={i}>
              <label className="text-xs text-ink-400 mb-1 block">Level {i + 1}</label>
              <input type="text" value={label}
                onChange={e => updateLabel(i, e.target.value)}
                placeholder={`Level ${i + 1}`}
                className="input-base text-sm py-1.5" />
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-400 mt-1.5">These become the placeholder labels in each dropdown.</p>
      </div>

      {/* Instruction */}
      <div>
        <label className="text-xs text-ink-500 mb-1 block">Instruction (optional)</label>
        <input type="text" value={cfg.instruction}
          onChange={e => updateCfg({ instruction: e.target.value })}
          placeholder={`Select ${cfg.levelLabels[0]}, then ${cfg.levelLabels[1]}, then ${cfg.levelLabels[2]}…`}
          className="input-base text-sm" />
      </div>

      {/* Tree editor */}
      <div>
        <SectionLabel>Option tree</SectionLabel>
        <div className="p-2 bg-ink-50 border border-ink-100 rounded-xl text-xs text-ink-400 mb-3 flex items-center gap-3">
          <span>L1 = {cfg.levelLabels[0]}</span>
          <ChevronRight size={11} />
          <span>L2 = {cfg.levelLabels[1]}</span>
          <ChevronRight size={11} />
          <span>L3 = {cfg.levelLabels[2]}</span>
        </div>

        <div className="space-y-2 border border-ink-200 rounded-xl p-3 bg-white">
          {level1.map(item => (
            <div key={item.id}>
              <div className="flex items-center gap-2 group">
                <button onClick={() => setExpanded(e => ({ ...e, [item.id]: !e[item.id] }))}
                  className="p-0.5 text-ink-400 hover:text-ink-700">
                  {expanded[item.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <input type="text" value={item.label}
                  onChange={e => updateItem(item.id, e.target.value)}
                  placeholder={`${cfg.levelLabels[0]} option`}
                  className="input-base py-1.5 text-sm font-medium flex-1"
                />
                <span className="text-xs text-ink-400 shrink-0">
                  {l2Count(item.id)} L2 · {l3Count(item.id)} L3
                </span>
                <button onClick={() => deleteItem(item.id)}
                  className="p-1.5 text-ink-300 hover:text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
              {expanded[item.id] && (
                <Level2Items parentId={item.id} items={cfg.items}
                  onAdd={addItem} onUpdate={updateItem} onDelete={deleteItem} />
              )}
            </div>
          ))}

          <button onClick={() => addItem(null, 0)}
            className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium px-2 py-1.5 hover:bg-brand-50 rounded-lg transition-all w-full">
            <Plus size={14} /> Add {cfg.levelLabels[0]} option
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700 space-y-0.5">
        <p className="font-semibold mb-1">Tree stats</p>
        <p>· {level1.length} {cfg.levelLabels[0]} options</p>
        <p>· {cfg.items.filter(i=>i.level===1).length} {cfg.levelLabels[1]} options total</p>
        <p>· {cfg.items.filter(i=>i.level===2).length} {cfg.levelLabels[2]} options total</p>
        <p className="mt-1">CSV: {cfg.levelLabels[0]}: value | {cfg.levelLabels[1]}: value | {cfg.levelLabels[2]}: value</p>
      </div>
    </div>
  )
}
