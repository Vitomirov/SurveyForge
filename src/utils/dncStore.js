// ─── DNC (Do Not Contact) / Exclusion List ────────────────────────────────
// Stored per survey in localStorage. Emails are normalised to lowercase
// so matching is case-insensitive.

const key = (surveyId) => `sf_dnc_${surveyId}`

// ─── Read ──────────────────────────────────────────────────────────────────
export function loadDNCList(surveyId) {
  try {
    const raw = localStorage.getItem(key(surveyId))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function getDNCCount(surveyId) {
  return loadDNCList(surveyId).length
}

// ─── Check ─────────────────────────────────────────────────────────────────
/** Returns true if the email is in the DNC list for this survey. */
export function isOnDNCList(surveyId, email) {
  if (!email || !surveyId) return false
  const normalised = String(email).toLowerCase().trim()
  if (!normalised || !normalised.includes('@')) return false
  return loadDNCList(surveyId).includes(normalised)
}

// ─── Import ────────────────────────────────────────────────────────────────
/**
 * Parse a CSV file text and extract all email-looking values.
 * Works for single-column email lists, or multi-column CSVs where emails
 * appear in any column — the parser extracts every cell that looks like
 * an email address, regardless of column position or header names.
 *
 * Returns { emails: string[], duplicates: number, invalid: number }
 */
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

/**
 * Import parsed emails into the DNC list for a survey, merging with any
 * existing entries. Returns the new total count.
 */
export function importDNCEmails(surveyId, emails) {
  const existing = loadDNCList(surveyId)
  const merged   = [...new Set([...existing, ...emails.map(e => e.toLowerCase().trim())])]
  try {
    localStorage.setItem(key(surveyId), JSON.stringify(merged))
  } catch { /* noop */ }
  return merged.length
}

// ─── Clear ─────────────────────────────────────────────────────────────────
export function clearDNCList(surveyId) {
  try { localStorage.removeItem(key(surveyId)) } catch { /* noop */ }
}

/** Remove a single email from the DNC list. */
export function removeDNCEmail(surveyId, email) {
  const normalised = email.toLowerCase().trim()
  const updated    = loadDNCList(surveyId).filter(e => e !== normalised)
  try {
    localStorage.setItem(key(surveyId), JSON.stringify(updated))
  } catch { /* noop */ }
  return updated
}
