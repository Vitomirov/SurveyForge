import { resolveCta, runCtaAction } from '../cta'

export function MarketingButton({ ctaId, label, variant = 'primary', className = '', isAuthenticated, onClick }) {
  const action = resolveCta(ctaId)
  const classes = ['btn', variant === 'ghost' ? 'btn-ghost' : 'btn-primary', className].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={classes}
      onClick={() => {
        onClick?.()
        runCtaAction(action, { isAuthenticated })
      }}
    >
      {label}
    </button>
  )
}
