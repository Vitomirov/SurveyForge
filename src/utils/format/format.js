/** Shared display formatters used across dashboard panels. */

/** Cents → localized currency string (e.g. 4900 → "$49.00"). */
export function formatMoney(cents, currency = 'USD') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format((cents ?? 0) / 100)
}

/** ISO string → "05 Aug 2026". Returns `fallback` when there's no date. */
export function formatDate(iso, { fallback = '—' } = {}) {
  if (!iso) return fallback
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
