/**
 * Kode unik inventaris: 3 huruf nama + tanggal beli (ddmmyy) + nomor urut.
 * Contoh: KSR-210826-01
 */

export function itemAbbr(name: string): string {
  const letters = (name || "").replace(/[^A-Za-z]/g, "").toUpperCase();
  if (!letters) return "";
  return (letters.slice(0, 3) + "XXX").slice(0, 3);
}

export function ddmmyy(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

/** Prefix kode tanpa nomor urut, atau null jika data belum lengkap. */
export function codePrefix(name: string, purchaseDate: string | null | undefined): string | null {
  const abbr = itemAbbr(name);
  const date = purchaseDate ? ddmmyy(purchaseDate) : "";
  if (!abbr || !date) return null;
  return `${abbr}-${date}`;
}

/** Nomor urut berikutnya berdasarkan kode yang sudah ada dengan prefix sama. */
export function nextSequence(prefix: string, existing: (string | null | undefined)[]): number {
  let max = 0;
  for (const code of existing) {
    if (!code || !code.startsWith(`${prefix}-`)) continue;
    const seq = Number(code.slice(prefix.length + 1));
    if (Number.isFinite(seq) && seq > max) max = seq;
  }
  return max + 1;
}

export function buildItemCode(
  name: string,
  purchaseDate: string | null | undefined,
  existing: (string | null | undefined)[],
): string | null {
  const prefix = codePrefix(name, purchaseDate);
  if (!prefix) return null;
  return `${prefix}-${String(nextSequence(prefix, existing)).padStart(2, "0")}`;
}

/** Pratinjau kode untuk form (nomor urut belum dipastikan). */
export function previewItemCode(name: string, purchaseDate: string | null | undefined): string | null {
  const prefix = codePrefix(name, purchaseDate);
  return prefix ? `${prefix}-01` : null;
}
