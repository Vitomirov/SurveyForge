import { DEFAULT_DATE_FORMAT } from '@/constants/surveyDefaults'
import { TAKER_INPUT_CLASS } from '@/constants/classNames'

export function DateQ({ question, value = '', onChange, surveyDateFormat }) {
  const cfg = question.dateConfig
  const fmt = cfg?.format === 'inherit' ? surveyDateFormat : cfg?.format
  return (
    <div>
      <input type="date" value={value} onChange={e => onChange(e.target.value)} min={cfg?.minDate || undefined} max={cfg?.maxDate || undefined} className={TAKER_INPUT_CLASS} />
      <p className="text-xs text-ink-400 mt-1">Format: <span className="font-mono">{fmt || DEFAULT_DATE_FORMAT}</span></p>
    </div>
  )
}

export default DateQ
