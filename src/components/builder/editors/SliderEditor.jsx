import { Plus, Trash2 } from 'lucide-react'
import { SectionLabel, Divider, Toggle } from '@/components/ui'
import { makeSliderLabel } from '@/store/surveyStore'

// ─── Live slider preview (mirrors what respondent sees) ────────────────────
function SliderPreview({ cfg }) {
  const { min, max, step, defaultValue, showNumbers, labels } = cfg
  const val   = defaultValue ?? min
  const pct   = ((val - min) / (max - min)) * 100
  const range = max - min
  const ticks = range <= 20
    ? Array.from({ length: range + 1 }, (_, i) => min + i)
    : []

  return (
    <div className="px-2 py-4 select-none">
      {/* Value bubble */}
      <div className="flex justify-center mb-3">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-600 text-white text-base font-bold shadow">
          {val}
        </span>
      </div>

      {/* Track */}
      <div className="relative">
        <input
          type="range" readOnly
          min={min} max={max} step={step} value={val}
          className="sf-slider"
          style={{ '--pct': `${pct}%` }}
        />

        {/* Tick marks + numbers */}
        {showNumbers && ticks.length > 0 && (
          <div className="flex justify-between mt-1.5 px-0.5">
            {ticks.map(n => (
              <span key={n} className={`text-xs font-mono ${n === val ? 'text-brand-600 font-bold' : 'text-ink-400'}`}>
                {n}
              </span>
            ))}
          </div>
        )}

        {/* Anchor labels */}
        {labels.filter(l => l.label).length > 0 && (
          <div className="relative h-5 mt-2">
            {labels.filter(l => l.label).map(l => {
              const lPct = ((l.value - min) / (max - min)) * 100
              return (
                <span
                  key={l.id}
                  className="absolute text-xs text-ink-500 font-medium whitespace-nowrap"
                  style={{
                    left: `${lPct}%`,
                    transform: lPct < 10 ? 'none' : lPct > 90 ? 'translateX(-100%)' : 'translateX(-50%)',
                  }}
                >
                  {l.label}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main SliderEditor ─────────────────────────────────────────────────────
export function SliderEditor({ question, dispatch }) {
  const cfg = question.sliderConfig

  const updateCfg = (patch) =>
    dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { sliderConfig: { ...cfg, ...patch } } })

  const clamp = (v) => Math.min(cfg.max, Math.max(cfg.min, v))

  // ── Labels
  const addLabel = () =>
    updateCfg({ labels: [...cfg.labels, makeSliderLabel(cfg.min, '')] })

  const updateLabel = (id, field, value) =>
    updateCfg({ labels: cfg.labels.map(l => l.id === id ? { ...l, [field]: value } : l) })

  const deleteLabel = (id) =>
    updateCfg({ labels: cfg.labels.filter(l => l.id !== id) })

  const range     = cfg.max - cfg.min
  const showTicks = range <= 20

  return (
    <div className="space-y-4">
      {/* Range config */}
      <div>
        <SectionLabel>Scale range</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-ink-500 mb-1 block">Minimum</label>
            <input
              type="number"
              value={cfg.min}
              onChange={e => {
                const v = parseInt(e.target.value)
                if (!isNaN(v) && v < cfg.max) updateCfg({ min: v })
              }}
              className="input-base font-mono font-bold"
            />
          </div>
          <div>
            <label className="text-xs text-ink-500 mb-1 block">Maximum</label>
            <input
              type="number"
              value={cfg.max}
              onChange={e => {
                const v = parseInt(e.target.value)
                if (!isNaN(v) && v > cfg.min) updateCfg({ max: v })
              }}
              className="input-base font-mono font-bold"
            />
          </div>
          <div>
            <label className="text-xs text-ink-500 mb-1 block">Step</label>
            <input
              type="number"
              min={1}
              value={cfg.step}
              onChange={e => {
                const v = parseInt(e.target.value)
                if (!isNaN(v) && v >= 1) updateCfg({ step: v })
              }}
              className="input-base font-mono"
            />
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <p className="text-xs text-ink-400 self-center mr-1">Quick:</p>
          {[[1,5],[1,7],[1,10],[0,10],[1,20],[1,100]].map(([mn, mx]) => (
            <button
              key={`${mn}-${mx}`}
              onClick={() => updateCfg({ min: mn, max: mx, defaultValue: null })}
              className={`text-xs px-2 py-0.5 rounded-lg border transition-all ${
                cfg.min === mn && cfg.max === mx
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-ink-500 border-ink-200 hover:border-brand-300'
              }`}
            >
              {mn}–{mx}
            </button>
          ))}
        </div>
      </div>

      {/* Default value */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-ink-500">Default (pre-selected) value</label>
          <Toggle
            size="sm"
            checked={cfg.defaultValue !== null}
            onChange={on => updateCfg({ defaultValue: on ? cfg.min : null })}
            label={cfg.defaultValue !== null ? 'On' : 'Off (unselected)'}
          />
        </div>
        {cfg.defaultValue !== null && (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={cfg.min} max={cfg.max} step={cfg.step}
              value={cfg.defaultValue}
              onChange={e => updateCfg({ defaultValue: parseInt(e.target.value) })}
              className="sf-slider flex-1"
              style={{ '--pct': `${((cfg.defaultValue - cfg.min) / (cfg.max - cfg.min)) * 100}%` }}
            />
            <span className="text-base font-bold text-brand-700 font-mono w-8 text-right">
              {cfg.defaultValue}
            </span>
          </div>
        )}
        <p className="text-xs text-ink-400 mt-1">
          {cfg.defaultValue !== null
            ? `Slider starts at ${cfg.defaultValue}. Respondent can move it.`
            : 'Slider starts unselected — respondent must interact before submitting.'}
        </p>
      </div>

      {/* Instruction */}
      <div>
        <label className="text-xs text-ink-500 mb-1 block">Scale instruction (optional)</label>
        <textarea
          rows={2}
          value={cfg.instruction}
          onChange={e => updateCfg({ instruction: e.target.value })}
          placeholder={`Rate your satisfaction from ${cfg.min} to ${cfg.max}, where ${cfg.min} = … and ${cfg.max} = …`}
          className="input-base resize-none text-sm"
        />
      </div>

      {/* Anchor labels */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div>
            <SectionLabel>Anchor labels</SectionLabel>
            <p className="text-xs text-ink-400 -mt-1">
              Attach descriptive text to specific scale points
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {cfg.labels.map((lbl, i) => (
            <div key={lbl.id} className="flex items-center gap-2">
              {/* Value selector */}
              <div className="shrink-0">
                <label className="text-xs text-ink-400 block mb-0.5 text-center">Point</label>
                <input
                  type="number"
                  min={cfg.min}
                  max={cfg.max}
                  value={lbl.value}
                  onChange={e => {
                    const v = parseInt(e.target.value)
                    if (!isNaN(v)) updateLabel(lbl.id, 'value', clamp(v))
                  }}
                  className="input-base w-16 font-mono font-bold text-center py-1.5"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-ink-400 block mb-0.5">Label text</label>
                <input
                  type="text"
                  value={lbl.label}
                  onChange={e => updateLabel(lbl.id, 'label', e.target.value)}
                  placeholder={`Label for ${lbl.value}`}
                  className="input-base py-1.5 text-sm"
                />
              </div>
              <button
                onClick={() => deleteLabel(lbl.id)}
                className="mt-4 p-1.5 text-ink-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addLabel}
          className="mt-2 flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium px-2 py-1.5 hover:bg-brand-50 rounded-lg transition-all"
        >
          <Plus size={14} /> Add anchor label
        </button>

        {/* Annotation example */}
        {cfg.labels.length === 0 && (
          <button
            onClick={() => updateCfg({
              labels: [
                makeSliderLabel(cfg.min, ''),
                makeSliderLabel(Math.round((cfg.min + cfg.max) / 2), ''),
                makeSliderLabel(cfg.max, ''),
              ]
            })}
            className="mt-1 text-xs text-ink-400 hover:text-brand-600 underline underline-offset-2 transition-colors"
          >
            Add labels for min, mid and max →
          </button>
        )}
      </div>

      <Divider label="Display" />

      <div className="flex items-center justify-between p-2.5 bg-ink-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-ink-700">Show scale numbers</p>
          <p className="text-xs text-ink-400">
            {showTicks
              ? `Displays ${cfg.min}–${cfg.max} as tick marks under the track`
              : 'Only available when range ≤ 20 steps'}
          </p>
        </div>
        <Toggle
          checked={cfg.showNumbers && showTicks}
          onChange={val => updateCfg({ showNumbers: val })}
          disabled={!showTicks}
        />
      </div>

      {/* Live preview */}
      <Divider label="Preview" />
      <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50 px-4 pb-3 pt-1">
        <p className="text-xs text-ink-400 text-center mb-1">
          {cfg.defaultValue !== null ? 'Starts at ' + cfg.defaultValue : 'Starts unselected'}
        </p>
        <SliderPreview cfg={{ ...cfg, defaultValue: cfg.defaultValue ?? cfg.min }} />
      </div>
    </div>
  )
}
