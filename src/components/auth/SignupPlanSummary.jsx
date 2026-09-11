import { signupIntentSummary } from '@shared/planCatalog.js'

export function SignupPlanSummary({ planId }) {
  const summary = signupIntentSummary(planId)
  const price = summary.price

  return (
    <div className="mb-5 rounded-xl border border-brand-100 bg-brand-50/80 p-4 text-left">
      <p className="text-[11px] font-bold uppercase tracking-wide text-brand-700">Selected plan</p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-bold text-ink-800">{summary.name}</h3>
        {price.type === 'label' ? (
          <span className="text-sm font-semibold text-ink-600">{price.label}</span>
        ) : (
          <span className="text-sm font-semibold text-ink-600">
            {price.amount}
            {price.suffix && <span className="font-medium text-ink-400">{price.suffix}</span>}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-ink-600 leading-snug">{summary.detail}</p>
      <ul className="mt-3 space-y-1.5">
        {summary.highlights.map(item => (
          <li key={item} className="flex gap-2 text-xs text-ink-600">
            <span className="text-brand-600 font-bold shrink-0">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
