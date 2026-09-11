import { resolveCta, runCtaAction, navToSignup } from '../cta'

export function Button({
  ctaId,
  planId,
  label,
  variant = 'primary',
  className = '',
  isAuthenticated,
  onClick,
}) {
  const action = ctaId ? resolveCta(ctaId) : null
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
        if (planId) {
          if (isAuthenticated) {
            runCtaAction(resolveCta('dashboard'), { isAuthenticated: true })
          } else {
            navToSignup(planId)
          }
          return
        }
        runCtaAction(action, { isAuthenticated })
      }}
    >
      {label}
    </button>
  )
}
