// ─── DNC (Do Not Contact) / Exclusion List ────────────────────────────────
// Local mode: per-survey list in localStorage.
// API mode:    Postgres via /api/surveys/:id/dnc with in-memory cache.

import { useApi } from '@/config/api'
import {
  fetchDNCList, fetchPublicDNCList, importDNC, clearDNCApi, removeDNCApi,
} from '@/api/dnc'

const key = (surveyId) => `sf_dnc_${surveyId}`
const dncCache = new Map()

// ─── Read ──────────────────────────────────────────────────────────────────
export function loadDNCList(surveyId) {
  if (useApi) return dncCache.get(surveyId) || []
  try {
    const raw = localStorage.getItem(key(surveyId))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export async function loadDNCListAsync(surveyId, { publicMode = false } = {}) {
  if (!useApi) return loadDNCList(surveyId)
  const data = publicMode
    ? await fetchPublicDNCList(surveyId)
    : await fetchDNCList(surveyId)
  dncCache.set(surveyId, data.emails || [])
  return dncCache.get(surveyId)
}

// ─── Check ─────────────────────────────────────────────────────────────────
/** Async DNC check — ensures API cache is loaded before matching. */
export async function isOnDNCListAsync(surveyId, email, { publicMode = false } = {}) {
  if (!email || !surveyId) return false
  const normalised = String(email).toLowerCase().trim()
  if (!normalised || !normalised.includes('@')) return false
  const list = useApi
    ? await loadDNCListAsync(surveyId, { publicMode })
    : loadDNCList(surveyId)
  return list.includes(normalised)
}

// ─── Import ────────────────────────────────────────────────────────────────
export function parseDNCCsv(csvText) {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const cells = csvText
    .split(/[\r\n,;]+/)
    .map(c => c.trim().replace(/^["']|["']$/g, '').toLowerCase())
    .filter(c => c.length > 0)

  const valid   = cells.filter(c => EMAIL_RE.test(c))
  const invalid = cells.filter(c => c.length > 3 && !EMAIL_RE.test(c) && c !== 'email').length
  const unique  = [...new Set(valid)]

  return { emails: unique, invalid, raw: cells.length }
}

export function importDNCEmails(surveyId, emails) {
  const existing = loadDNCList(surveyId)
  const merged   = [...new Set([...existing, ...emails.map(e => e.toLowerCase().trim())])]
  try {
    localStorage.setItem(key(surveyId), JSON.stringify(merged))
  } catch { /* noop */ }
  return merged.length
}

export async function importDNCEmailsAsync(surveyId, emails) {
  if (!useApi) return importDNCEmails(surveyId, emails)
  const result = await importDNC(surveyId, emails)
  await loadDNCListAsync(surveyId)
  return result.count
}

// ─── Clear ─────────────────────────────────────────────────────────────────
export function clearDNCList(surveyId) {
  try { localStorage.removeItem(key(surveyId)) } catch { /* noop */ }
}

export async function clearDNCListAsync(surveyId) {
  if (!useApi) {
    clearDNCList(surveyId)
    return
  }
  await clearDNCApi(surveyId)
  dncCache.set(surveyId, [])
}

export function removeDNCEmail(surveyId, email) {
  const normalised = email.toLowerCase().trim()
  const updated    = loadDNCList(surveyId).filter(e => e !== normalised)
  try {
    localStorage.setItem(key(surveyId), JSON.stringify(updated))
  } catch { /* noop */ }
  return updated
}

export async function removeDNCEmailAsync(surveyId, email) {
  if (!useApi) return removeDNCEmail(surveyId, email)
  await removeDNCApi(surveyId, email)
  const list = loadDNCList(surveyId).filter(e => e !== email.toLowerCase().trim())
  dncCache.set(surveyId, list)
  return list
}
