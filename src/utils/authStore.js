// ─── Auth store ────────────────────────────────────────────────────────────
// Simple credential management for a local/white-label deployment.
// NOT cryptographically secure — designed for team access control on a
// self-hosted instance, not for protecting sensitive data on the internet.

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

const newId = () => `u_${Date.now()}_${Math.random().toString(36).slice(2,6)}`

// ─── Session ───────────────────────────────────────────────────────────────
export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function login(username, password) {
  const users = loadUsers()
  const user  = users.find(
    u => u.username.toLowerCase() === username.toLowerCase().trim() &&
         u.password === password
  )
  if (!user) return { ok: false, error: 'Invalid username or password.' }
  const session = { userId: user.id, username: user.username, name: user.name, role: user.role, loginAt: new Date().toISOString() }
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch {}
  return { ok: true, session }
}

export function logout() {
  try { localStorage.removeItem(SESSION_KEY) } catch {}
}

// ─── User management (admin only) ─────────────────────────────────────────
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
