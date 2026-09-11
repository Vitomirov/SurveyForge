import { MARKETING_COMPARE } from '../content/marketingContent'

export function MarketingCompare() {
  const { generic, rescope } = MARKETING_COMPARE

  return (
    <section className="split">
      <div className="wrap">
        <div className="section-head">
          <div className="eyebrow" style={{ color: MARKETING_COMPARE.eyebrowColor }}>
            {MARKETING_COMPARE.eyebrow}
          </div>
          <h2>{MARKETING_COMPARE.title}</h2>
          <p>{MARKETING_COMPARE.subtitle}</p>
        </div>
        <div className="compare">
          <div className="col">
            <h3>{generic.title}</h3>
            <ul>
              {generic.items.map(item => (
                <li key={item}>
                  <span className="mark">–</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="col rescope">
            <h3>{rescope.title}</h3>
            <ul>
              {rescope.items.map(item => (
                <li key={item}>
                  <span className="mark">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
