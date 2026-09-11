import { MARKETING_FINAL_CTA } from '../content/marketingContent'
import { Button } from './Button'

export function FinalCta({ isAuthenticated }) {
  return (
    <section className="cta-final" id={MARKETING_FINAL_CTA.id}>
      <div className="wrap">
        <div>
          <h2>{MARKETING_FINAL_CTA.title}</h2>
          <p>{MARKETING_FINAL_CTA.body}</p>
        </div>
        <Button
          ctaId={MARKETING_FINAL_CTA.cta.ctaId}
          label={MARKETING_FINAL_CTA.cta.label}
          variant="on-dark"
          isAuthenticated={isAuthenticated}
        />
      </div>
    </section>
  )
}
