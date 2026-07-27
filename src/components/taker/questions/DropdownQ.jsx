export function DropdownQ({ question, value, onChange }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value || null)} className="w-full border-2 border-ink-200 rounded-xl px-4 py-3 text-sm text-ink-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 cursor-pointer">
      <option value="">— Select an option —</option>
      {question.options.map(opt => <option key={opt.id} value={opt.id}>{opt.text}</option>)}
    </select>
  )
}
