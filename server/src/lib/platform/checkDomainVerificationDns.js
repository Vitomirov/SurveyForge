/**
 * DNS TXT lookup for enterprise custom-domain verification.
 */
import { resolveTxt } from 'node:dns/promises'

/** Flatten DNS TXT chunks into full string values. */
export function flattenTxtRecords(chunks) {
  if (!Array.isArray(chunks)) return []
  return chunks.map(parts => parts.join(''))
}

/**
 * Look up TXT records for a hostname.
 * Returns an empty array when the record does not exist.
 */
export async function lookupTxtRecords(hostname, { resolveTxt: resolver = resolveTxt } = {}) {
  const host = String(hostname || '').trim().toLowerCase()
  if (!host) return []

  try {
    const chunks = await resolver(host)
    return flattenTxtRecords(chunks)
  } catch (err) {
    if (err?.code === 'ENOTFOUND' || err?.code === 'ENODATA') return []
    throw err
  }
}

export function txtRecordMatches(records, expectedValue) {
  const expected = String(expectedValue || '').trim()
  if (!expected) return false
  return records.some(record => String(record).trim() === expected)
}

/**
 * Check whether the expected verification token is published in DNS.
 * @returns {{ matched: boolean, records: string[], failureReason: string|null }}
 */
export async function checkDomainVerificationDns(verification, options = {}) {
  const hostname = verification?.txtRecord
    || (verification?.domain ? `_rescope-verify.${verification.domain}` : '')

  if (!hostname || !verification?.txtValue) {
    return {
      matched: false,
      records: [],
      failureReason: 'Domain verification is not initialized.',
    }
  }

  const records = await lookupTxtRecords(hostname, options)
  const matched = txtRecordMatches(records, verification.txtValue)

  return {
    matched,
    records,
    failureReason: matched
      ? null
      : records.length
        ? 'DNS TXT record found but value does not match.'
        : 'DNS TXT record not found.',
  }
}
