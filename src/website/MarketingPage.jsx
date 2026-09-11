import { useCallback, useEffect } from 'react'
import { MARKETING_META } from './content/marketingContent'
import { Compare } from './components/Compare'
import { Features } from './components/Features'
import { FinalCta } from './components/FinalCta'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Pricing } from './components/Pricing'
import { Steps } from './components/Steps'
import { DemoNotice } from './components/DemoNotice'
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
      <DemoNotice />
      <Header isAuthenticated={isAuthenticated} onNavHash={onNavHash} />
      <main>
        <Hero isAuthenticated={isAuthenticated} />
        <div className="mkt-sheet-edge" aria-hidden="true" />
        <Compare />
        <Features />
        <Steps />
        <Pricing isAuthenticated={isAuthenticated} />
        <FinalCta isAuthenticated={isAuthenticated} />
      </main>
      <Footer onNavHash={onNavHash} />
    </div>
  )
}

export default MarketingPage
