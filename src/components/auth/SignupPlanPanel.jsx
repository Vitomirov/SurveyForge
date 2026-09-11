import { Check } from 'lucide-react'
import { signupIntentSummary } from '@shared/planCatalog.js'

function PlanPrice({ price, size = 'md' }) {
  if (price.type === 'label') {
    return (
      <p className={size === 'lg' ? 'text-2xl font-semibold text-white' : 'text-sm font-semibold text-brand-800'}>
        {price.label}
      </p>
    )
  }
  const amountClass = size === 'lg'
    ? 'text-4xl font-bold tracking-tight text-white tabular-nums'
    : 'text-lg font-bold text-brand-800 tabular-nums'
  const suffixClass = size === 'lg'
    ? 'text-lg font-medium text-brand-100/90'
    : 'text-sm font-medium text-brand-700/80'
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
      <span className={amountClass}>{price.amount}</span>
      {price.suffix ? <span className={suffixClass}>{price.suffix}</span> : null}
    </p>
  )
}

function HighlightList({ items, tone = 'dark' }) {
  const text = tone === 'dark' ? 'text-white/90' : 'text-ink-600'
  const mark = tone === 'dark' ? 'text-brand-200' : 'text-brand-600'
  return (
    <ul className={tone === 'dark' ? 'mt-8 space-y-3' : 'mt-3 space-y-2'}>
      {items.map(item => (
        <li key={item} className={`flex gap-2.5 text-sm leading-snug ${text}`}>
          <Check size={16} strokeWidth={2.5} className={`shrink-0 mt-0.5 ${mark}`} aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/** Desktop left rail — plan summary for signup. */
export function SignupPlanPanelAside({ planId }) {
  const summary = signupIntentSummary(planId)

  return (
    <aside
      className="relative hidden lg:flex lg:w-[min(460px,44vw)] xl:w-[500px] shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-ink-900 text-white p-12 xl:p-16"
      aria-label="Plan summary"
    >
      <div
        className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-white/[0.06]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl"
        aria-hidden
      />

      <div className="relative">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-100/90">
          Your selected plan
        </p>
        <h2 className="mt-3 text-3xl xl:text-[2rem] font-bold leading-tight text-white">
          {summary.name}
        </h2>
        <div className="mt-4">
          <PlanPrice price={summary.price} size="lg" />
        </div>
        <p className="mt-5 max-w-sm text-sm leading-relaxed text-brand-50/90">
          {summary.detail}
        </p>
        <HighlightList items={summary.highlights} tone="dark" />
      </div>

      <div className="relative mt-10 border-t border-white/10 pt-8">
        <p className="text-xs leading-relaxed text-brand-100/80">
          14-day free trial · No credit card required · Cancel or change plans anytime
        </p>
      </div>
    </aside>
  )
}

/** Mobile — compact plan strip above the form. */
export function SignupPlanPanelCompact({ planId }) {
  const summary = signupIntentSummary(planId)

  return (
    <div
      className="lg:hidden rounded-xl border border-brand-200/80 bg-gradient-to-r from-brand-50 to-white p-5 shadow-sm"
      aria-label="Plan summary"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700">Selected plan</p>
          <p className="mt-1 text-base font-bold text-ink-800">{summary.name}</p>
        </div>
        <PlanPrice price={summary.price} size="md" />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-500 line-clamp-2">{summary.detail}</p>
      <HighlightList items={summary.highlights.slice(0, 3)} tone="light" />
    </div>
  )
}
