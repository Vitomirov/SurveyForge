import { useCallback, useEffect } from 'react'
import { MARKETING_META } from './content/marketingContent'
import { MarketingCompare } from './components/MarketingCompare'
import { MarketingFeatures } from './components/MarketingFeatures'
import { MarketingFinalCta } from './components/MarketingFinalCta'
import { MarketingFooter } from './components/MarketingFooter'
import { MarketingHeader } from './components/MarketingHeader'
import { MarketingHero } from './components/MarketingHero'
import { MarketingPricing } from './components/MarketingPricing'
import { MarketingSteps } from './components/MarketingSteps'
import { scrollToMarketingTarget } from './scrollToSection'
import { MKT_SCROLL_STORAGE_KEY } from '@shared/siteHosts.js'
import './styles/marketing.css'

const BUILDER_TITLE = 'Rescope Surveys — Builder'

export function MarketingPage({ isAuthenticated = false }) {
  useEffect(() => {
    const prev = document.title
    document.title = MARKETING_META.title
    return () => {
      document.title = prev || BUILDER_TITLE
    }
  }, [])

  useEffect(() => {
    try {
      const target = sessionStorage.getItem(MKT_SCROLL_STORAGE_KEY)
      if (!target) return
      sessionStorage.removeItem(MKT_SCROLL_STORAGE_KEY)
      requestAnimationFrame(() => scrollToMarketingTarget(`#${target.replace(/^#/, '')}`))
    } catch {
      /* ignore */
    }
  }, [])

  const onNavHash = useCallback((hash) => {
    scrollToMarketingTarget(hash)
  }, [])

  return (
    <div className="mkt-site">
      <MarketingHeader isAuthenticated={isAuthenticated} onNavHash={onNavHash} />
      <main>
        <MarketingHero isAuthenticated={isAuthenticated} />
        <div className="mkt-sheet-edge" aria-hidden="true" />
        <MarketingCompare />
        <MarketingFeatures />
        <MarketingSteps />
        <MarketingPricing isAuthenticated={isAuthenticated} />
        <MarketingFinalCta isAuthenticated={isAuthenticated} />
      </main>
      <MarketingFooter onNavHash={onNavHash} />
    </div>
  )
}

export default MarketingPage
