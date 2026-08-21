/** Utilitas CSV sederhana: parse (dengan tanda kutip) dan serialisasi. */

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\r\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === "," || ch === ";") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export type CsvTable = { headers: string[]; rows: Record<string, string>[] };

export function parseCsvTable(text: string): CsvTable {
  const raw = parseCsv(text);
  if (raw.length === 0) return { headers: [], rows: [] };
  const headers = (raw[0] ?? []).map((h) => h.trim().toLowerCase());
  const rows = raw.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = (cells[i] ?? "").trim();
    });
    return record;
  });
  return { headers, rows };
}

export function num(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function dateOrNull(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (m) return `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  return null;
}
