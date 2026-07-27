export function SliderQ({ question, value, onChange }) {
  const cfg = question.sliderConfig
  const { min, max, step, defaultValue, showNumbers, labels, instruction } = cfg

  // `value` is the current answer: a number | null
  // null means the respondent hasn't touched the slider yet
  const hasAnswer  = value !== null && value !== undefined
  const currentVal = hasAnswer ? value : defaultValue   // what the thumb shows
  const pct        = currentVal != null
    ? ((currentVal - min) / (max - min)) * 100
    : 0

  const range     = max - min
  const ticks     = showNumbers && range <= 20
    ? Array.from({ length: range + 1 }, (_, i) => min + i)
    : []

  const handleChange = (e) => onChange(parseInt(e.target.value))

  const anchors = labels.filter(l => l.label?.trim())

  return (
    <div>
      {instruction && (
        <p className="text-sm text-ink-500 mb-4 leading-relaxed italic">{instruction}</p>
      )}

      {/* Value bubble */}
      <div className="flex justify-center mb-4">
        {hasAnswer || defaultValue !== null ? (
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center shadow-md shadow-brand-200">
              <span className="text-white text-lg font-bold font-mono">{currentVal}</span>
            </div>
            {/* Show matching anchor label under the bubble */}
            {anchors.find(l => l.value === currentVal) && (
              <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                {anchors.find(l => l.value === currentVal).label}
              </span>
            )}
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-ink-100 border-2 border-dashed border-ink-300 flex items-center justify-center">
            <span className="text-ink-400 text-lg">?</span>
          </div>
        )}
      </div>

      {/* Slider track */}
      <div className="px-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentVal ?? min}
          onChange={handleChange}
          onMouseDown={() => { if (!hasAnswer && defaultValue === null) onChange(min) }}
          onTouchStart={() => { if (!hasAnswer && defaultValue === null) onChange(min) }}
          className="sf-slider"
          style={{ '--pct': `${pct}%` }}
        />

        {/* Tick marks / numbers */}
        {ticks.length > 0 && (
          <div className="flex justify-between mt-2 px-0">
            {ticks.map(n => (
              <button
                key={n}
                onClick={() => onChange(n)}
                className={`text-xs font-mono transition-colors cursor-pointer leading-none ${
                  n === currentVal
                    ? 'text-brand-600 font-bold'
                    : 'text-ink-400 hover:text-ink-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {/* Anchor labels */}
        {anchors.length > 0 && (
          <div className="relative mt-3" style={{ height: '28px' }}>
            {anchors.map(lbl => {
              const lPct = ((lbl.value - min) / (max - min)) * 100
              const isActive = lbl.value === currentVal
              return (
                <button
                  key={lbl.id}
                  onClick={() => onChange(lbl.value)}
                  title={`Set to ${lbl.value}`}
                  className={`absolute text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    isActive ? 'text-brand-600' : 'text-ink-500 hover:text-ink-700'
                  }`}
                  style={{
                    left: `${lPct}%`,
                    transform:
                      lPct < 8  ? 'none' :
                      lPct > 92 ? 'translateX(-100%)' :
                                  'translateX(-50%)',
                  }}
                >
                  {lbl.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Endpoint range labels when no anchor labels */}
        {anchors.length === 0 && (
          <div className="flex justify-between mt-2 text-xs text-ink-400">
            <span>{min}</span>
            <span>{max}</span>
          </div>
        )}
      </div>

      {/* Nudge prompt when required and untouched */}
      {!hasAnswer && defaultValue === null && (
        <p className="text-center text-xs text-ink-400 mt-3 italic">
          Move the slider to record your answer
        </p>
      )}
    </div>
  )
}
