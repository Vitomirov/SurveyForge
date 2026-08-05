import { useState, useEffect, useCallback } from 'react'
import { CreditCard, MessageSquare, Send } from 'lucide-react'
import { useApi } from '@/config/api'
import { AUTH_BILLING, AUTH_ERRORS } from '@/constants/authCopy'
import {
  fetchBillingOverview,
  fetchBillingSupport,
  postBillingSupportMessage,
  markBillingSeen,
} from '@/api/billing'
import { InlineLoader, Modal, StatusPill, useToast } from '@/components/ui'
import { formatMoney, formatDate } from '@/utils/format'

function SupportSection({ onSent }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchBillingSupport()
      setMessages(data.messages || [])
    } catch (err) {
      toast({ message: err.message || AUTH_ERRORS.forbidden, type: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const send = async (e) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    try {
      const data = await postBillingSupportMessage(body)
      setMessages(prev => [...prev, data.message])
      setDraft('')
      onSent?.()
    } catch (err) {
      toast({ message: err.message || AUTH_ERRORS.forbidden, type: 'error' })
    } finally {
      setSending(false)
    }
  }

  if (loading) return <InlineLoader label="Loading support…" />

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink-800 mb-1">{AUTH_BILLING.supportHeading}</h3>
      <p className="text-xs text-ink-400 mb-4">{AUTH_BILLING.supportSubtitle}</p>

      <div className="border border-ink-100 rounded-xl max-h-56 overflow-y-auto p-3 space-y-3 mb-3 bg-ink-50/40">
        {messages.length === 0 ? (
          <p className="text-sm text-ink-400 text-center py-6">No messages yet. Start a conversation below.</p>
        ) : messages.map(msg => (
          <div key={msg.id} className="text-sm">
            <p className="text-xs text-ink-400 mb-0.5">
              {msg.author.name} · {formatDate(msg.createdAt)}
            </p>
            <p className="text-ink-700 whitespace-pre-wrap">{msg.body}</p>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={AUTH_BILLING.supportPlaceholder}
          rows={2}
          className="flex-1 input-field text-sm resize-none"
        />
        <button type="submit" disabled={!draft.trim() || sending} className="btn-primary px-3 self-end">
          <Send size={15} />
        </button>
      </form>
    </div>
  )
}

export function BillingPanel({ onClose, onOpen }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(useApi)
  const [overview, setOverview] = useState(null)

  useEffect(() => {
    if (!useApi) {
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    Promise.all([
      fetchBillingOverview(),
      markBillingSeen().catch(() => {}),
    ])
      .then(([data]) => {
        if (alive) {
          setOverview(data)
          onOpen?.()
        }
      })
      .catch(err => {
        if (alive) toast({ message: err.message || AUTH_ERRORS.forbidden, type: 'error' })
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [toast, onOpen])

  const sub = overview?.subscription
  const invoices = overview?.invoices ?? []

  return (
    <Modal
      icon={CreditCard}
      title={AUTH_BILLING.heading}
      subtitle={AUTH_BILLING.subtitle}
      onClose={onClose}
      bodyClassName="space-y-8"
    >
      {loading ? (
        <InlineLoader label="Loading billing…" />
      ) : (
        <>
          {sub && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="border border-ink-100 rounded-xl p-4">
                <p className="text-xs text-ink-400 uppercase tracking-wide mb-1">{AUTH_BILLING.plan}</p>
                <p className="text-lg font-bold text-ink-800">{sub.planName}</p>
                <p className="text-sm text-ink-500 mt-1">{formatMoney(sub.priceCents, sub.currency)} / month</p>
              </div>
              <div className="border border-ink-100 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-ink-400">{AUTH_BILLING.status}</span>
                  <StatusPill status={sub.status} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-400">{AUTH_BILLING.seats}</span>
                  <span className="font-medium text-ink-700">{sub.seats}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-400">{AUTH_BILLING.periodEnd}</span>
                  <span className="font-medium text-ink-700">{formatDate(sub.currentPeriodEnd)}</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-ink-800 mb-3">{AUTH_BILLING.invoices}</h3>
            {invoices.length === 0 ? (
              <p className="text-sm text-ink-400 text-center py-6 border border-dashed border-ink-200 rounded-xl">
                {AUTH_BILLING.noInvoices}
              </p>
            ) : (
              <div className="border border-ink-100 rounded-xl overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="bg-ink-50/80 text-xs text-ink-500 uppercase">
                      <th className="text-left px-3 py-2.5 font-semibold">Date</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Description</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Amount</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} className="border-t border-ink-50">
                        <td className="px-3 py-2.5 text-ink-600">{formatDate(inv.createdAt)}</td>
                        <td className="px-3 py-2.5 text-ink-700">{inv.description || '—'}</td>
                        <td className="px-3 py-2.5 text-right font-medium">{formatMoney(inv.amountCents, inv.currency)}</td>
                        <td className="px-3 py-2.5 text-right"><StatusPill status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border-t border-ink-100 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={16} className="text-brand-600" />
              <span className="text-sm font-semibold text-ink-800">Support</span>
            </div>
            <SupportSection onSent={onOpen} />
          </div>
        </>
      )}
    </Modal>
  )
}

export default BillingPanel
