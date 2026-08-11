import { useState } from 'react'

export function StarRatingQ({ question, value, onChange }) {
  const [hovered, setHovered] = useState(null)
  const cfg     = question.starRatingConfig
  const ICONS   = { star: { filled: '★', empty: '☆' }, heart: { filled: '♥', empty: '♡' }, thumb: { filled: '👍', empty: '👍' } }
  const iconSet = ICONS[cfg.icon] || ICONS.star
  const current = hovered ?? value ?? cfg.defaultValue ?? 0

  const handleClick = (val) => {
    onChange(value === val ? null : val)
  }

  return (
    <div className="space-y-2">
      {cfg.instruction && <p className="text-sm text-ink-500 italic">{cfg.instruction}</p>}
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: cfg.stars }, (_, i) => {
          const val    = i + 1
          const filled = val <= current
          return (
            <button
              key={i}
              onMouseEnter={() => setHovered(val)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => handleClick(val)}
              className={`text-4xl transition-all active:scale-90 select-none ${
                filled ? 'text-yellow-400 drop-shadow-sm' : 'text-ink-200 hover:text-yellow-300'
              }`}
            >
              {filled ? iconSet.filled : iconSet.empty}
            </button>
          )
        })}
      </div>
      {(cfg.minLabel || cfg.maxLabel) && (
        <div className="flex justify-between text-xs text-ink-400 px-1">
          <span>{cfg.minLabel}</span><span>{cfg.maxLabel}</span>
        </div>
      )}
      {value != null && (
        <p className="text-xs text-ink-500">{value} / {cfg.stars}</p>
      )}
    </div>
  )
}

export default StarRatingQ
