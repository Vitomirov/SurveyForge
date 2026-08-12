// ─── Auth store ────────────────────────────────────────────────────────────
// Local mode: credentials in localStorage (self-hosted / offline).
// API mode:   JWT in sessionStorage via POST /api/auth/login (Phase B2+).

import { useApi } from '@/config/api'
import { apiFetch } from '@/api/client'
import { setAuthToken, clearAuthToken, getAuthToken } from '@/api/auth/token'
import { AUTH_ERRORS } from '@/constants/authCopy'
import { newPrefixedId } from '@/store/id'

const USERS_KEY   = 'sf_users'
const SESSION_KEY = 'sf_session'

export const DEFAULT_CREDENTIALS = { username: 'admin', password: 'admin123' }

const DEFAULT_USERS = [
  { id: 'u_admin', username: DEFAULT_CREDENTIALS.username, password: DEFAULT_CREDENTIALS.password, role: 'admin', name: 'Admin' },
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
      return { ok: false, error: err.message || AUTH_ERRORS.invalidCredentials }
    }
  }

  const users = loadUsers()
  const user  = users.find(
    u => u.username.toLowerCase() === username.toLowerCase().trim() &&
         u.password === password
  )
  if (!user) return { ok: false, error: AUTH_ERRORS.invalidCredentials }
  const session = {
    userId: user.id, username: user.username, name: user.name,
    avatarUrl: user.avatarUrl || null,
    role: user.role, loginAt: new Date().toISOString(),
  }
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch {}
  return { ok: true, session }
}

export async function signup({ organizationName, name, username, password }) {
  if (useApi) {
    try {
      const data = await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ organizationName, name, username, password }),
      })
      setAuthToken(data.token)
      writeSessionStorage(data.session)
      return { ok: true, session: data.session }
    } catch (err) {
      return { ok: false, error: err.message || AUTH_ERRORS.signupFailed }
    }
  }

  // Local (offline) mode has no org concept — create the admin user locally.
  const users = loadUsers()
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase().trim())) {
    return { ok: false, error: AUTH_ERRORS.usernameTakenSignup }
  }
  const user = {
    id: newPrefixedId('u'), username: username.trim(), password,
    name: name.trim(), role: 'admin',
  }
  saveUsers([...users, user])
  const session = {
    userId: user.id, username: user.username, name: user.name,
    avatarUrl: user.avatarUrl || null,
    role: user.role, organizationName: organizationName?.trim(),
    loginAt: new Date().toISOString(),
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
    return { ok: false, error: AUTH_ERRORS.usernameTakenAdmin }
  const newUser = { id: newPrefixedId('u'), username: username.trim(), password, name: name.trim(), role }
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

export function updateSession(session) {
  if (useApi) {
    writeSessionStorage(session)
    return session
  }
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch {}
  return session
}

/** Refresh profile + lean JWT from the server (API mode). */
export async function refreshSessionFromApi() {
  if (!useApi || !getAuthToken()) return null
  try {
    const { fetchMe } = await import('@/api/auth/profile')
    const data = await fetchMe()
    if (data.token) setAuthToken(data.token)
    if (data.session) writeSessionStorage(data.session)
    return data.session
  } catch {
    return null
  }
}

/** Self-service profile update (local mode). */
export function updateProfileLocal(userId, patch) {
  const users = loadUsers()
  const user = users.find(u => u.id === userId)
  if (!user) return { ok: false, error: 'User not found.' }

  if (patch.username && users.some(u => u.id !== userId && u.username.toLowerCase() === patch.username.toLowerCase())) {
    return { ok: false, error: AUTH_ERRORS.usernameTakenSignup }
  }
  if (patch.newPassword) {
    if (!patch.currentPassword || patch.currentPassword !== user.password) {
      return { ok: false, error: 'Current password is incorrect.' }
    }
    patch.password = patch.newPassword
    delete patch.newPassword
    delete patch.currentPassword
  }

  const { newPassword: _np, currentPassword: _cp, ...safePatch } = patch
  const updatedUsers = users.map(u => u.id === userId ? { ...u, ...safePatch } : u)
  saveUsers(updatedUsers)
  const updated = updatedUsers.find(u => u.id === userId)
  const session = {
    userId: updated.id,
    username: updated.username,
    name: updated.name,
    avatarUrl: updated.avatarUrl || null,
    role: updated.role,
    loginAt: new Date().toISOString(),
  }
  updateSession(session)
  return { ok: true, user: updated, session }
}
