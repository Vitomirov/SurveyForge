import { useState, useEffect } from 'react'
import { CopyButton } from '@/components/ui'
import { useApi } from '@/config/api'
import { fetchBillingOverview } from '@/api/billing'
import {
  buildShareableSurveyUrl,
  isEnterprisePlan,
  isPublicPathLocked,
  normalizeSurveyDomain,
} from '@shared/surveyUrl.js'
import { buildEmbedUrl, buildEmbedSnippet } from '@shared/embedProtocol.js'
import { canEmbedOnOwnSites } from '@shared/planFeatures.js'

export function ShareableSurveyUrl({ survey, planId: planIdProp, surveyDomain: surveyDomainProp }) {
  const [planId, setPlanId] = useState(planIdProp || 'starter')
  const [surveyDomain, setSurveyDomain] = useState(surveyDomainProp || '')
  const [tab, setTab] = useState('link')
  const [embedOrigins, setEmbedOrigins] = useState([])

  useEffect(() => {
    if (planIdProp) setPlanId(planIdProp)
    if (surveyDomainProp) setSurveyDomain(surveyDomainProp)
    if (planIdProp && surveyDomainProp !== undefined) return
    if (!useApi) return

    let cancelled = false
    fetchBillingOverview()
      .then(data => {
        if (cancelled) return
        if (!planIdProp) setPlanId(data.subscription?.planId || 'starter')
        if (surveyDomainProp === undefined) setSurveyDomain(data.surveyDomain || '')
        setEmbedOrigins(data.embedAllowedOrigins || [])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [planIdProp, surveyDomainProp])

  const billing = { planId, surveyDomain }
  const canEmbed = canEmbedOnOwnSites(planId)

  if (!survey?.id) return null

  const shareUrl = buildShareableSurveyUrl({ survey, ...billing })
  const embedUrl = buildEmbedUrl(shareUrl)
  const embedSnippet = buildEmbedSnippet(embedUrl, { title: survey.title || 'Survey' })
  const isLive = survey.status === 'live'
  const pathLocked = isPublicPathLocked(survey)
  const needsEnterpriseDomain = isEnterprisePlan(planId) && !normalizeSurveyDomain(surveyDomain)

  return (
    <div className="col-span-2 mt-2 border-t border-ink-100 pt-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
          Shareable survey URL
        </p>
        {canEmbed && (
          <div className="flex gap-1">
            {['link', 'embed'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`text-xs font-medium px-2 py-1 rounded-md border ${
                  tab === t ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-500 border-ink-200'
                }`}
              >
                {t === 'link' ? 'Link' : 'Embed'}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'link' && (
        <>
          {shareUrl ? (
            <>
              <p className="text-xs text-ink-500">
                {pathLocked
                  ? 'White-label link for this survey. The path is fixed while the survey is live.'
                  : 'White-label link for this survey. Updates when you change the survey name.'}
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <code className="flex-1 text-xs bg-surface-muted border border-ink-200 text-ink-700 px-3 py-2 rounded-lg truncate font-mono min-w-0">
                  {shareUrl}
                </code>
                <CopyButton text={shareUrl} />
              </div>
            </>
          ) : (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {needsEnterpriseDomain
                ? 'Enterprise survey domain is not configured yet. Ask your platform administrator to set it in the Platform console.'
                : 'Survey URL is not available yet.'}
            </p>
          )}
        </>
      )}

      {tab === 'embed' && canEmbed && (
        <>
          {!isLive && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Set status to Live before embedding on your website.
            </p>
          )}
          {embedOrigins.length === 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Add your website origin in Brand Kit settings before embedding.
            </p>
          )}
          {embedSnippet ? (
            <>
              <p className="text-xs text-ink-500">
                Paste this iframe into your website. The survey auto-resizes and sends completion events via postMessage.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
                <pre className="flex-1 text-xs bg-surface-muted border border-ink-200 text-ink-700 px-3 py-2 rounded-lg overflow-x-auto font-mono whitespace-pre-wrap">
                  {embedSnippet}
                </pre>
                <CopyButton text={embedSnippet} />
              </div>
            </>
          ) : (
            <p className="text-xs text-ink-500">Embed URL unavailable until a share link exists.</p>
          )}
        </>
      )}

      <p className="text-xs text-ink-500">
        Status: <strong>{survey.status || 'draft'}</strong>
        {!isLive && (
          <span className="text-amber-600"> — set status to <strong>Live</strong> to accept responses</span>
        )}
        {isLive && (
          <span className="text-emerald-600"> — link is active</span>
        )}
      </p>
    </div>
  )
}
