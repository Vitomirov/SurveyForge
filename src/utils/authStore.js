// ─── Auth store ────────────────────────────────────────────────────────────
// Local mode: credentials in localStorage (self-hosted / offline).
// API mode:   JWT in sessionStorage via POST /api/auth/login (Phase B2+).

import { useApi } from '@/config/api'
import { apiFetch } from '@/api/client'
import { setAuthToken, clearAuthToken, getAuthToken } from '@/api/token'

const USERS_KEY   = 'sf_users'
const SESSION_KEY = 'sf_session'

const DEFAULT_USERS = [
  { id: 'u_admin', username: 'admin', password: 'admin123', role: 'admin', name: 'Admin' },
]

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_USERS
  } catch { return DEFAULT_USERS }
}

function saveUsers(users) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)) } catch {}
}

const newId = () => `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

function readSessionStorage() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function writeSessionStorage(session) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch {}
}

// ─── Session ───────────────────────────────────────────────────────────────
export function getSession() {
  if (useApi) {
    if (!getAuthToken()) return null
    return readSessionStorage()
  }
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export async function login(username, password) {
  if (useApi) {
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      setAuthToken(data.token)
      writeSessionStorage(data.session)
      return { ok: true, session: data.session }
    } catch (err) {
      return { ok: false, error: err.message || 'Invalid username or password.' }
    }
  }

  const users = loadUsers()
  const user  = users.find(
    u => u.username.toLowerCase() === username.toLowerCase().trim() &&
         u.password === password
  )
  if (!user) return { ok: false, error: 'Invalid username or password.' }
  const session = {
    userId: user.id, username: user.username, name: user.name,
    role: user.role, loginAt: new Date().toISOString(),
  }
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch {}
  return { ok: true, session }
}

export function logout() {
  if (useApi) {
    clearAuthToken()
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
    return
  }
  try { localStorage.removeItem(SESSION_KEY) } catch {}
}

// ─── User management (admin only — local mode until B4 API) ────────────────
export function getUsers()              { return loadUsers() }

export function addUser({ username, password, name, role = 'editor' }) {
  const users = loadUsers()
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase()))
    return { ok: false, error: 'Username already exists.' }
  const newUser = { id: newId(), username: username.trim(), password, name: name.trim(), role }
  saveUsers([...users, newUser])
  return { ok: true, user: newUser }
}

export function updateUser(id, patch) {
  const users   = loadUsers()
  const updated = users.map(u => u.id === id ? { ...u, ...patch } : u)
  saveUsers(updated)
  return updated
}

export function deleteUser(id) {
  const updated = loadUsers().filter(u => u.id !== id)
  saveUsers(updated)
  return updated
}
