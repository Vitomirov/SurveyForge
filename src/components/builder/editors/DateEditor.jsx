import { Divider, SectionLabel } from '@/components/ui'

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '06/25/2025', region: 'US' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '25/06/2025', region: 'EU / UK' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2025-06-25', region: 'ISO 8601' },
]

export function DateEditor({ question, dispatch, surveyDateFormat }) {
  const cfg = question.dateConfig
  const effectiveFormat = cfg.format === 'inherit' ? (surveyDateFormat || 'DD/MM/YYYY') : cfg.format

  const update = (patch) =>
    dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { dateConfig: { ...cfg, ...patch } } })

  return (
    <div className="space-y-4">
      {/* Format */}
      <div>
        <SectionLabel>Date Format</SectionLabel>

        {/* Inherit toggle */}
        <button
          onClick={() => update({ format: cfg.format === 'inherit' ? surveyDateFormat || 'DD/MM/YYYY' : 'inherit' })}
          className={`w-full flex items-center justify-between p-2.5 rounded-lg border mb-2 transition-all ${
            cfg.format === 'inherit'
              ? 'border-brand-400 bg-brand-50'
              : 'border-ink-200 hover:border-ink-300'
          }`}
        >
          <div className="text-left">
            <p className="text-sm font-medium text-ink-700">Inherit survey default</p>
            <p className="text-xs text-ink-400">Currently: <span className="font-mono font-medium">{surveyDateFormat || 'DD/MM/YYYY'}</span></p>
          </div>
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${cfg.format === 'inherit' ? 'border-brand-500 bg-brand-500' : 'border-ink-300'}`}>
            {cfg.format === 'inherit' && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
        </button>

        {/* Custom format */}
        <p className="text-xs text-ink-400 mb-2">— or choose a custom format for this question —</p>
        <div className="space-y-1.5">
          {DATE_FORMATS.map(fmt => (
            <button
              key={fmt.value}
              onClick={() => update({ format: fmt.value })}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                cfg.format === fmt.value
                  ? 'border-brand-400 bg-brand-50'
                  : 'border-ink-200 hover:border-ink-300'
              }`}
            >
              <div className="text-left">
                <span className="text-sm font-mono font-medium text-ink-700">{fmt.label}</span>
                <span className="text-xs text-ink-400 ml-2">{fmt.region}</span>
              </div>
              <span className="text-xs text-ink-500 font-mono">{fmt.example}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <Divider label="Date Constraints" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink-500 mb-1 block">Minimum date</label>
          <input
            type="date"
            value={cfg.minDate || ''}
            onChange={e => update({ minDate: e.target.value })}
            className="input-base"
          />
          {cfg.minDate && (
            <button onClick={() => update({ minDate: '' })} className="text-xs text-ink-400 hover:text-rose-500 mt-1">
              Clear
            </button>
          )}
        </div>
        <div>
          <label className="text-xs text-ink-500 mb-1 block">Maximum date</label>
          <input
            type="date"
            value={cfg.maxDate || ''}
            onChange={e => update({ maxDate: e.target.value })}
            className="input-base"
          />
          {cfg.maxDate && (
            <button onClick={() => update({ maxDate: '' })} className="text-xs text-ink-400 hover:text-rose-500 mt-1">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      <Divider label="Preview" />
      <div className="rounded-lg border border-dashed border-ink-200 p-3 bg-ink-50 space-y-2">
        <p className="text-xs text-ink-400">Respondent will see:</p>
        <input
          type="date"
          min={cfg.minDate || undefined}
          max={cfg.maxDate || undefined}
          className="input-base"
          readOnly
        />
        <p className="text-xs text-ink-400 font-mono">
          Format: {effectiveFormat}
          {cfg.format === 'inherit' && ' (inherited)'}
        </p>
        {(cfg.minDate || cfg.maxDate) && (
          <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
            {cfg.minDate && `From: ${cfg.minDate}`}{cfg.minDate && cfg.maxDate && ' · '}{cfg.maxDate && `To: ${cfg.maxDate}`}
          </p>
        )}
      </div>
    </div>
  )
}
