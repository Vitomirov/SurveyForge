export function CascadeQ({ question, value = {}, onChange }) {
  const cfg = question.cascadeConfig

  const level1Items = cfg.items.filter(i => i.level === 0)
  const level2Items = cfg.items.filter(i => i.level === 1 && i.parentId === value.l1)
  const level3Items = cfg.items.filter(i => i.level === 2 && i.parentId === value.l2)

  const setL1 = (id) => onChange({ l1: id, l2: null, l3: null })
  const setL2 = (id) => onChange({ ...value, l2: id, l3: null })
  const setL3 = (id) => onChange({ ...value, l3: id })

  const selectedL1 = level1Items.find(i => i.id === value.l1)
  const selectedL2 = level2Items.find(i => i.id === value.l2)
  const selectedL3 = level3Items.find(i => i.id === value.l3)

  return (
    <div className="space-y-3">
      {cfg.instruction && <p className="text-sm text-ink-500 italic">{cfg.instruction}</p>}

      {/* Level 1 */}
      <div>
        <label className="text-xs font-semibold text-ink-500 mb-1 block">{cfg.levelLabels[0]}</label>
        <select
          value={value.l1 || ''}
          onChange={e => setL1(e.target.value || null)}
          className="w-full border-2 border-ink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 bg-white transition-all"
        >
          <option value="">— Select {cfg.levelLabels[0]} —</option>
          {level1Items.map(item => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </div>

      {/* Level 2 — only shown when L1 is selected */}
      {value.l1 && (
        <div>
          <label className="text-xs font-semibold text-ink-500 mb-1 block">{cfg.levelLabels[1]}</label>
          {level2Items.length === 0 ? (
            <p className="text-xs text-ink-400 italic px-1">No {cfg.levelLabels[1]} options defined for this {cfg.levelLabels[0]}.</p>
          ) : (
            <select
              value={value.l2 || ''}
              onChange={e => setL2(e.target.value || null)}
              className="w-full border-2 border-ink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 bg-white transition-all"
            >
              <option value="">— Select {cfg.levelLabels[1]} —</option>
              {level2Items.map(item => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Level 3 — only shown when L2 is selected */}
      {value.l2 && (
        <div>
          <label className="text-xs font-semibold text-ink-500 mb-1 block">{cfg.levelLabels[2]}</label>
          {level3Items.length === 0 ? (
            <p className="text-xs text-ink-400 italic px-1">No {cfg.levelLabels[2]} options defined for this {cfg.levelLabels[1]}.</p>
          ) : (
            <select
              value={value.l3 || ''}
              onChange={e => setL3(e.target.value || null)}
              className="w-full border-2 border-ink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 bg-white transition-all"
            >
              <option value="">— Select {cfg.levelLabels[2]} —</option>
              {level3Items.map(item => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Selection summary */}
      {(selectedL1 || selectedL2 || selectedL3) && (
        <div className="flex items-center gap-1.5 text-xs text-ink-500 bg-ink-50 px-3 py-2 rounded-lg flex-wrap">
          {selectedL1 && <span className="font-medium text-indigo-700">{selectedL1.label}</span>}
          {selectedL2 && <><span>›</span><span className="font-medium text-indigo-600">{selectedL2.label}</span></>}
          {selectedL3 && <><span>›</span><span className="font-medium text-indigo-500">{selectedL3.label}</span></>}
        </div>
      )}
    </div>
  )
}

export default CascadeQ
