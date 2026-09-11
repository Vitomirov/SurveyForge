import { resolveCta, runCtaAction } from '../cta'

export function MarketingButton({ ctaId, label, variant = 'primary', className = '', isAuthenticated, onClick }) {
  const action = resolveCta(ctaId)
  const variantClass =
    variant === 'ghost' ? 'btn-ghost'
      : variant === 'on-dark' ? 'btn-on-dark'
        : 'btn-primary'
  const classes = ['btn', variantClass, className].filter(Boolean).join(' ')

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
