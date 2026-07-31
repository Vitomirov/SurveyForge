export function RankingQ({ question, value = [], onChange }) {
  const cfg     = question.rankingConfig
  const rankAll = cfg.rankAll !== false
  const topN    = rankAll ? cfg.items.length : (cfg.topN || 3)

  // value = array of item IDs in ranked order (index 0 = rank 1)
  const ranked   = (value || []).filter(id => cfg.items.find(i => i.id === id))
  const unranked = cfg.items.filter(i => !ranked.includes(i.id))

  const moveUp   = (idx) => {
    if (idx === 0) return
    const next = [...ranked]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    onChange(next)
  }
  const moveDown = (idx) => {
    if (idx === ranked.length - 1) return
    const next = [...ranked]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    onChange(next)
  }
  const addToRanked   = (id) => { if (ranked.length < topN) onChange([...ranked, id]) }
  const removeRanked  = (id) => onChange(ranked.filter(r => r !== id))

  return (
    <div className="space-y-3">
      {cfg.instruction && <p className="text-sm text-ink-500 italic">{cfg.instruction}</p>}

      {/* Ranked list */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
          {rankAll ? 'Ranked order' : `Top ${topN}`} — {ranked.length}/{topN} placed
        </p>
        {ranked.map((id, idx) => {
          const item = cfg.items.find(i => i.id === id)
          if (!item) return null
          return (
            <div key={id} className="flex items-center gap-2 bg-brand-50 border-2 border-brand-200 rounded-xl px-3 py-2">
              <span className="text-sm font-bold text-brand-600 w-6 shrink-0">{idx + 1}</span>
              <span className="text-sm text-ink-800 flex-1">{item.text}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => moveUp(idx)} disabled={idx === 0}
                  className="p-1 text-ink-400 hover:text-ink-700 disabled:opacity-20 transition-all">▲</button>
                <button onClick={() => moveDown(idx)} disabled={idx === ranked.length - 1}
                  className="p-1 text-ink-400 hover:text-ink-700 disabled:opacity-20 transition-all">▼</button>
                <button onClick={() => removeRanked(id)}
                  className="p-1 text-rose-400 hover:text-rose-600 transition-all text-xs">✕</button>
              </div>
            </div>
          )
        })}
        {ranked.length < topN && (
          <div className="border-2 border-dashed border-ink-200 rounded-xl px-3 py-2.5 text-xs text-ink-400 text-center">
            {topN - ranked.length} more to place
          </div>
        )}
      </div>

      {/* Unranked pool */}
      {unranked.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
            {rankAll ? 'Remaining' : 'Available — tap to add'}
          </p>
          {unranked.map(item => (
            <button
              key={item.id}
              onClick={() => addToRanked(item.id)}
              disabled={ranked.length >= topN}
              className="w-full flex items-center gap-2 bg-white border border-ink-200 hover:border-brand-300 hover:bg-brand-50 rounded-xl px-3 py-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-sm text-ink-700 flex-1 text-left">{item.text}</span>
              <span className="text-xs text-brand-500 font-medium shrink-0">+ add</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default RankingQ
