import { useState, useEffect, useCallback } from 'react'
import { Palette } from 'lucide-react'
import { useApi } from '@/config/api'
import { fetchBrandKit, patchBrandKit } from '@/api/billing'
import { InlineLoader, useToast } from '@/components/ui'
import {
  APPROVED_FONTS,
  BORDER_RADIUS_OPTIONS,
  BUTTON_VARIANTS,
  DEFAULT_BRAND_THEME,
  validateBrandTheme,
} from '@shared/brandTheme.js'

const COLOR_FIELDS = [
  { key: 'primaryColor', label: 'Primary' },
  { key: 'secondaryColor', label: 'Secondary' },
  { key: 'backgroundColor', label: 'Background' },
  { key: 'textColor', label: 'Text' },
  { key: 'buttonTextColor', label: 'Button text' },
]

export function BrandKitPanel({ onClose }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(useApi)
  const [saving, setSaving] = useState(false)
  const [planFeatures, setPlanFeatures] = useState(null)
  const [theme, setTheme] = useState({ ...DEFAULT_BRAND_THEME })
  const [embedOrigins, setEmbedOrigins] = useState('')
  const [errors, setErrors] = useState([])

  const load = useCallback(async () => {
    if (!useApi) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await fetchBrandKit()
      setPlanFeatures(data.planFeatures)
      setTheme(data.brandKit || { ...DEFAULT_BRAND_THEME })
      setEmbedOrigins((data.embedAllowedOrigins || []).join('\n'))
    } catch (err) {
      toast({ message: err.message || 'Failed to load Brand Kit', type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const onSave = async () => {
    const { theme: validated, errors: validationErrors } = validateBrandTheme(theme)
    setErrors(validationErrors)
    if (validationErrors.length) return

    setSaving(true)
    try {
      const origins = embedOrigins
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
      const data = await patchBrandKit({
        brandKit: validated,
        embedAllowedOrigins: origins,
      })
      setTheme(data.brandKit || validated)
      setEmbedOrigins((data.embedAllowedOrigins || []).join('\n'))
      toast({ message: 'Brand Kit saved', type: 'success' })
    } catch (err) {
      toast({ message: err.message || 'Failed to save Brand Kit', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <InlineLoader label="Loading Brand Kit…" />

  if (!planFeatures?.brandKit) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-bold text-ink-800 mb-2">Brand Kit</h2>
        <p className="text-sm text-ink-500 mb-4">
          Custom logos, colors, and fonts are available on Professional and Enterprise plans.
        </p>
        <button type="button" onClick={onClose} className="btn-ghost">Close</button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Palette size={18} className="text-brand-600" />
        <h2 className="text-lg font-bold text-ink-800">Brand Kit</h2>
      </div>
      <p className="text-sm text-ink-500 mb-6">
        Set organization defaults for logos, colors, and typography. New surveys inherit these settings.
      </p>

      {errors.length > 0 && (
        <div className="mb-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {errors.map(e => <p key={e}>{e}</p>)}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Logo URL</label>
          <input
            type="url"
            value={theme.logoUrl || ''}
            onChange={e => setTheme(t => ({ ...t, logoUrl: e.target.value || null }))}
            placeholder="https://… or upload in survey branding"
            className="input-base mt-1"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs text-ink-500">{label}</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={theme[key]}
                  onChange={e => setTheme(t => ({ ...t, [key]: e.target.value }))}
                  className="h-9 w-10 rounded border border-ink-200"
                />
                <input
                  type="text"
                  value={theme[key]}
                  onChange={e => setTheme(t => ({ ...t, [key]: e.target.value }))}
                  className="input-base flex-1 font-mono text-xs"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-ink-500">Font</label>
            <select
              value={theme.fontKey}
              onChange={e => setTheme(t => ({ ...t, fontKey: e.target.value }))}
              className="input-base mt-1"
            >
              {APPROVED_FONTS.map(f => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-ink-500">Corner radius</label>
            <select
              value={theme.borderRadius}
              onChange={e => setTheme(t => ({ ...t, borderRadius: e.target.value }))}
              className="input-base mt-1"
            >
              {BORDER_RADIUS_OPTIONS.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-ink-500">Button style</label>
            <select
              value={theme.buttonVariant}
              onChange={e => setTheme(t => ({ ...t, buttonVariant: e.target.value }))}
              className="input-base mt-1"
            >
              {BUTTON_VARIANTS.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-ink-400 mt-3">
          Professional and Enterprise plans hide the platform footer on public surveys by default.
        </p>

        {planFeatures.embed && (
          <div>
            <label className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
              Embed allowed origins (one per line)
            </label>
            <textarea
              value={embedOrigins}
              onChange={e => setEmbedOrigins(e.target.value)}
              rows={3}
              placeholder="https://www.yourcompany.com"
              className="input-base mt-1 font-mono text-xs"
            />
          </div>
        )}

        <div className="survey-theme rounded-xl border border-ink-200 p-4" style={{
          '--sf-primary': theme.primaryColor,
          '--sf-secondary': theme.secondaryColor,
          '--sf-bg': theme.backgroundColor,
          '--sf-text': theme.textColor,
          '--sf-button-text': theme.buttonTextColor,
          '--sf-radius': theme.borderRadius === 'sm' ? '6px' : theme.borderRadius === 'lg' ? '14px' : '10px',
        }}>
          <p className="text-xs text-ink-400 mb-3">Preview</p>
          <button type="button" className="btn-primary">Primary button</button>
          <input type="text" placeholder="Sample field" className="input-base mt-3" readOnly />
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <button type="button" onClick={onSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save Brand Kit'}
        </button>
        <button type="button" onClick={onClose} className="btn-ghost">Close</button>
      </div>
    </div>
  )
}

export default BrandKitPanel
