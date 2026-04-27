import * as XLSX from 'xlsx'

export function downloadTemplate(
  filename: string,
  sheetName: string,
  headers: string[],
  example?: Record<string, unknown>,
): void {
  const rows: unknown[][] = [headers]
  if (example) {
    rows.push(headers.map(h => example[h] ?? ''))
  }
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}
