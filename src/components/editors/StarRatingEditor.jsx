import { Divider, SectionLabel, Toggle } from '../ui/Ui.jsx'

const ICONS = {
  star:  { filled: '★', empty: '☆', label: 'Stars' },
  heart: { filled: '♥', empty: '♡', label: 'Hearts' },
  thumb: { filled: '👍', empty: '👍', label: 'Thumbs' },
}

function StarPreview({ cfg }) {
  const { stars, allowHalf, defaultValue, icon, minLabel, maxLabel } = cfg
  const iconSet = ICONS[icon] || ICONS.star
  const selected = defaultValue || 0

  return (
    <div className="space-y-2">
      {cfg.instruction && <p className="text-sm text-ink-500 italic">{cfg.instruction}</p>}
      <div className="flex gap-2 justify-center flex-wrap">
        {Array.from({ length: stars }, (_, i) => {
          const val = i + 1
          const isFilled = val <= selected
          return (
            <span
              key={i}
              className={`text-3xl select-none ${isFilled ? 'text-yellow-400' : 'text-ink-200'}`}
              style={{ cursor: 'pointer' }}
            >
              {isFilled ? iconSet.filled : iconSet.empty}
            </span>
          )
        })}
      </div>
      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-xs text-ink-400 px-1">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
      {selected > 0 && (
        <p className="text-xs text-center text-ink-400">{selected} / {stars}</p>
      )}
    </div>
  )
}

export function StarRatingEditor({ question, dispatch }) {
  const cfg = question.starRatingConfig

  const update = (patch) =>
    dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { starRatingConfig: { ...cfg, ...patch } } })

  return (
    <div className="space-y-4">
      {/* Icon type */}
      <div>
        <SectionLabel>Icon type</SectionLabel>
        <div className="flex gap-2">
          {Object.entries(ICONS).map(([key, { label, filled }]) => (
            <button
              key={key}
              onClick={() => update({ icon: key })}
              className={`flex-1 flex flex-col items-center py-3 rounded-xl border-2 transition-all ${
                cfg.icon === key ? 'border-yellow-400 bg-yellow-50' : 'border-ink-200 hover:border-ink-300'
              }`}
            >
              <span className="text-2xl">{filled}</span>
              <span className="text-xs font-medium text-ink-600 mt-1">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Number of icons */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-ink-700">Number of {ICONS[cfg.icon]?.label || 'icons'}</label>
          <span className="text-base font-bold text-yellow-600">{cfg.stars}</span>
        </div>
        <input
          type="range"
          min={2} max={10} step={1}
          value={cfg.stars}
          onChange={e => {
            const newStars = parseInt(e.target.value)
            update({ stars: newStars, defaultValue: cfg.defaultValue > newStars ? null : cfg.defaultValue })
          }}
          className="w-full accent-yellow-500"
        />
        <div className="flex justify-between text-xs text-ink-400 mt-0.5">
          <span>2</span><span>5 (default)</span><span>10</span>
        </div>
      </div>

      {/* Default value */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-ink-700">Default (pre-selected)</label>
          <Toggle
            size="sm"
            checked={cfg.defaultValue !== null}
            onChange={on => update({ defaultValue: on ? Math.ceil(cfg.stars / 2) : null })}
            label={cfg.defaultValue !== null ? `${cfg.defaultValue} selected` : 'None'}
          />
        </div>
        {cfg.defaultValue !== null && (
          <input
            type="range"
            min={1} max={cfg.stars} step={1}
            value={cfg.defaultValue}
            onChange={e => update({ defaultValue: parseInt(e.target.value) })}
            className="w-full accent-yellow-500"
          />
        )}
      </div>

      {/* Half-star */}
      <div className="flex items-center justify-between p-2.5 bg-ink-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-ink-700">Allow half ratings</p>
          <p className="text-xs text-ink-400">e.g. 3.5 out of 5</p>
        </div>
        <Toggle checked={cfg.allowHalf} onChange={val => update({ allowHalf: val })} />
      </div>

      {/* Labels */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink-500 mb-1 block">Min label (1 {ICONS[cfg.icon]?.filled})</label>
          <input type="text" value={cfg.minLabel} onChange={e => update({ minLabel: e.target.value })}
            placeholder="Poor" className="input-base" />
        </div>
        <div>
          <label className="text-xs text-ink-500 mb-1 block">Max label ({cfg.stars} {ICONS[cfg.icon]?.filled})</label>
          <input type="text" value={cfg.maxLabel} onChange={e => update({ maxLabel: e.target.value })}
            placeholder="Excellent" className="input-base" />
        </div>
      </div>

      {/* Instruction */}
      <div>
        <label className="text-xs text-ink-500 mb-1 block">Instruction (optional)</label>
        <input type="text" value={cfg.instruction}
          onChange={e => update({ instruction: e.target.value })}
          placeholder="Rate your experience..." className="input-base" />
      </div>

      <Divider label="Preview" />
      <div className="rounded-xl border border-dashed border-ink-200 p-4 bg-ink-50">
        <StarPreview cfg={cfg} />
      </div>
    </div>
  )
}
