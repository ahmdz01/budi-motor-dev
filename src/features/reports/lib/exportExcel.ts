import * as XLSX from 'xlsx';

/**
 * Ekspor generik — menerima array of objects apa pun (baris data
 * laporan yang sudah dibentuk di komponen pemanggil) dan nama file.
 * Reusable untuk ketiga laporan, tidak perlu logic ekspor terpisah
 * per modul.
 */
export function exportToExcel(
  sheets: { name: string; rows: Record<string, string | number>[] }[],
  fileName: string
) {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.json_to_sheet(sheet.rows);
    // Sheet name Excel dibatasi 31 karakter oleh format .xlsx sendiri.
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31));
  }

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
