import { useState, useEffect, useCallback } from 'react'
import {
  Building2, ChevronLeft, MessageSquare, Send, Plus,
} from 'lucide-react'
import { useApi } from '@/config/api'
import { AUTH_BILLING, AUTH_ERRORS } from '@/constants/authCopy'
import {
  fetchVendorOrganizations,
  fetchVendorOrganization,
  updateVendorSubscription,
  createVendorInvoice,
  fetchVendorSupportThread,
  postVendorSupportMessage,
  markVendorThreadSeen,
} from '@/api/vendor'
import { InlineLoader, Modal, StatusPill, useToast } from '@/components/ui'
import { formatMoney, formatDate } from '@/utils/format'

const PLANS = [
  { id: 'starter', name: 'Starter' },
  { id: 'professional', name: 'Professional' },
  { id: 'enterprise', name: 'Enterprise' },
]

const STATUSES = ['trialing', 'active', 'past_due', 'canceled']

function OrgDetail({ orgId, onBack, onNotificationsChange }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [support, setSupport] = useState(null)
  const [planId, setPlanId] = useState('starter')
  const [status, setStatus] = useState('active')
  const [saving, setSaving] = useState(false)
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [invoiceDesc, setInvoiceDesc] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [orgData, supportData] = await Promise.all([
        fetchVendorOrganization(orgId),
        fetchVendorSupportThread(orgId),
      ])
      setDetail(orgData)
      setSupport(supportData)
      setPlanId(orgData.subscription.planId)
      setStatus(orgData.subscription.status)
      await markVendorThreadSeen(orgId).catch(() => {})
      onNotificationsChange?.()
    } catch (err) {
      toast({ message: err.message || AUTH_ERRORS.forbidden, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [orgId, toast, onNotificationsChange])

  useEffect(() => { load() }, [load])

  const saveSubscription = async () => {
    setSaving(true)
    try {
      const data = await updateVendorSubscription(orgId, { planId, status })
      setDetail(prev => ({ ...prev, subscription: data.subscription }))
      toast({ message: 'Subscription updated.', type: 'success' })
      onNotificationsChange?.()
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
      setDetail(prev => ({
        ...prev,
        invoices: [data.invoice, ...(prev.invoices || [])],
      }))
      setInvoiceAmount('')
      setInvoiceDesc('')
      toast({ message: 'Invoice created.', type: 'success' })
      onNotificationsChange?.()
    } catch (err) {
      toast({ message: err.message || AUTH_ERRORS.forbidden, type: 'error' })
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    try {
      const data = await postVendorSupportMessage(orgId, body)
      setSupport(prev => ({
        ...prev,
        messages: [...(prev?.messages || []), data.message],
      }))
      setDraft('')
      onNotificationsChange?.()
    } catch (err) {
      toast({ message: err.message || AUTH_ERRORS.forbidden, type: 'error' })
    } finally {
      setSending(false)
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
        <p className="text-xs text-ink-400">
          Current: {subscription.planName} · {formatMoney(subscription.priceCents)} · renews {formatDate(subscription.currentPeriodEnd)}
        </p>
        <button type="button" onClick={saveSubscription} disabled={saving} className="btn-primary text-sm px-4">
          {saving ? 'Saving…' : 'Save subscription'}
        </button>
      </div>

      <div className="border border-ink-100 rounded-xl p-4 mb-6">
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

      <div className="border border-ink-100 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={15} className="text-brand-600" />
          <h4 className="text-sm font-semibold text-ink-800">Support thread</h4>
        </div>
        <div className="max-h-40 overflow-y-auto space-y-2 mb-3 bg-ink-50/40 rounded-lg p-3">
          {(support?.messages || []).length === 0 ? (
            <p className="text-xs text-ink-400 text-center py-4">No messages yet.</p>
          ) : support.messages.map(msg => (
            <div key={msg.id} className="text-sm">
              <p className="text-xs text-ink-400">{msg.author.name} · {formatDate(msg.createdAt)}</p>
              <p className="text-ink-700 whitespace-pre-wrap">{msg.body}</p>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} className="flex gap-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={2}
            placeholder="Reply to this organization…"
            className="flex-1 input-field text-sm resize-none"
          />
          <button type="submit" disabled={!draft.trim() || sending} className="btn-primary px-3 self-end">
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  )
}

export function PlatformConsole({ onClose, onNotificationsChange }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(useApi)
  const [orgs, setOrgs] = useState([])
  const [selectedId, setSelectedId] = useState(null)

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
          onBack={() => { setSelectedId(null); loadOrgs(); onNotificationsChange?.() }}
          onNotificationsChange={onNotificationsChange}
        />
      ) : loading ? (
        <InlineLoader label="Loading organizations…" />
      ) : orgs.length === 0 ? (
        <p className="text-sm text-ink-400 text-center py-12">No organizations yet.</p>
      ) : (
        <>
          <p className="text-xs text-ink-400 mb-3">{AUTH_BILLING.selectOrg}</p>
          <div className="border border-ink-100 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-ink-50/80 text-xs text-ink-500 uppercase">
                  <th className="text-left px-3 py-2.5 font-semibold">Organization</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Plan</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Users</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Surveys</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Support</th>
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
                    <td className="px-3 py-3 text-right">
                      {org.unreadMessages > 0 ? (
                        <span className="inline-flex min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-xs font-bold items-center justify-center">
                          {org.unreadMessages > 9 ? '9+' : org.unreadMessages}
                        </span>
                      ) : (
                        <span className="text-ink-300">—</span>
                      )}
                    </td>
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
