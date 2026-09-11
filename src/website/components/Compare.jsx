import { MARKETING_COMPARE } from '../content/marketingContent'

export function Compare() {
  const { generic, rescope } = MARKETING_COMPARE

  return (
    <section className="split">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow">{MARKETING_COMPARE.eyebrow}</div>
          <h2>{MARKETING_COMPARE.title}</h2>
          <p>{MARKETING_COMPARE.subtitle}</p>
        </div>
        <div className="compare">
          <article className="compare-card compare-card--generic">
            <h3 className="compare-card__head">{generic.title}</h3>
            <ul>
              {generic.items.map(item => (
                <li key={item}>
                  <span className="mark">–</span>
                  {item}
                </li>
              ))}
            </ul>
          </article>
          <article className="compare-card compare-card--brand">
            <h3 className="compare-card__head">{rescope.title}</h3>
            <ul>
              {rescope.items.map(item => (
                <li key={item}>
                  <span className="mark">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  )
}
