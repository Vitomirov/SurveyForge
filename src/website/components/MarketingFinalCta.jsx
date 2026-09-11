import { MARKETING_FINAL_CTA } from '../content/marketingContent'
import { MarketingButton } from './MarketingButton'

export function MarketingFinalCta({ isAuthenticated }) {
  return (
    <section className="cta-final" id={MARKETING_FINAL_CTA.id}>
      <div className="wrap">
        <div>
          <h2>{MARKETING_FINAL_CTA.title}</h2>
          <p>{MARKETING_FINAL_CTA.body}</p>
        </div>
        <MarketingButton
          ctaId={MARKETING_FINAL_CTA.cta.ctaId}
          label={MARKETING_FINAL_CTA.cta.label}
          variant="primary"
          isAuthenticated={isAuthenticated}
        />
      </div>
    </section>
  )
}
