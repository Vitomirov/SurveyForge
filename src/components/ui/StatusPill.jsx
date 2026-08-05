const STATUS_COLORS = {
  trialing: 'bg-sky-50 text-sky-700 border-sky-200',
  active:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  past_due: 'bg-amber-50 text-amber-700 border-amber-200',
  canceled: 'bg-ink-50 text-ink-500 border-ink-200',
  draft:    'bg-ink-50 text-ink-500 border-ink-200',
  open:     'bg-brand-50 text-brand-700 border-brand-200',
  paid:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  void:     'bg-ink-50 text-ink-400 border-ink-200',
}

/** Colored pill for subscription / invoice statuses. */
export function StatusPill({ status }) {
  if (!status) return null
  const cls = STATUS_COLORS[status] || 'bg-ink-50 text-ink-600 border-ink-200'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default StatusPill
