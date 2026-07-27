export function ConstantSumQ({ question, value = {}, onChange }) {
  const cfg     = question.constantSumConfig
  const target  = cfg.targetSum || 100
  const unit    = cfg.unit || ''

  // Compute running total
  const currentSum = cfg.items.reduce((acc, item) => {
    const v = parseFloat(value[item.id])
    return acc + (isNaN(v) ? 0 : v)
  }, 0)

  const remaining = target - currentSum
  const isExact   = Math.abs(remaining) < 0.0001
  const isOver    = remaining < -0.0001

  const setVal = (itemId, raw) => {
    const cleaned = cfg.allowDecimals ? raw : raw.replace(/[^0-9]/g, '')
    onChange({ ...value, [itemId]: cleaned })
  }

  // Distribute remaining evenly across empty fields
  const autoFill = () => {
    const empty    = cfg.items.filter(i => value[i.id] === '' || value[i.id] === undefined)
    if (!empty.length) return
    const filled   = cfg.items.filter(i => value[i.id] !== '' && value[i.id] !== undefined)
    const usedSum  = filled.reduce((a, i) => a + (parseFloat(value[i.id]) || 0), 0)
    const leftover = target - usedSum
    const share    = cfg.allowDecimals
      ? Math.round((leftover / empty.length) * 100) / 100
      : Math.floor(leftover / empty.length)
    const patch = {}
    empty.forEach(i => { patch[i.id] = String(share) })
    onChange({ ...value, ...patch })
  }

  return (
    <div>
      {cfg.instruction && <p className="text-sm text-ink-500 italic mb-3">{cfg.instruction}</p>}

      {/* Fields */}
      <div className="space-y-2 mb-4">
        {cfg.items.map((item) => {
          const rawVal    = value[item.id] ?? ''
          const numVal    = parseFloat(rawVal)
          const hasValue  = rawVal !== '' && !isNaN(numVal)

          return (
            <div key={item.id} className="flex items-center gap-3">
              {/* Label */}
              <label className="text-sm text-ink-700 font-medium flex-1 min-w-0 truncate">
                {item.label || <span className="italic text-ink-400">Unlabelled</span>}
              </label>

              {/* Input */}
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type={cfg.allowDecimals ? 'number' : 'number'}
                  inputMode="numeric"
                  step={cfg.allowDecimals ? 'any' : '1'}
                  min={0}
                  max={target}
                  value={rawVal}
                  onChange={e => setVal(item.id, e.target.value)}
                  placeholder="0"
                  className={`w-24 text-right border-2 rounded-xl px-3 py-2 text-sm font-mono font-semibold focus:outline-none focus:ring-2 transition-all ${
                    hasValue && numVal < 0
                      ? 'border-rose-300 bg-rose-50 focus:ring-rose-300'
                      : hasValue
                      ? 'border-brand-200 bg-brand-50 focus:ring-brand-300 text-brand-700'
                      : 'border-ink-200 bg-white focus:ring-brand-300'
                  }`}
                />
                {unit && (
                  <span className="text-sm text-ink-500 font-medium w-6">{unit}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Running total panel */}
      <div className={`rounded-xl border-2 p-3 transition-all ${
        isExact ? 'border-emerald-300 bg-emerald-50' :
        isOver  ? 'border-rose-300 bg-rose-50' :
                  'border-amber-200 bg-amber-50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExact ? (
              <span className="text-emerald-600 text-lg font-bold">✓</span>
            ) : isOver ? (
              <span className="text-rose-500 text-lg font-bold">↑</span>
            ) : (
              <span className="text-amber-500 text-lg font-bold">…</span>
            )}
            <div>
              <p className={`text-sm font-bold ${isExact ? 'text-emerald-700' : isOver ? 'text-rose-700' : 'text-amber-700'}`}>
                {isExact ? 'Total correct' : isOver ? 'Over by ' + Math.abs(remaining).toFixed(cfg.allowDecimals ? 1 : 0) + (unit ? ' ' + unit : '') : 'Total so far'}
              </p>
              {!isExact && cfg.showRemaining && (
                <p className={`text-xs ${isOver ? 'text-rose-500' : 'text-amber-500'}`}>
                  {isOver ? `Reduce by ${Math.abs(remaining).toFixed(cfg.allowDecimals ? 1 : 0)}${unit ? ' ' + unit : ''}` : `${Math.abs(remaining).toFixed(cfg.allowDecimals ? 1 : 0)}${unit ? ' ' + unit : ''} remaining`}
                </p>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className={`text-2xl font-bold font-mono ${isExact ? 'text-emerald-600' : isOver ? 'text-rose-600' : 'text-amber-600'}`}>
              {currentSum.toFixed(cfg.allowDecimals ? 1 : 0)}
            </span>
            <span className={`text-sm font-semibold ml-1 ${isExact ? 'text-emerald-500' : 'text-ink-400'}`}>
              / {target}{unit ? ' ' + unit : ''}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2.5 h-2 bg-white/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${isExact ? 'bg-emerald-400' : isOver ? 'bg-rose-400' : 'bg-amber-400'}`}
            style={{ width: `${Math.min(100, (currentSum / target) * 100)}%` }}
          />
        </div>

        {/* Auto-fill button — only when there are empty fields and sum < target */}
        {!isExact && !isOver && cfg.items.some(i => !value[i.id]) && (
          <button
            onClick={autoFill}
            className="mt-2 text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2"
          >
            Auto-fill remaining {Math.abs(remaining).toFixed(cfg.allowDecimals ? 1 : 0)}{unit} across empty fields
          </button>
        )}
      </div>
    </div>
  )
}
