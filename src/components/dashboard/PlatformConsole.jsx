import { useState, useEffect, useCallback, useRef } from 'react'
import { Building2, ChevronLeft, Plus } from 'lucide-react'
import { useApi } from '@/config/api'
import { AUTH_BILLING, AUTH_ERRORS } from '@/constants/authCopy'
import {
  fetchVendorOrganizations,
  fetchVendorOrganization,
  updateVendorSubscription,
  createVendorInvoice,
} from '@/api/platform/vendor'
import { InlineLoader, Modal, StatusPill, useToast } from '@/components/ui'
import { formatMoney, formatDate } from '@/utils/format/format'
import { normalizeSurveyDomain } from '@shared/surveyUrl.js'

const PLANS = [
  { id: 'free_trial', name: 'Free Trial' },
  { id: 'starter', name: 'Starter' },
  { id: 'professional', name: 'Professional' },
  { id: 'enterprise', name: 'Enterprise' },
]

const STATUSES = ['trialing', 'active', 'past_due', 'canceled']

function applyDetailToForm(detail, setters) {
  setters.setDetail(detail)
  setters.setPlanId(detail.subscription.planId)
  setters.setStatus(detail.subscription.status)
  setters.setSurveyDomain(detail.organization.surveyDomain || '')
}

function OrgDetail({ orgId, cachedDetail, onCacheDetail, onOrgListPatch, onBack }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(!cachedDetail)
  const [detail, setDetail] = useState(cachedDetail ?? null)
  const [planId, setPlanId] = useState(cachedDetail?.subscription?.planId ?? 'starter')
  const [status, setStatus] = useState(cachedDetail?.subscription?.status ?? 'active')
  const [surveyDomain, setSurveyDomain] = useState(cachedDetail?.organization?.surveyDomain ?? '')
  const [saving, setSaving] = useState(false)
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [invoiceDesc, setInvoiceDesc] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const orgData = await fetchVendorOrganization(orgId)
      applyDetailToForm(orgData, { setDetail, setPlanId, setStatus, setSurveyDomain })
      onCacheDetail(orgId, orgData)
    } catch (err) {
      toast({ message: err.message || AUTH_ERRORS.forbidden, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [orgId, toast, onCacheDetail])

  useEffect(() => {
    if (cachedDetail) {
      applyDetailToForm(cachedDetail, { setDetail, setPlanId, setStatus, setSurveyDomain })
      setLoading(false)
      return
    }
    load()
  }, [orgId, cachedDetail, load])

  const saveSubscription = async () => {
    setSaving(true)
    try {
      const data = await updateVendorSubscription(orgId, {
        planId,
        status,
        surveyDomain: planId === 'enterprise' ? surveyDomain : '',
      })
      setDetail(prev => {
        const next = {
          ...prev,
          subscription: data.subscription,
          organization: {
            ...prev.organization,
            surveyDomain: data.surveyDomain || '',
          },
        }
        onCacheDetail(orgId, next)
        onOrgListPatch(orgId, {
          subscription: data.subscription,
        })
        return next
      })
      setSurveyDomain(data.surveyDomain || '')
      toast({ message: 'Subscription updated.', type: 'success' })
    } catch (err) {
      toast({ message: err.message || AUTH_ERRORS.forbidden, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const addInvoice = async (e) => {
    e.preventDefault()
    const cents = Math.round(Number(invoiceAmount) * 100)
    if (!cents || cents <= 0) return
    try {
      const data = await createVendorInvoice(orgId, {
        amountCents: cents,
        status: 'open',
        description: invoiceDesc.trim() || `${detail?.organization?.name} subscription`,
      })
      setDetail(prev => {
        const next = {
          ...prev,
          invoices: [data.invoice, ...(prev.invoices || [])],
        }
        onCacheDetail(orgId, next)
        return next
      })
      setInvoiceAmount('')
      setInvoiceDesc('')
      toast({ message: 'Invoice created.', type: 'success' })
    } catch (err) {
      toast({ message: err.message || AUTH_ERRORS.forbidden, type: 'error' })
    }
  }

  if (loading) return <InlineLoader label="Loading organization…" />
  if (!detail) {
    return <p className="text-sm text-ink-400 text-center py-8">Could not load organization.</p>
  }

  const { organization, subscription, invoices } = detail

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 mb-4"
      >
        <ChevronLeft size={16} /> Back to organizations
      </button>

      <div className="mb-6">
        <h3 className="font-semibold text-ink-800">{organization.name}</h3>
        <p className="text-xs text-ink-400">
          {organization.userCount} users · {organization.surveyCount} surveys · joined {formatDate(organization.createdAt)}
        </p>
      </div>

      <div className="border border-ink-100 rounded-xl p-4 mb-6 space-y-3">
        <h4 className="text-sm font-semibold text-ink-800">Subscription</h4>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="text-ink-500 text-xs block mb-1">Plan</span>
            <select value={planId} onChange={e => setPlanId(e.target.value)} className="input-field w-full text-sm">
              {PLANS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-ink-500 text-xs block mb-1">Status</span>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input-field w-full text-sm">
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </label>
        </div>
        {planId === 'enterprise' && (
          <label className="text-sm block">
            <span className="text-ink-500 text-xs block mb-1">Survey domain</span>
            <input
              type="text"
              value={surveyDomain}
              onChange={e => setSurveyDomain(e.target.value)}
              placeholder="domain.com"
              className="input-field w-full text-sm font-mono"
            />
            <span className="text-xs text-ink-400 mt-1 block">
              Used in public survey URLs, e.g. https://{normalizeSurveyDomain(surveyDomain) || 'client.com'}/project-name-date
            </span>
          </label>
        )}
        <p className="text-xs text-ink-400">
          Current: {subscription.planName} · {formatMoney(subscription.priceCents)} · renews {formatDate(subscription.currentPeriodEnd)}
        </p>
        <button type="button" onClick={saveSubscription} disabled={saving} className="btn-primary text-sm px-4">
          {saving ? 'Saving…' : 'Save subscription'}
        </button>
      </div>

      <div className="border border-ink-100 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-ink-800 mb-3">Create invoice</h4>
        <form onSubmit={addInvoice} className="flex flex-wrap gap-2 items-end">
          <label className="text-sm">
            <span className="text-ink-500 text-xs block mb-1">Amount (USD)</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={invoiceAmount}
              onChange={e => setInvoiceAmount(e.target.value)}
              className="input-field w-28 text-sm"
            />
          </label>
          <label className="text-sm flex-1 min-w-[160px]">
            <span className="text-ink-500 text-xs block mb-1">Description</span>
            <input
              value={invoiceDesc}
              onChange={e => setInvoiceDesc(e.target.value)}
              className="input-field w-full text-sm"
              placeholder="Optional"
            />
          </label>
          <button type="submit" className="btn-primary text-sm px-3 flex items-center gap-1">
            <Plus size={14} /> Add
          </button>
        </form>

        {invoices?.length > 0 && (
          <div className="mt-4 border-t border-ink-50 pt-3 space-y-2">
            {invoices.slice(0, 6).map(inv => (
              <div key={inv.id} className="flex justify-between items-center text-sm">
                <span className="text-ink-600">{inv.description || formatDate(inv.createdAt)}</span>
                <span className="flex items-center gap-2 font-medium">
                  {formatMoney(inv.amountCents)} <StatusPill status={inv.status} />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function PlatformConsole({ onClose }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(useApi)
  const [orgs, setOrgs] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const detailCache = useRef(new Map())

  const loadOrgs = useCallback(async () => {
    if (!useApi) {
      setOrgs([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setOrgs(await fetchVendorOrganizations())
    } catch (err) {
      toast({ message: err.message || AUTH_ERRORS.forbidden, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { loadOrgs() }, [loadOrgs])

  const cacheDetail = useCallback((orgId, detail) => {
    detailCache.current.set(orgId, detail)
  }, [])

  const patchOrgInList = useCallback((orgId, { subscription }) => {
    setOrgs(prev => prev.map(org => (
      org.id === orgId
        ? { ...org, subscription }
        : org
    )))
  }, [])

  const handleBack = useCallback(() => {
    setSelectedId(null)
  }, [])

  return (
    <Modal
      icon={Building2}
      iconClass="bg-violet-600"
      title={AUTH_BILLING.platformHeading}
      subtitle={AUTH_BILLING.platformSubtitle}
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      {selectedId ? (
        <OrgDetail
          orgId={selectedId}
          cachedDetail={detailCache.current.get(selectedId) ?? null}
          onCacheDetail={cacheDetail}
          onOrgListPatch={patchOrgInList}
          onBack={handleBack}
        />
      ) : loading ? (
        <InlineLoader label="Loading organizations…" />
      ) : orgs.length === 0 ? (
        <p className="text-sm text-ink-400 text-center py-12">No organizations yet.</p>
      ) : (
        <>
          <p className="text-xs text-ink-400 mb-3">{AUTH_BILLING.selectOrg}</p>
          <div className="border border-ink-100 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-ink-50/80 text-xs text-ink-500 uppercase">
                  <th className="text-left px-3 py-2.5 font-semibold">Organization</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Plan</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Users</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Surveys</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map(org => (
                  <tr
                    key={org.id}
                    className="border-t border-ink-50 hover:bg-violet-50/40 cursor-pointer transition-colors"
                    onClick={() => setSelectedId(org.id)}
                  >
                    <td className="px-3 py-3 font-medium text-ink-800">{org.name}</td>
                    <td className="px-3 py-3 text-ink-600">{org.subscription?.planName ?? '—'}</td>
                    <td className="px-3 py-3">
                      {org.subscription?.status
                        ? <StatusPill status={org.subscription.status} />
                        : <span className="text-ink-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-ink-600">{org.userCount}</td>
                    <td className="px-3 py-3 text-right text-ink-600">{org.surveyCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  )
}

export default PlatformConsole
