/** Escape a single cell value for CSV output. */
export function cell(value) {
  const str = value == null ? '' : String(value).trim()
  if (/[,";\|\r\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"'
  return str
}

/** Join header/data rows into a UTF-8 BOM CSV string (Excel-friendly). */
export function rowsToCSV(rows) {
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n')
}
