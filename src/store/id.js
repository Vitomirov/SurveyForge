// ─── ID Generator ─────────────────────────────────────────────────────────
export const newId = () => crypto.randomUUID()

/** Prefixed fallback ID for localStorage-backed entities. */
export const newPrefixedId = (prefix, randomLen = 4) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 2 + randomLen)}`

/** Survey library ID with UUID fallback for older browsers. */
export const newSurveyId = () =>
  crypto.randomUUID?.() || `sv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
