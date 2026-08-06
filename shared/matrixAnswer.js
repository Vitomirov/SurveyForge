// ─── Shared matrix answer normalization ─────────────────────────────────────
// Used by client (matrixHelpers) and server (responseNormalization).
// Matrix answers: { [rowId]: columnId | columnId[] | null }

/** Coerce legacy/invalid values into the structured matrix shape. */
export function normalizeMatrixAnswer(answer) {
  if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
    const normalized = {}
    for (const [rowId, val] of Object.entries(answer)) {
      if (val === null || val === undefined) {
        normalized[rowId] = null
      } else if (Array.isArray(val)) {
        normalized[rowId] = val.filter(Boolean)
      } else {
        normalized[rowId] = val
      }
    }
    return normalized
  }
  return {}
}
