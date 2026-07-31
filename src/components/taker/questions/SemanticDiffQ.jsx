export function SemanticDiffQ({ question, value = {}, onChange }) {
  const cfg    = question.semanticDiffConfig
  const points = cfg.points || 7

  const setRow = (rowId, v) => onChange({ ...value, [rowId]: v })

  return (
    <div className="space-y-4">
      {cfg.instruction && <p className="text-sm text-ink-500 italic">{cfg.instruction}</p>}

      {/* Column headers */}
      {cfg.showNumbers && (
        <div className="flex items-center gap-3">
          <div className="w-28 shrink-0" />
          <div className="flex-1 flex justify-between px-1">
            {Array.from({ length: points }, (_, i) => (
              <span key={i} className="text-xs font-mono text-ink-400 w-6 text-center">{i + 1}</span>
            ))}
          </div>
          <div className="w-28 shrink-0" />
        </div>
      )}

      {cfg.rows.map(row => {
        const current = value[row.id] ?? cfg.defaultValue ?? null
        const pct     = current != null ? ((current - 1) / (points - 1)) * 100 : 50

        return (
          <div key={row.id} className="flex items-center gap-3">
            {/* Left pole label */}
            <span className="text-sm font-medium text-ink-600 w-28 shrink-0 text-right leading-snug">
              {row.leftLabel || '…'}
            </span>

            {/* Slider */}
            <div className="flex-1 relative">
              <input
                type="range"
                min={1} max={points} step={1}
                value={current ?? Math.ceil(points / 2)}
                onChange={e => setRow(row.id, parseInt(e.target.value))}
                onMouseDown={() => { if (current === null) setRow(row.id, Math.ceil(points / 2)) }}
                onTouchStart={() => { if (current === null) setRow(row.id, Math.ceil(points / 2)) }}
                className="sf-slider"
                style={{ '--pct': `${current != null ? pct : 50}%` }}
              />
              {current == null && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-5 h-5 rounded-full border-2 border-dashed border-ink-300 bg-white" />
                </div>
              )}
            </div>

            {/* Right pole label */}
            <span className="text-sm font-medium text-ink-600 w-28 shrink-0 leading-snug">
              {row.rightLabel || '…'}
            </span>

            {/* Value badge */}
            {current != null && (
              <span className="w-7 h-7 rounded-full bg-fuchsia-100 border border-fuchsia-300 flex items-center justify-center text-xs font-bold text-fuchsia-700 shrink-0">
                {current}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default SemanticDiffQ
