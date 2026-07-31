// ─── Platform-level settings (shared across all surveys) ──────────────────
// These are the editable lists that survey creators manage: clients and topics.
// Stored separately from individual surveys so adding a new client is done once.

const CLIENTS_KEY = 'sf_platform_clients'
const TOPICS_KEY  = 'sf_platform_topics'

const DEFAULT_CLIENTS = [
  { id: 'c_dmr', name: 'DMR' },
  { id: 'c_fsi', name: 'FSI' },
  { id: 'c_apg', name: 'APG' },
]

const DEFAULT_TOPICS = [
  { id: 't_beauty',     name: 'Beauty' },
  { id: 't_education',  name: 'Education' },
  { id: 't_healthcare', name: 'Healthcare' },
  { id: 't_gaming',     name: 'Gaming' },
  { id: 't_pets',       name: 'Pets' },
]

export const SURVEY_TYPES = [
  { id: 'consumer',  label: 'Consumer' },
  { id: 'b2b',       label: 'B2B' },
  { id: 'hcp',       label: 'HCP' },
  { id: 'patient',   label: 'Patient' },
  { id: 'caregiver', label: 'Caregiver' },
]

export const SURVEY_STATUSES = [
  { id: 'draft',  label: 'Draft',  color: 'text-ink-600  bg-ink-100  border-ink-200' },
  { id: 'live',   label: 'Live',   color: 'text-emerald-700 bg-emerald-100 border-emerald-200' },
  { id: 'paused', label: 'Paused', color: 'text-amber-700 bg-amber-100 border-amber-200' },
  { id: 'closed', label: 'Closed', color: 'text-rose-700  bg-rose-100  border-rose-200' },
]

function load(key, defaults) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaults
  } catch { return defaults }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* noop */ }
}

const newId = () => `pid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

// ─── Clients ───────────────────────────────────────────────────────────────
export function loadClients()             { return load(CLIENTS_KEY, DEFAULT_CLIENTS) }
function saveClients(clients)      { save(CLIENTS_KEY, clients) }
export function addClient(name)           {
  const updated = [...loadClients(), { id: newId(), name: name.trim() }]
  saveClients(updated); return updated
}
export function updateClient(id, name)    {
  const updated = loadClients().map(c => c.id === id ? { ...c, name: name.trim() } : c)
  saveClients(updated); return updated
}
export function deleteClient(id)          {
  const updated = loadClients().filter(c => c.id !== id)
  saveClients(updated); return updated
}

// ─── Topics ────────────────────────────────────────────────────────────────
export function loadTopics()              { return load(TOPICS_KEY, DEFAULT_TOPICS) }
function saveTopics(topics)        { save(TOPICS_KEY, topics) }
export function addTopic(name)            {
  const updated = [...loadTopics(), { id: newId(), name: name.trim() }]
  saveTopics(updated); return updated
}
export function updateTopic(id, name)     {
  const updated = loadTopics().map(t => t.id === id ? { ...t, name: name.trim() } : t)
  saveTopics(updated); return updated
}
export function deleteTopic(id)           {
  const updated = loadTopics().filter(t => t.id !== id)
  saveTopics(updated); return updated
}
