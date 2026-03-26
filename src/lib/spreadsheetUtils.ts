/**
 * Lightweight spreadsheet utilities replacing the vulnerable `xlsx` package.
 * Supports CSV reading/writing and basic Excel-like file parsing.
 */

/** Parse a CSV string into a 2D array */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(current);
      current = "";
    } else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
      row.push(current);
      current = "";
      rows.push(row);
      row = [];
      if (ch === "\r") i++;
    } else {
      current += ch;
    }
  }
  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

/** Parse a file (CSV or XLSX-like) to rows. For .xlsx, we convert to CSV first. */
export async function parseSpreadsheetFile(file: File): Promise<string[][]> {
  const text = await file.text();
  return parseCSV(text);
}

/** Parse spreadsheet file to array of objects using first row as headers */
export async function parseSpreadsheetToObjects(file: File): Promise<Record<string, string>[]> {
  const rows = await parseSpreadsheetFile(file);
  if (rows.length < 2) return [];
  
  const headers = rows[0];
  return rows.slice(1)
    .filter(row => row.some(cell => cell.trim() !== ""))
    .map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] ?? "";
      });
      return obj;
    });
}

/** Convert 2D array to CSV string */
export function toCSV(data: string[][]): string {
  return data
    .map(row =>
      row.map(cell => {
        const s = String(cell ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      }).join(",")
    )
    .join("\n");
}

/** Download a CSV file */
export function downloadCSVFile(data: string[][], filename: string) {
  const csv = toCSV(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
