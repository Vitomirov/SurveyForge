import { MARKETING_PRICING_SECTION, listMarketingPricingPlans } from '@shared/planCatalog.js'
import { MarketingButton } from './MarketingButton'

export function MarketingPricing({ isAuthenticated }) {
  const plans = listMarketingPricingPlans()

  return (
    <section id={MARKETING_PRICING_SECTION.id}>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">{MARKETING_PRICING_SECTION.eyebrow}</div>
          <h2>{MARKETING_PRICING_SECTION.title}</h2>
          <p>{MARKETING_PRICING_SECTION.subtitle}</p>
        </div>
        <div className="pricing-grid">
          {plans.map(plan => (
            <article key={plan.id} className={`plan-card${plan.featured ? ' plan-card--featured' : ''}`}>
              <div className="pname">{plan.name}</div>
              <div className="pdesc">{plan.description}</div>
              {plan.price.type === 'label' ? (
                <div className="price-label">{plan.price.label}</div>
              ) : (
                <div className="price">
                  {plan.price.amount}
                  <span>{plan.price.suffix}</span>
                </div>
              )}
              <div className="placeholder-note">{plan.pricingNote}</div>
              <ul>
                {plan.highlights.map(item => (
                  <li key={item}>
                    <span className="mark">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              {plan.cta.kind === 'contact' ? (
                <MarketingButton
                  ctaId="contact"
                  label={plan.cta.label}
                  variant={plan.cta.variant}
                  isAuthenticated={isAuthenticated}
                />
              ) : (
                <MarketingButton
                  label={plan.cta.label}
                  variant={plan.cta.variant}
                  planId={plan.cta.planId}
                  isAuthenticated={isAuthenticated}
                />
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
