import logoLgUrl from '@/assets/brand/logo-lg.svg'
import logoSmUrl from '@/assets/brand/logo-sm.svg'
import { APP_NAME } from '@/constants/branding'
import { MARKETING_NAV } from '../content/marketingContent'
import { resolveCta, runCtaAction } from '../cta'
import { Button } from './Button'

export function Header({ isAuthenticated, onNavHash }) {
  const primary = isAuthenticated ? MARKETING_NAV.signedInPrimaryCta : MARKETING_NAV.primaryCta

  return (
    <header>
      <div className="wrap nav">
        <button type="button" className="nav-brand" onClick={() => onNavHash('#top')} aria-label={`${APP_NAME} home`}>
          <img src={logoSmUrl} alt="" className="nav-logo-sm" draggable={false} />
          <img src={logoLgUrl} alt={APP_NAME} className="nav-logo-lg" draggable={false} />
        </button>
        <nav className="navlinks" aria-label="Primary">
          {MARKETING_NAV.links.map(link => (
            <button key={link.hash} type="button" onClick={() => onNavHash(link.hash)}>
              {link.label}
            </button>
          ))}
        </nav>
        <div className="nav-actions">
          {!isAuthenticated && (
            <button
              type="button"
              className="nav-signin"
              onClick={() => runCtaAction(resolveCta(MARKETING_NAV.signInCta.ctaId), { isAuthenticated })}
            >
              {MARKETING_NAV.signInCta.label}
            </button>
          )}
          <Button
            ctaId={primary.ctaId}
            label={primary.label}
            variant="primary"
            className="btn-nav-cta"
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </header>
  )
}
