export function OpenTextQ({ question, value = '', onChange }) {
  const cfg = question.openTextConfig
  const v   = cfg?.validation
  return (
    <div>
      {cfg?.multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={cfg.placeholder || 'Type your answer...'} rows={4} className="w-full border-2 border-ink-200 rounded-xl px-4 py-3 text-sm text-ink-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
        : <input type={v?.type === 'number' ? 'number' : v?.type === 'email' ? 'email' : v?.type === 'url' ? 'url' : 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={cfg?.placeholder || 'Type your answer...'} min={v?.numberMin ?? undefined} max={v?.numberMax ?? undefined} className="w-full border-2 border-ink-200 rounded-xl px-4 py-3 text-sm text-ink-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400" />
      }
      {cfg?.maxLength && <p className="text-xs text-ink-400 text-right mt-1">{value.length} / {cfg.maxLength}</p>}
    </div>
  )
}
