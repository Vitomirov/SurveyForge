/**
 * DNS TXT lookup for enterprise custom-domain verification.
 */
import { Resolver, resolveTxt } from 'node:dns/promises'

const PUBLIC_DNS = ['8.8.8.8', '1.1.1.1']

/** Flatten DNS TXT chunks into full string values. */
export function flattenTxtRecords(chunks) {
  if (!Array.isArray(chunks)) return []
  return chunks.map(parts => parts.join(''))
}

function createPublicResolver() {
  const resolver = new Resolver()
  resolver.setServers(PUBLIC_DNS)
  return resolver
}

/**
 * Look up TXT records for a hostname.
 * Uses public DNS — Docker's embedded resolver (127.0.0.11) often lags on new records.
 * Returns an empty array when the record does not exist.
 */
export async function lookupTxtRecords(hostname, { resolveTxt: resolver = resolveTxt } = {}) {
  const host = String(hostname || '').trim().toLowerCase()
  if (!host) return []

  const lookup = async (fn) => {
    try {
      const chunks = await fn(host)
      return flattenTxtRecords(chunks)
    } catch (err) {
      if (err?.code === 'ENOTFOUND' || err?.code === 'ENODATA') return null
      throw err
    }
  }

  const publicResolver = createPublicResolver()
  const fromPublic = await lookup((h) => publicResolver.resolveTxt(h))
  if (fromPublic?.length) return fromPublic

  const fromSystem = await lookup(resolver)
  return fromSystem ?? []
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
