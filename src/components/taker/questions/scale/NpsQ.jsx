export function NpsQ({ question, value, onChange }) {
  const cfg = question.npsConfig
  const NPS_COLORS = (n) =>
    n <= 6  ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100' :
    n <= 8  ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100' :
              'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
  const selectedColor = (n) =>
    n <= 6  ? 'border-rose-500 bg-rose-500 text-white shadow-sm' :
    n <= 8  ? 'border-amber-500 bg-amber-500 text-white shadow-sm' :
              'border-emerald-500 bg-emerald-500 text-white shadow-sm'

  const segment = value == null ? null
    : value <= 6  ? { label: 'Detractor',  color: 'text-rose-600 bg-rose-50 border-rose-200' }
    : value <= 8  ? { label: 'Passive',    color: 'text-amber-600 bg-amber-50 border-amber-200' }
    :               { label: 'Promoter',   color: 'text-emerald-600 bg-emerald-50 border-emerald-200' }

  return (
    <div className="space-y-3">
      {cfg.instruction && <p className="text-sm text-ink-500 italic">{cfg.instruction}</p>}
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: 11 }, (_, i) => (
          <button
            key={i}
            onClick={() => onChange(i === value ? null : i)}
            className={`w-10 h-10 rounded-xl font-bold text-sm border-2 transition-all active:scale-95 ${
              value === i ? selectedColor(i) : NPS_COLORS(i)
            }`}
          >
            {i}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-ink-400">
        <span>{cfg.minLabel || 'Not at all likely'}</span>
        <span>{cfg.maxLabel || 'Extremely likely'}</span>
      </div>
      {segment && cfg.showScore && (
        <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border ${segment.color}`}>
          {segment.label} · Score: {value}
        </div>
      )}
    </div>
  )
}

export default NpsQ
