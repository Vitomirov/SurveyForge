export function DateQ({ question, value = '', onChange, surveyDateFormat }) {
  const cfg = question.dateConfig
  const fmt = cfg?.format === 'inherit' ? surveyDateFormat : cfg?.format
  return (
    <div>
      <input type="date" value={value} onChange={e => onChange(e.target.value)} min={cfg?.minDate || undefined} max={cfg?.maxDate || undefined} className="w-full border-2 border-ink-200 rounded-xl px-4 py-3 text-sm text-ink-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400" />
      <p className="text-xs text-ink-400 mt-1">Format: <span className="font-mono">{fmt || 'DD/MM/YYYY'}</span></p>
    </div>
  )
}
