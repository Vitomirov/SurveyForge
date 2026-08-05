import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Trash2, Edit3, Check, Settings, Eye, EyeOff } from 'lucide-react'
import {
  loadClients, loadTopics, addClient, updateClient, deleteClient,
  addTopic, updateTopic, deleteTopic,
} from '@/utils/platformStore'
import { getUsers, addUser, updateUser, deleteUser } from '@/utils/authStore'
import { useApi } from '@/config/api'
import {
  fetchClients, createClient, updateClientApi, deleteClientApi,
  fetchTopics, createTopic, updateTopicApi, deleteTopicApi,
  fetchUsers, createUser, updateUserApi, deleteUserApi,
} from '@/api/platform'
import { roleLabel } from '@/utils/permissions'
import { AUTH_TEAM } from '@/constants/authCopy'

// ─── Editable list (clients / topics) ─────────────────────────────────────
function EditableList({ label, items, onAdd, onUpdate, onDelete, placeholder }) {
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
    <div>
      <p className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-3">{label}</p>
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
        {items.length === 0 && <p className="text-xs text-ink-300 italic py-2">No items yet.</p>}
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

// ─── User management ────────────────────────────────────────────────────────
function UserManager({ users, setUsers }) {
  const [showForm,  setShowForm]  = useState(false)
  const [showPass,  setShowPass]  = useState(false)
  const [editId,    setEditId]    = useState(null)
  const [form,      setForm]      = useState({ username: '', password: '', name: '', role: 'editor' })
  const [error,     setError]     = useState('')
  const [revealed,  setRevealed]  = useState(null)

  const resetForm = () => {
    setForm({ username: '', password: '', name: '', role: 'editor' })
    setError('')
    setEditId(null)
    setShowForm(false)
  }

  const handleSubmit = async () => {
    if (!form.username.trim() || !form.name.trim()) { setError('Username and name are required.'); return }
    if (!editId && !form.password) { setError('Password is required for new users.'); return }

    if (useApi) {
      try {
        if (editId) {
          const patch = { name: form.name.trim(), role: form.role }
          if (form.password) patch.password = form.password
          const data = await updateUserApi(editId, patch)
          setUsers(prev => prev.map(u => u.id === editId ? data.user : u))
          if (data.temporaryPassword) {
            setRevealed({
              username: data.user.username,
              password: data.temporaryPassword,
              reset: true,
            })
          }
        } else {
          const data = await createUser({
            username: form.username.trim(),
            password: form.password,
            name: form.name.trim(),
            role: form.role,
          })
          setUsers(prev => [...prev, data.user])
          if (data.temporaryPassword) {
            setRevealed({
              username: data.user.username,
              password: data.temporaryPassword,
              reset: false,
            })
          }
        }
        resetForm()
      } catch (err) {
        setError(err.message || 'Failed to save user.')
      }
      return
    }

    if (editId) {
      const patch = { name: form.name.trim(), role: form.role }
      if (form.password) patch.password = form.password
      setUsers(updateUser(editId, patch))
    } else {
      const result = addUser({ username: form.username.trim(), password: form.password, name: form.name.trim(), role: form.role })
      if (!result.ok) { setError(result.error); return }
      setUsers(getUsers())
    }
    resetForm()
  }

  const startEdit = (u) => {
    setEditId(u.id)
    setForm({ username: u.username, password: '', name: u.name, role: u.role })
    setError('')
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (users.length <= 1) { alert('Cannot delete the last user.'); return }
    if (!window.confirm('Delete this user?')) return

    if (useApi) {
      try {
        await deleteUserApi(id)
        setUsers(prev => prev.filter(u => u.id !== id))
      } catch (err) {
        alert(err.message || 'Failed to delete user.')
      }
      return
    }
    setUsers(deleteUser(id))
  }

  return (
    <div>
      {revealed && (
        <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm">
          <p className="font-semibold text-amber-900 mb-1">
            {revealed.reset ? AUTH_TEAM.passwordResetOnce : AUTH_TEAM.credentialsOnce}
          </p>
          <p className="text-ink-700 font-mono text-xs break-all">
            Username: {revealed.username}<br />
            Password: {revealed.password}
          </p>
          <button
            type="button"
            onClick={() => setRevealed(null)}
            className="mt-2 text-xs font-medium text-amber-800 hover:text-amber-950"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-ink-500 uppercase tracking-wider">Users</p>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ username: '', password: '', name: '', role: 'editor' }) }}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 px-2 py-1 hover:bg-brand-50 rounded-lg transition-all">
            <Plus size={12} /> Add user
          </button>
        )}
      </div>

      <div className="space-y-1.5 mb-3">
        {users.map(u => (
          <div key={u.id} className="flex items-center gap-2 group px-2 py-1.5 rounded-lg hover:bg-ink-50">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-600 shrink-0">
              {(u.name || u.username)[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-700 truncate">{u.name}</p>
              <p className="text-xs text-ink-400">@{u.username} · {roleLabel(u.role)}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => startEdit(u)} className="p-1.5 text-ink-400 hover:text-ink-600 hover:bg-ink-100 rounded-lg"><Edit3 size={13} /></button>
              <button onClick={() => handleDelete(u.id)} className="p-1.5 text-ink-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="border border-ink-200 rounded-xl p-3 bg-ink-50 space-y-2.5">
          <p className="text-xs font-semibold text-ink-600">{editId ? 'Edit user' : 'New user'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink-500 mb-1 block">Full name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Jane Smith" className="input-base py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-ink-500 mb-1 block">Username</label>
              <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="jsmith" disabled={!!editId} className="input-base py-1.5 text-sm disabled:opacity-50" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink-500 mb-1 block">{editId ? 'New password (optional)' : 'Password'}</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={editId ? 'Leave blank to keep' : '••••••••'}
                  className="input-base py-1.5 text-sm pr-8" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-2 top-2 text-ink-400 hover:text-ink-600">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-ink-500 mb-1 block">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input-base py-1.5 text-sm">
                <option value="admin">Admin</option>
                <option value="editor">User</option>
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={resetForm} className="flex-1 btn-ghost border border-ink-200 text-sm py-1.5">Cancel</button>
            <button onClick={handleSubmit} className="flex-1 btn-primary text-sm py-1.5">{editId ? 'Save' : 'Create'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main PlatformSettings ─────────────────────────────────────────────────
export function PlatformSettings({ onClose }) {
  const [clients, setClients] = useState(loadClients)
  const [topics,  setTopics]  = useState(loadTopics)
  const [users,   setUsers]   = useState(getUsers)
  const [tab,     setTab]     = useState('lists')
  const [loading, setLoading] = useState(useApi)

  const loadFromApi = useCallback(async () => {
    if (!useApi) return
    setLoading(true)
    try {
      const [c, t, u] = await Promise.all([fetchClients(), fetchTopics(), fetchUsers()])
      setClients(c)
      setTopics(t)
      setUsers(u)
    } catch (err) {
      console.error('Failed to load platform settings', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (useApi) loadFromApi()
  }, [loadFromApi])

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-100 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-ink-800 flex items-center justify-center">
            <Settings size={16} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-ink-800">Platform Settings</h2>
            <p className="text-xs text-ink-400">Manage shared lists and user access</p>
          </div>
          <button onClick={onClose} className="p-2 text-ink-400 hover:text-ink-700 hover:bg-ink-100 rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-ink-100 px-5 shrink-0">
          {[['lists', 'Clients & Topics'], ['users', 'Users']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`text-sm font-medium px-1 py-3 mr-6 border-b-2 transition-colors ${
                tab === id ? 'border-brand-500 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-ink-400 text-center py-8">Loading settings…</p>
          ) : tab === 'lists' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <EditableList label="Clients" items={clients}
                onAdd={handleAddClient}
                onUpdate={handleUpdateClient}
                onDelete={handleDeleteClient}
                placeholder="New client name…" />
              <EditableList label="Topics" items={topics}
                onAdd={handleAddTopic}
                onUpdate={handleUpdateTopic}
                onDelete={handleDeleteTopic}
                placeholder="New topic…" />
            </div>
          ) : (
            <UserManager users={users} setUsers={setUsers} />
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
