import { SectionLabel, Toggle, Divider } from '@/components/ui'
import { TerminationEditor } from './TerminationEditor'

const VALIDATION_TYPES = [
  { value: 'none',   label: 'None',   description: 'Accept any text' },
  { value: 'email',  label: 'Email',  description: 'Must be a valid email address' },
  { value: 'number', label: 'Number', description: 'Only numbers accepted' },
  { value: 'url',    label: 'URL',    description: 'Must be a valid web address' },
]

export function OpenTextEditor({ question, dispatch }) {
  const cfg = question.openTextConfig
  const val = cfg.validation || { type: 'none', numberMin: null, numberMax: null }

  const update = (patch) =>
    dispatch({ type: 'UPDATE_ITEM', id: question.id, patch: { openTextConfig: { ...cfg, ...patch } } })

  const updateVal = (patch) =>
    update({ validation: { ...val, ...patch } })

  return (
    <div className="space-y-4">
      {/* Input Type */}
      <div>
        <SectionLabel>Input Type</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { key: false, title: 'Single line', desc: 'Short answer, one line' },
            { key: true,  title: 'Multiline',   desc: 'Longer, paragraph response' },
          ].map(({ key, title, desc }) => (
            <button
              key={String(key)}
              onClick={() => update({ multiline: key })}
              className={`p-3 rounded-lg border text-sm text-left transition-all ${
                cfg.multiline === key
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-ink-200 text-ink-500 hover:border-ink-300'
              }`}
            >
              <div className="font-semibold mb-0.5">{title}</div>
              <div className="text-xs opacity-70">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Placeholder */}
      <div>
        <label className="text-xs text-ink-500 mb-1 block">Placeholder text</label>
        <input
          type="text"
          value={cfg.placeholder}
          onChange={e => update({ placeholder: e.target.value })}
          placeholder="E.g. Type your answer here..."
          className="input-base"
        />
      </div>

      {/* Validation */}
      <Divider label="Input Validation" />
      <div>
        <SectionLabel>Validation type</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {VALIDATION_TYPES.map(vt => (
            <button
              key={vt.value}
              onClick={() => updateVal({ type: vt.value })}
              className={`p-2.5 rounded-lg border text-sm text-left transition-all ${
                val.type === vt.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-ink-200 text-ink-500 hover:border-ink-300'
              }`}
            >
              <div className="font-semibold">{vt.label}</div>
              <div className="text-xs opacity-60 leading-tight mt-0.5">{vt.description}</div>
            </button>
          ))}
        </div>

        {/* Number range */}
        {val.type === 'number' && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-500 mb-1 block">Min value</label>
              <input
                type="number"
                value={val.numberMin ?? ''}
                onChange={e => updateVal({ numberMin: e.target.value !== '' ? parseFloat(e.target.value) : null })}
                placeholder="No min"
                className="input-base"
              />
            </div>
            <div>
              <label className="text-xs text-ink-500 mb-1 block">Max value</label>
              <input
                type="number"
                value={val.numberMax ?? ''}
                onChange={e => updateVal({ numberMax: e.target.value !== '' ? parseFloat(e.target.value) : null })}
                placeholder="No max"
                className="input-base"
              />
            </div>
          </div>
        )}

        {/* Validation preview note */}
        {val.type !== 'none' && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            {val.type === 'email'  && '⚠ Answer will be rejected if not a valid email format (e.g. name@domain.com)'}
            {val.type === 'number' && `⚠ Answer will be rejected if not a number${val.numberMin != null || val.numberMax != null ? ` between ${val.numberMin ?? '–∞'} and ${val.numberMax ?? '+∞'}` : ''}`}
            {val.type === 'url'    && '⚠ Answer will be rejected if not a valid URL (e.g. https://example.com)'}
          </div>
        )}
      </div>

      {/* Character Limits */}
      <Divider label="Character Limits" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink-500 mb-1 block">Min characters</label>
          <input
            type="number" min={0}
            value={cfg.minLength ?? ''}
            onChange={e => update({ minLength: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="None" className="input-base"
          />
        </div>
        <div>
          <label className="text-xs text-ink-500 mb-1 block">Max characters</label>
          <input
            type="number" min={1}
            value={cfg.maxLength ?? ''}
            onChange={e => update({ maxLength: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="None" className="input-base"
          />
        </div>
      </div>

      {/* Preview */}
      <Divider label="Preview" />
      <div className="rounded-lg border border-dashed border-ink-200 p-3 bg-ink-50">
        {cfg.multiline
          ? <textarea className="w-full bg-white border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-400 resize-none" rows={3} placeholder={cfg.placeholder} readOnly />
          : <input type="text" className="input-base text-ink-400" placeholder={cfg.placeholder} readOnly />
        }
        <div className="flex justify-between mt-1">
          {val.type !== 'none' && (
            <span className="text-xs text-amber-600 font-medium">
              {val.type === 'email' ? '@ Email only' : val.type === 'number' ? '# Numbers only' : '🔗 URL only'}
            </span>
          )}
          {(cfg.minLength || cfg.maxLength) && (
            <span className="text-xs text-ink-400 ml-auto">
              {cfg.minLength ? `Min ${cfg.minLength}` : ''}{cfg.minLength && cfg.maxLength ? ' · ' : ''}{cfg.maxLength ? `Max ${cfg.maxLength} chars` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Screen-out rules for text answers */}
      <Divider label="Screen-out Rules" />
      <p className="text-xs text-ink-400 mb-3">
        Terminate based on what the respondent types. Text rules are checked when the respondent clicks Next.
      </p>
      <TerminationEditor question={question} dispatch={dispatch} />
    </div>
  )
}
