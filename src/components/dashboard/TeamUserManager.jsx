import { useMemo, useState } from 'react'
import { Plus, Trash2, Edit3, Check, X, Eye, EyeOff, Search, RefreshCw } from 'lucide-react'
import { useApi } from '@/config/api'
import { createUser, updateUserApi, deleteUserApi } from '@/api/platform/platform'
import { addUser, updateUser, deleteUser } from '@/utils/data/authStore'
import { roleLabel } from '@/utils/platform/permissions'
import { AUTH_TEAM, AUTH_PROFILE } from '@/constants/authCopy'
import { UserAvatar } from './UserAvatar.jsx'

function generatePassword() {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$'
  let out = ''
  for (let i = 0; i < 14; i += 1) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export function TeamUserManager({ users, setUsers, session, seatUsage, hideHeader = false }) {
  const [showForm, setShowForm] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [editId, setEditId] = useState(null)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'editor' })
  const [error, setError] = useState('')
  const [revealed, setRevealed] = useState(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    )
  }, [users, query])

  const resetForm = () => {
    setForm({ username: '', password: '', name: '', role: 'editor' })
    setError('')
    setEditId(null)
    setShowForm(false)
  }

  const handleSubmit = async () => {
    if (!form.username.trim() || !form.name.trim()) {
      setError('Username and display name are required.')
      return
    }
    if (!editId && !form.password) {
      setError('Password is required for new users.')
      return
    }
    if (form.password && form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (useApi) {
      try {
        if (editId) {
          const patch = {
            name: form.name.trim(),
            username: form.username.trim(),
            role: form.role,
          }
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
      const patch = { name: form.name.trim(), username: form.username.trim(), role: form.role }
      if (form.password) patch.password = form.password
      setUsers(updateUser(editId, patch))
    } else {
      const result = addUser({
        username: form.username.trim(),
        password: form.password,
        name: form.name.trim(),
        role: form.role,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setUsers(prev => [...prev, result.user])
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
    if (users.length <= 1) {
      alert('Cannot delete the last user.')
      return
    }
    if (!window.confirm('Remove this team member? They will lose access immediately.')) return

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

  const seatsLabel = seatUsage
    ? `${seatUsage.used}/${seatUsage.total} ${AUTH_PROFILE.seatsUsed}`
    : `${users.length} ${AUTH_PROFILE.seatsUsed}`

  return (
    <section className="rounded-xl border border-ink-100 bg-ink-50/40 p-4 sm:p-5">
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

      <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 ${hideHeader ? 'sm:justify-end' : ''}`}>
        {!hideHeader && (
          <div>
            <h3 className="text-sm font-bold text-ink-800">{AUTH_PROFILE.teamMembers}</h3>
            <p className="text-xs text-ink-400 mt-1 leading-relaxed max-w-xl">{AUTH_PROFILE.teamHint}</p>
          </div>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-ink-500 bg-white border border-ink-200 rounded-lg px-2.5 py-1">
            {seatsLabel}
          </span>
          {!showForm && (
            <button
              type="button"
              onClick={() => {
                setShowForm(true)
                setEditId(null)
                setForm({ username: '', password: generatePassword(), name: '', role: 'editor' })
              }}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 px-2.5 py-1.5 hover:bg-brand-50 border border-brand-200 rounded-lg transition-all"
            >
              <Plus size={12} /> Add member
            </button>
          )}
        </div>
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={AUTH_PROFILE.searchMembers}
          className="input-base py-1.5 text-sm pl-9 w-full bg-white"
        />
      </div>

      <div className="space-y-1 mb-3">
        {filtered.map(u => {
          const isSelf = u.id === session?.userId
          return (
            <div
              key={u.id}
              className="flex items-center gap-3 group px-2 py-2 rounded-lg hover:bg-white border border-transparent hover:border-ink-100 transition-all"
            >
              <UserAvatar user={u} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-ink-700 truncate">{u.name}</p>
                  {isSelf && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                      {AUTH_PROFILE.you}
                    </span>
                  )}
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    u.role === 'admin' ? 'text-violet-700 bg-violet-50' : 'text-ink-500 bg-ink-100'
                  }`}>
                    {roleLabel(u.role)}
                  </span>
                </div>
                <p className="text-xs text-ink-400 truncate">@{u.username}{u.email ? ` · ${u.email}` : ''}</p>
              </div>
              <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                <button
                  type="button"
                  onClick={() => startEdit(u)}
                  className="p-1.5 text-ink-400 hover:text-ink-600 hover:bg-ink-100 rounded-lg"
                  title="Edit member"
                >
                  <Edit3 size={13} />
                </button>
                {!isSelf && (
                  <button
                    type="button"
                    onClick={() => handleDelete(u.id)}
                    className="p-1.5 text-ink-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                    title="Remove member"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-ink-400 italic py-4 px-2 text-center">{AUTH_PROFILE.noMembers}</p>
        )}
      </div>

      {showForm && (
        <div className="border border-ink-200 rounded-xl p-3 sm:p-4 bg-white space-y-3">
          <p className="text-xs font-semibold text-ink-600">{editId ? 'Edit team member' : 'Invite team member'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink-500 mb-1 block">{AUTH_PROFILE.displayName}</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Jane Smith"
                className="input-base py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-ink-500 mb-1 block">{AUTH_PROFILE.username}</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="jsmith"
                className="input-base py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-ink-500 mb-1 block">
                {editId ? AUTH_PROFILE.resetPassword : 'Temporary password'}
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={editId ? 'Leave blank to keep' : '••••••••'}
                  className="input-base py-1.5 text-sm pr-16"
                />
                <div className="absolute right-1 top-1 flex gap-0.5">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, password: generatePassword() }))}
                    className="p-1.5 text-ink-400 hover:text-brand-600 rounded-lg"
                    title={AUTH_PROFILE.generatePassword}
                  >
                    <RefreshCw size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="p-1.5 text-ink-400 hover:text-ink-600 rounded-lg"
                  >
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              {editId && (
                <p className="text-[11px] text-ink-400 mt-1">{AUTH_PROFILE.adminResetHint}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-ink-500 mb-1 block">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="input-base py-1.5 text-sm"
              >
                <option value="admin">Admin</option>
                <option value="editor">User</option>
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={resetForm} className="flex-1 btn-ghost border border-ink-200 text-sm py-1.5">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} className="flex-1 btn-primary text-sm py-1.5">
              {editId ? 'Save changes' : 'Add member'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default TeamUserManager
