import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Trash2, Edit3, Check, Settings } from 'lucide-react'
import {
  loadClients, loadTopics, loadSurveyTypes,
  addClient, updateClient, deleteClient,
  addTopic, updateTopic, deleteTopic,
  addSurveyType, updateSurveyType, deleteSurveyType,
} from '@/utils/data/platformStore'
import { getUsers } from '@/utils/data/authStore'
import { useApi } from '@/config/api'
import {
  fetchClients, createClient, updateClientApi, deleteClientApi,
  fetchTopics, createTopic, updateTopicApi, deleteTopicApi,
  fetchSurveyTypes, createSurveyType, updateSurveyTypeApi, deleteSurveyTypeApi,
  fetchUsers,
} from '@/api/platform/platform'
import { fetchMe } from '@/api/auth/profile'
import { fetchBillingOverview } from '@/api/platform/billing'
import { BrandKitPanel } from './BrandKitPanel.jsx'
import { DomainVerificationPanel } from './DomainVerificationPanel.jsx'
import { ProfileSettingsPanel } from './ProfileSettingsPanel.jsx'
import { TeamUserManager } from './TeamUserManager.jsx'

const SETTINGS_TABS = [
  ['lists', 'Classification labels'],
  ['brandKit', 'Branding'],
  ['domain', 'Domain'],
  ['users', 'Users'],
]

// ─── Editable list (clients / topics / types) ───────────────────────────────
function EditableList({ label, description, items, onAdd, onUpdate, onDelete, placeholder }) {
  const [newText,   setNewText]   = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText,  setEditText]  = useState('')

  const handleAdd = () => {
    if (!newText.trim()) return
    onAdd(newText.trim())
    setNewText('')
  }
  const startEdit = (item) => { setEditingId(item.id); setEditText(item.name) }
  const commitEdit = () => { if (editText.trim()) onUpdate(editingId, editText.trim()); setEditingId(null) }

  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50/40 p-4">
      <p className="text-sm font-semibold text-ink-800">{label}</p>
      {description && (
        <p className="text-xs text-ink-400 mt-1 mb-3 leading-relaxed">{description}</p>
      )}
      {!description && <div className="mb-3" />}
      <div className="space-y-1.5 mb-3">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 group">
            {editingId === item.id ? (
              <>
                <input autoFocus type="text" value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null) }}
                  className="input-base py-1.5 text-sm flex-1" />
                <button onClick={commitEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check size={14} /></button>
                <button onClick={() => setEditingId(null)} className="p-1.5 text-ink-400 hover:bg-ink-100 rounded-lg"><X size={14} /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-ink-700 px-2 py-1.5 rounded-lg group-hover:bg-ink-50">{item.name}</span>
                <button onClick={() => startEdit(item)} className="p-1.5 text-ink-300 hover:text-ink-600 hover:bg-ink-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Edit3 size={13} /></button>
                <button onClick={() => onDelete(item.id)} className="p-1.5 text-ink-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={13} /></button>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-ink-400 italic py-2 px-2">
            None yet — add your first below. Labels are optional and used for filtering surveys.
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <input type="text" value={newText} onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={placeholder} className="input-base py-1.5 text-sm flex-1" />
        <button onClick={handleAdd} disabled={!newText.trim()}
          className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 px-3 py-1.5 hover:bg-brand-50 border border-brand-200 rounded-lg transition-all disabled:opacity-30">
          <Plus size={14} /> Add
        </button>
      </div>
    </div>
  )
}

// ─── Main PlatformSettings ─────────────────────────────────────────────────
export function PlatformSettings({ onClose, session, onSessionUpdate }) {
  const [clients, setClients] = useState(loadClients)
  const [topics,  setTopics]  = useState(loadTopics)
  const [surveyTypes, setSurveyTypes] = useState(loadSurveyTypes)
  const [users,   setUsers]   = useState(getUsers)
  const [profile, setProfile] = useState(null)
  const [seatUsage, setSeatUsage] = useState(null)
  const [tab,     setTab]     = useState('lists')
  const [loading, setLoading] = useState(useApi)

  const loadFromApi = useCallback(async () => {
    if (!useApi) return
    setLoading(true)
    try {
      const [c, t, st, u, me, billing] = await Promise.all([
        fetchClients(), fetchTopics(), fetchSurveyTypes(), fetchUsers(),
        fetchMe().catch(() => null),
        fetchBillingOverview().catch(() => null),
      ])
      setClients(c)
      setTopics(t)
      setSurveyTypes(st)
      setUsers(u)
      if (me?.session) setProfile(me.session)
      if (billing?.usage && billing?.subscription) {
        setSeatUsage({ used: billing.usage.users, total: billing.subscription.seats })
      }
    } catch (err) {
      console.error('Failed to load platform settings', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleProfileSaved = (user) => {
    setProfile(prev => ({ ...prev, ...user }))
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...user } : u))
  }

  useEffect(() => {
    if (useApi) loadFromApi()
    else if (session) setProfile(session)
  }, [loadFromApi, session])

  const handleAddClient = async (name) => {
    if (useApi) {
      const client = await createClient(name)
      setClients(prev => [...prev, client])
      return
    }
    setClients(addClient(name))
  }

  const handleUpdateClient = async (id, name) => {
    if (useApi) {
      const client = await updateClientApi(id, name)
      setClients(prev => prev.map(c => c.id === id ? client : c))
      return
    }
    setClients(updateClient(id, name))
  }

  const handleDeleteClient = async (id) => {
    if (useApi) {
      await deleteClientApi(id)
      setClients(prev => prev.filter(c => c.id !== id))
      return
    }
    setClients(deleteClient(id))
  }

  const handleAddTopic = async (name) => {
    if (useApi) {
      const topic = await createTopic(name)
      setTopics(prev => [...prev, topic])
      return
    }
    setTopics(addTopic(name))
  }

  const handleUpdateTopic = async (id, name) => {
    if (useApi) {
      const topic = await updateTopicApi(id, name)
      setTopics(prev => prev.map(t => t.id === id ? topic : t))
      return
    }
    setTopics(updateTopic(id, name))
  }

  const handleDeleteTopic = async (id) => {
    if (useApi) {
      await deleteTopicApi(id)
      setTopics(prev => prev.filter(t => t.id !== id))
      return
    }
    setTopics(deleteTopic(id))
  }

  const handleAddSurveyType = async (name) => {
    if (useApi) {
      const surveyType = await createSurveyType(name)
      setSurveyTypes(prev => [...prev, surveyType])
      return
    }
    setSurveyTypes(addSurveyType(name))
  }

  const handleUpdateSurveyType = async (id, name) => {
    if (useApi) {
      const surveyType = await updateSurveyTypeApi(id, name)
      setSurveyTypes(prev => prev.map(t => t.id === id ? surveyType : t))
      return
    }
    setSurveyTypes(updateSurveyType(id, name))
  }

  const handleDeleteSurveyType = async (id) => {
    if (useApi) {
      await deleteSurveyTypeApi(id)
      setSurveyTypes(prev => prev.filter(t => t.id !== id))
      return
    }
    setSurveyTypes(deleteSurveyType(id))
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${tab === 'brandKit' ? 'max-w-5xl' : 'max-w-4xl'}`}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-100 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-ink-800 flex items-center justify-center">
            <Settings size={16} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-ink-800">Platform Settings</h2>
            <p className="text-xs text-ink-400">Classification labels, branding, domain and users</p>
          </div>
          <button onClick={onClose} className="p-2 text-ink-400 hover:text-ink-700 hover:bg-ink-100 rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-ink-100 px-5 shrink-0 overflow-x-auto">
          {SETTINGS_TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`text-sm font-medium px-1 py-3 mr-6 border-b-2 transition-colors whitespace-nowrap ${
                tab === id ? 'border-brand-500 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (tab === 'lists' || tab === 'users') ? (
            <p className="text-sm text-ink-400 text-center py-8">Loading settings…</p>
          ) : tab === 'lists' ? (
            <div className="space-y-5">
              <p className="text-sm text-ink-500 leading-relaxed">
                Add the labels your team uses to organise surveys. They appear when tagging surveys
                and as filters on the dashboard — only what you define here, nothing preset.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <EditableList
                  label="Clients"
                  description="Who the survey is for — e.g. Acme Corp, Internal."
                  items={clients}
                  onAdd={handleAddClient}
                  onUpdate={handleUpdateClient}
                  onDelete={handleDeleteClient}
                  placeholder="Add client…"
                />
                <EditableList
                  label="Topics"
                  description="Subject area — e.g. Brand tracking, UX research."
                  items={topics}
                  onAdd={handleAddTopic}
                  onUpdate={handleUpdateTopic}
                  onDelete={handleDeleteTopic}
                  placeholder="Add topic…"
                />
                <EditableList
                  label="Audience types"
                  description="Respondent profile — e.g. Consumer, B2B, HCP."
                  items={surveyTypes}
                  onAdd={handleAddSurveyType}
                  onUpdate={handleUpdateSurveyType}
                  onDelete={handleDeleteSurveyType}
                  placeholder="Add audience type…"
                />
              </div>
            </div>
          ) : tab === 'users' ? (
            <div className="space-y-5">
              <ProfileSettingsPanel
                session={session}
                profile={profile}
                onSessionUpdate={onSessionUpdate}
                onProfileSaved={handleProfileSaved}
              />
              <TeamUserManager
                users={users}
                setUsers={setUsers}
                session={session}
                seatUsage={seatUsage}
              />
            </div>
          ) : tab === 'brandKit' ? (
            <BrandKitPanel embedded />
          ) : (
            <DomainVerificationPanel embedded />
          )}
        </div>

        <div className="px-5 pb-5 flex justify-end shrink-0">
          <button onClick={onClose} className="btn-primary px-6">Done</button>
        </div>
      </div>
    </div>
  )
}

export default PlatformSettings
