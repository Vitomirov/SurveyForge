// ─── Toggle Switch ─────────────────────────────────────────────────────────
export function Toggle({ checked, onChange, label, size = 'md' }) {
  const trackW = size === 'sm' ? 'w-8' : 'w-10'
  const trackH = size === 'sm' ? 'h-4' : 'h-5'
  const thumbS = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'
  const translate = size === 'sm' ? (checked ? 'translate-x-4' : 'translate-x-0.5') : (checked ? 'translate-x-5' : 'translate-x-0.5')

  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <div
        className={`relative ${trackW} ${trackH} rounded-full toggle-track ${checked ? 'bg-brand-600' : 'bg-ink-200'}`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-0.5 toggle-thumb ${thumbS} bg-white rounded-full shadow-sm ${translate}`}
        />
      </div>
      {label && <span className="text-xs text-ink-500">{label}</span>}
    </label>
  )
}

// ─── Icon Button ───────────────────────────────────────────────────────────
export function IconBtn({ icon: Icon, onClick, title, variant = 'ghost', className = '' }) {
  const variants = {
    ghost:  'text-ink-400 hover:text-ink-700 hover:bg-ink-100',
    danger: 'text-ink-400 hover:text-rose-600 hover:bg-rose-50',
    brand:  'text-brand-600 hover:text-brand-700 hover:bg-brand-50',
  }
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-all active:scale-90 ${variants[variant]} ${className}`}
    >
      <Icon size={15} />
    </button>
  )
}

// ─── Tooltip wrapper (simple title-based for now) ─────────────────────────
export function Tip({ children, label }) {
  return <span title={label}>{children}</span>
}

// ─── Divider ───────────────────────────────────────────────────────────────
export function Divider({ label }) {
  if (!label) return <div className="border-t border-ink-100 my-3" />
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 border-t border-ink-100" />
      <span className="text-xs text-ink-300 font-medium uppercase tracking-wider">{label}</span>
      <div className="flex-1 border-t border-ink-100" />
    </div>
  )
}

// ─── Section Label ─────────────────────────────────────────────────────────
const SECTION_LABEL_BASE = {
  default: 'text-xs font-semibold text-ink-400 uppercase tracking-wider',
  bold:    'text-xs font-bold text-ink-500 uppercase tracking-wider',
}

export function SectionLabel({ children, variant = 'default', className = '' }) {
  const margin = variant === 'default' && !className.includes('mb-') ? 'mb-2' : ''
  return (
    <p className={`${SECTION_LABEL_BASE[variant]} ${margin} ${className}`.trim()}>
      {children}
    </p>
  )
}
