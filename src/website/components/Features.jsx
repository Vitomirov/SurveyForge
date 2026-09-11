import { MARKETING_FEATURES } from '../content/marketingContent'

export function Features() {
  return (
    <section id={MARKETING_FEATURES.id}>
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">{MARKETING_FEATURES.eyebrow}</div>
          <h2>{MARKETING_FEATURES.title}</h2>
        </div>
        <div className="feat-grid">
          {MARKETING_FEATURES.items.map(feat => (
            <article
              key={feat.title}
              className={`feat-card${feat.highlight ? ' feat-card--highlight' : ''}`}
            >
              <div className="tag">{feat.tag}</div>
              <h3>{feat.title}</h3>
              <p>{feat.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
