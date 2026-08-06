import { CopyButton } from '@/components/ui'
import {
  buildSurveyPublicUrl,
  clientDomainFromName,
  displayPublicPath,
  isPublicPathLocked,
} from '@shared/surveyUrl.js'

export function ShareableSurveyUrl({ survey, clients }) {
  if (!survey?.id) return null

  const client = clients.find(c => c.id === survey.clientId)
  const clientDomain = client ? clientDomainFromName(client.name) : null
  const displayPath = displayPublicPath(survey)
  const shareUrl = clientDomain
    ? buildSurveyPublicUrl(clientDomain, displayPath)
    : null
  const isLive = survey.status === 'live'
  const pathLocked = isPublicPathLocked(survey)

  return (
    <div className="col-span-2 mt-2 border-t border-ink-100 pt-3 space-y-3">
      <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider flex items-center gap-1.5">
        🔗 Shareable survey URL
      </p>

      {shareUrl ? (
        <>
          <p className="text-xs text-ink-500">
            {pathLocked
              ? 'White-label link for this survey. The path is fixed while the survey is live.'
              : 'White-label link for this survey. Updates when you change the name; saved on autosave.'}
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
          Select a client above to generate the white-label survey URL.
        </p>
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
