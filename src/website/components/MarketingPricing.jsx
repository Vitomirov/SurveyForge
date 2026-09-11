import { MARKETING_PRICING } from '../content/marketingContent'
import { MarketingButton } from './MarketingButton'

export function MarketingPricing({ isAuthenticated }) {
  return (
    <section id={MARKETING_PRICING.id}>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">{MARKETING_PRICING.eyebrow}</div>
          <h2>{MARKETING_PRICING.title}</h2>
          <p>{MARKETING_PRICING.subtitle}</p>
        </div>
        <div className="pricing-grid">
          {MARKETING_PRICING.plans.map(plan => (
            <div key={plan.id} className={`plan${plan.featured ? ' feat-plan' : ''}`}>
              <div className="pname">{plan.name}</div>
              <div className="pdesc">{plan.description}</div>
              {plan.priceLabel ? (
                <div className="price-label">{plan.priceLabel}</div>
              ) : (
                <div className="price">
                  {plan.price}
                  <span>{plan.priceSuffix}</span>
                </div>
              )}
              <div className="placeholder-note">{plan.placeholderNote}</div>
              <ul>
                {plan.features.map(f => (
                  <li key={f}>
                    <span className="mark">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <MarketingButton
                ctaId={plan.cta.ctaId}
                label={plan.cta.label}
                variant={plan.cta.variant}
                isAuthenticated={isAuthenticated}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
