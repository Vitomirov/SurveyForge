import { Copy, Check } from 'lucide-react'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2'

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
      {label && <span className="text-xs text-ink-600">{label}</span>}
    </label>
  )
}

// ─── Icon Button ───────────────────────────────────────────────────────────
export function IconBtn({ icon: Icon, onClick, title, variant = 'ghost', className = '' }) {
  const variants = {
    ghost:  'text-ink-500 hover:text-ink-800 hover:bg-ink-100 active:bg-ink-200',
    danger: 'text-ink-500 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100',
    brand:  'text-brand-600 hover:text-brand-700 hover:bg-brand-50 active:bg-brand-100',
  }
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-all active:scale-90 ${FOCUS_RING} ${variants[variant]} ${className}`}
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
      <span className="text-xs text-ink-500 font-medium uppercase tracking-wider">{label}</span>
      <div className="flex-1 border-t border-ink-100" />
    </div>
  )
}

// ─── Section Label ─────────────────────────────────────────────────────────
const SECTION_LABEL_BASE = {
  default: 'text-xs font-semibold text-ink-500 uppercase tracking-wider',
  bold:    'text-xs font-bold text-ink-600 uppercase tracking-wider',
}

export function SectionLabel({ children, variant = 'default', className = '' }) {
  const margin = variant === 'default' && !className.includes('mb-') ? 'mb-2' : ''
  return (
    <p className={`${SECTION_LABEL_BASE[variant]} ${margin} ${className}`.trim()}>
      {children}
    </p>
  )
}

// ─── Copy Button ───────────────────────────────────────────────────────────
export function CopyButton({ text, label = 'Copy', className = '' }) {
  const { copy, copied } = useCopyToClipboard()

  return (
    <button
      type="button"
      onClick={() => copy(text)}
      className={`btn-copy ${copied ? 'btn-copy-success' : ''} ${className}`.trim()}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied!' : label}
    </button>
  )
}
