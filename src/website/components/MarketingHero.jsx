import { MARKETING_HERO } from '../content/marketingContent'
import { MarketingButton } from './MarketingButton'

export function MarketingHero({ isAuthenticated }) {
  const { canvas } = MARKETING_HERO

  return (
    <section className="hero">
      <div className="wrap">
        <div>
          <div className="eyebrow">{MARKETING_HERO.eyebrow}</div>
          <h1>{MARKETING_HERO.title}</h1>
          <p className="lede">{MARKETING_HERO.lede}</p>
          <div className="ctas">
            <MarketingButton
              ctaId={MARKETING_HERO.primaryCta.ctaId}
              label={MARKETING_HERO.primaryCta.label}
              variant="primary"
              isAuthenticated={isAuthenticated}
            />
            <MarketingButton
              ctaId={MARKETING_HERO.secondaryCta.ctaId}
              label={MARKETING_HERO.secondaryCta.label}
              variant="ghost"
              isAuthenticated={isAuthenticated}
            />
          </div>
          <div className="fine">{MARKETING_HERO.fine}</div>
        </div>
        <div className="canvas">
          <div className="canvas-top">
            <span className="label">{canvas.label}</span>
            <div className="dots">
              <span />
              <span />
              <span />
            </div>
          </div>
          {canvas.blocks.map(block => (
            <div key={block.qtype} className={`qblock${block.variant === 'excl' ? ' excl' : ''}`}>
              <div className="qtype">{block.qtype}</div>
              <div className="qtext">{block.qtext}</div>
              {block.opts && (
                <div className="opts">
                  {block.opts.map(opt => (
                    <span key={opt}>{opt}</span>
                  ))}
                </div>
              )}
              {block.pipeLine && (
                <div className="pipe-line">
                  {block.pipeLine.from}
                  <div className="pipe-dash" />
                  {block.pipeLine.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
