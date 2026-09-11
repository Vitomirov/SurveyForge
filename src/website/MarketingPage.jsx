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
import './styles/marketing.css'

const BUILDER_TITLE = 'Rescope Surveys — Builder'

export function MarketingPage({ isAuthenticated = false }) {
  useEffect(() => {
    const prev = document.title
    const root = document.documentElement
    const prevScroll = root.style.scrollBehavior
    document.title = MARKETING_META.title
    root.style.scrollBehavior = 'smooth'
    return () => {
      document.title = prev || BUILDER_TITLE
      root.style.scrollBehavior = prevScroll
    }
  }, [])

  const onNavHash = useCallback((hash) => {
    if (hash === '#top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <div className="mkt-site">
      <MarketingHeader isAuthenticated={isAuthenticated} onNavHash={onNavHash} />
      <main>
        <MarketingHero isAuthenticated={isAuthenticated} />
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
