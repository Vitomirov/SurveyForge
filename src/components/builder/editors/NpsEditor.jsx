import { Divider, SectionLabel, Toggle } from '@/components/ui'

const NPS_SEGMENTS = [
  { label: 'Detractors',  range: '0–6',   color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { label: 'Passives',    range: '7–8',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { label: 'Promoters',   range: '9–10',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
]

function NpsPreview({ cfg }) {
  return (
    <div className="space-y-3">
      {cfg.instruction && (
        <p className="text-sm text-ink-600 italic">{cfg.instruction}</p>
      )}
      <div className="flex gap-1.5 flex-wrap justify-center">
        {Array.from({ length: 11 }, (_, i) => (
          <div
            key={i}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold border-2 ${
              i <= 6  ? 'border-rose-200 bg-rose-50 text-rose-700' :
              i <= 8  ? 'border-amber-200 bg-amber-50 text-amber-700' :
                        'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {i}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-ink-400">
        <span>{cfg.minLabel || 'Not at all likely'}</span>
        <span>{cfg.maxLabel || 'Extremely likely'}</span>
      </div>
      {cfg.showScore && (
        <div className="flex gap-2">
          {NPS_SEGMENTS.map(s => (
            <div key={s.label} className={`flex-1 text-center text-xs font-medium py-1 rounded-lg border ${s.color}`}>
              {s.label}<br /><span className="text-xs opacity-70">{s.range}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function NpsEditor({ question, dispatch }) {
  const cfg = question.npsConfig

  const update = (patch) =>
    dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { npsConfig: { ...cfg, ...patch } } })

  return (
    <div className="space-y-4">
      {/* Instruction */}
      <div>
        <label className="text-xs font-semibold text-ink-500 mb-1 block">Standard instruction text</label>
        <textarea
          rows={2}
          value={cfg.instruction}
          onChange={e => update({ instruction: e.target.value })}
          placeholder="How likely are you to recommend us to a friend or colleague?"
          className="input-base resize-none text-sm"
        />
        <p className="text-xs text-ink-400 mt-1">
          Shown above the scale. The standard NPS phrasing is pre-filled; customise if needed.
        </p>
      </div>

      {/* End labels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink-500 mb-1 block">Label for 0 (left)</label>
          <input
            type="text"
            value={cfg.minLabel}
            onChange={e => update({ minLabel: e.target.value })}
            placeholder="Not at all likely"
            className="input-base"
          />
        </div>
        <div>
          <label className="text-xs text-ink-500 mb-1 block">Label for 10 (right)</label>
          <input
            type="text"
            value={cfg.maxLabel}
            onChange={e => update({ maxLabel: e.target.value })}
            placeholder="Extremely likely"
            className="input-base"
          />
        </div>
      </div>

      {/* Scoring display */}
      <div className="flex items-center justify-between p-2.5 bg-ink-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-ink-700">Show segment labels</p>
          <p className="text-xs text-ink-400">Displays Detractor / Passive / Promoter bands below the scale</p>
        </div>
        <Toggle checked={cfg.showScore} onChange={val => update({ showScore: val })} />
      </div>

      {/* Scoring info */}
      <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl space-y-1.5">
        <p className="text-xs font-semibold text-rose-700 mb-1">NPS Scoring — automatic in exports</p>
        {NPS_SEGMENTS.map(s => (
          <div key={s.label} className={`text-xs font-medium px-2 py-1 rounded border inline-block mr-2 ${s.color}`}>
            {s.label}: {s.range}
          </div>
        ))}
        <p className="text-xs text-rose-600 mt-1">
          Score is stored as the selected number (0–10). NPS = % Promoters − % Detractors.
          Calculate this in your export using the segment ranges above.
        </p>
      </div>

      <Divider label="Preview" />
      <div className="rounded-xl border border-dashed border-ink-200 p-4 bg-ink-50">
        <NpsPreview cfg={cfg} />
      </div>
    </div>
  )
}

export default NpsEditor
