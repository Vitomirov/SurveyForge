import { MARKETING_STEPS } from '../content/marketingContent'

export function MarketingSteps() {
  return (
    <section id={MARKETING_STEPS.id} className={MARKETING_STEPS.dimBackground ? 'section-dim' : undefined}>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">{MARKETING_STEPS.eyebrow}</div>
          <h2>{MARKETING_STEPS.title}</h2>
        </div>
        <div className="steps">
          {MARKETING_STEPS.steps.map(step => (
            <article key={step.num} className="step-card">
              <div className="num">{step.num}</div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
