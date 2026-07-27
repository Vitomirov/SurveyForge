import { Fingerprint, Info } from 'lucide-react'
import { Toggle } from '@/components/ui'

const SIGNAL_GROUPS = [
  {
    label: 'Network',
    signals: [
      { key: 'ip', label: 'IP address + geo', desc: 'IP, city, region, country, ISP via free API (ipapi.co)', recommended: true },
    ],
  },
  {
    label: 'Device & Browser',
    signals: [
      { key: 'browser',    label: 'Browser',       desc: 'Name and version (Chrome 125, Firefox 127…)',  recommended: true },
      { key: 'os',         label: 'Operating system', desc: 'Windows 10, macOS 14, Android 14, iOS…',   recommended: true },
      { key: 'deviceType', label: 'Device type',    desc: 'Desktop / Tablet / Mobile',                  recommended: true },
      { key: 'screen',     label: 'Screen & viewport', desc: 'Resolution, color depth, window size',    recommended: true },
      { key: 'hardware',   label: 'Hardware hints', desc: 'CPU cores, RAM bucket, touch points',        recommended: false },
      { key: 'connection', label: 'Connection',     desc: 'Network type (4G, WiFi) and downlink speed', recommended: false },
      { key: 'userAgent',  label: 'Raw user-agent', desc: 'Full UA string — verbose but complete',      recommended: false },
    ],
  },
  {
    label: 'Locale',
    signals: [
      { key: 'timezone', label: 'Timezone', desc: 'IANA timezone (Europe/London, America/New_York…)', recommended: true },
      { key: 'language', label: 'Language', desc: 'Browser language setting (en-GB, fr-FR…)',        recommended: true },
    ],
  },
  {
    label: 'Uniqueness hashes',
    signals: [
      { key: 'canvas', label: 'Canvas fingerprint', desc: 'Hash of rendered canvas image — unique per browser+GPU combination', recommended: true },
      { key: 'webgl',  label: 'WebGL renderer',     desc: 'GPU renderer and vendor strings',                                    recommended: false },
    ],
  },
  {
    label: 'Privacy signals',
    signals: [
      { key: 'cookies',    label: 'Cookies enabled', desc: 'Whether the browser allows cookies',   recommended: false },
      { key: 'doNotTrack', label: 'Do Not Track',    desc: 'Browser DNT preference flag, if set', recommended: false },
    ],
  },
]

export function FingerprintSettings({ survey, dispatch }) {
  const fp       = survey.settings?.fingerprinting || {}
  const enabled  = fp.enabled || false
  const signals  = fp.signals || {}

  const setEnabled = (val) =>
    dispatch({
      type: 'SET_SURVEY_SETTING',
      key:  'fingerprinting',
      value: { ...fp, enabled: val },
    })

  const toggleSignal = (key) =>
    dispatch({
      type: 'SET_SURVEY_SETTING',
      key:  'fingerprinting',
      value: { ...fp, signals: { ...signals, [key]: !signals[key] } },
    })

  const activeCount = Object.values(signals).filter(Boolean).length

  return (
    <div className="mt-3 border-t border-ink-100 pt-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider flex items-center gap-1.5">
          <Fingerprint size={12} /> Digital Fingerprinting
        </p>
        <Toggle checked={enabled} onChange={setEnabled} />
      </div>

      {!enabled && (
        <p className="text-xs text-ink-400">
          When enabled, fingerprint data is collected when each respondent starts the survey
          and automatically added as columns to every CSV export.
        </p>
      )}

      {enabled && (
        <div className="space-y-4">
          {/* Status bar */}
          <div className="flex items-center gap-2 p-2.5 bg-brand-50 border border-brand-100 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
            <p className="text-xs text-brand-700 font-medium">
              Active — {activeCount} signal{activeCount !== 1 ? 's' : ''} enabled.
              Data collected on survey start, exported in every CSV.
            </p>
          </div>

          {/* IP API note */}
          {signals.ip && (
            <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <Info size={13} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                <strong>IP lookup</strong> calls <code className="bg-amber-100 px-1 rounded">ipapi.co</code> (free, 1 000 req/day).
                In production, consider self-hosting or upgrading for unlimited lookups.
              </p>
            </div>
          )}

          {/* Signal groups */}
          {SIGNAL_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">
                {group.label}
              </p>
              <div className="space-y-2">
                {group.signals.map(sig => (
                  <div
                    key={sig.key}
                    className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                      signals[sig.key]
                        ? 'border-brand-200 bg-brand-50/50'
                        : 'border-ink-100 bg-white hover:border-ink-200'
                    }`}
                    onClick={() => toggleSignal(sig.key)}
                  >
                    {/* Checkbox */}
                    <div className={`w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                      signals[sig.key] ? 'border-brand-500 bg-brand-500' : 'border-ink-300'
                    }`}>
                      {signals[sig.key] && (
                        <svg viewBox="0 0 10 10" fill="none" className="w-2 h-2">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.8"
                                strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${signals[sig.key] ? 'text-ink-800' : 'text-ink-600'}`}>
                          {sig.label}
                        </span>
                        {sig.recommended && (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-400 mt-0.5 leading-snug">{sig.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* CSV column preview */}
          <div className="p-2.5 bg-ink-900 rounded-lg">
            <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">
              CSV columns that will be added
            </p>
            <p className="text-xs text-ink-300 font-mono leading-relaxed">
              {buildColumnPreview(signals)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function buildColumnPreview(signals) {
  const cols = []
  if (signals.ip)          cols.push('FP: IP Address', 'FP: City', 'FP: Country', 'FP: ISP')
  if (signals.browser)     cols.push('FP: Browser', 'FP: Browser Version')
  if (signals.os)          cols.push('FP: Operating System')
  if (signals.deviceType)  cols.push('FP: Device Type')
  if (signals.screen)      cols.push('FP: Screen Width', 'FP: Screen Height')
  if (signals.timezone)    cols.push('FP: Timezone')
  if (signals.language)    cols.push('FP: Language')
  if (signals.hardware)    cols.push('FP: CPU Cores', 'FP: Device Memory (GB)')
  if (signals.connection)  cols.push('FP: Connection Type')
  if (signals.canvas)      cols.push('FP: Canvas Fingerprint Hash')
  if (signals.webgl)       cols.push('FP: WebGL Renderer')
  if (signals.cookies)     cols.push('FP: Cookies Enabled')
  if (signals.doNotTrack)  cols.push('FP: Do Not Track')
  cols.push('FP: FP Collected At')
  return cols.join(' · ')
}
