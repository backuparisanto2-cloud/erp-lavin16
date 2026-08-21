import type { ReportRow } from "@/lib/report";
import { formatRupiah } from "@/lib/inventory";
import { formatTanggal } from "@/lib/report";

export type EnrichedRow = ReportRow & {
  nilai_total: number | null;
  umur_bulan: number | null;
  depresiasi: number | null;
  nilai_buku: number | null;
  tarif_tahunan: number;
};

export function monthsBetween(from: string, to: Date) {
  const start = new Date(`${from}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const months =
    (to.getFullYear() - start.getFullYear()) * 12 +
    (to.getMonth() - start.getMonth()) +
    (to.getDate() >= start.getDate() ? 0 : -1);
  return Math.max(0, months);
}

/** Garis lurus: nilai perolehan disusutkan rata selama masa manfaat. */
export function enrichRows(rows: ReportRow[], masaManfaatTahun: number, asOf: Date): EnrichedRow[] {
  const umurMaks = Math.max(1, masaManfaatTahun) * 12;
  return rows.map((row) => {
    const nilaiTotal = row.purchase_price === null ? null : row.purchase_price * row.quantity;
    const umur = row.purchase_date ? monthsBetween(row.purchase_date, asOf) : null;
    if (nilaiTotal === null || umur === null) {
      return {
        ...row,
        nilai_total: nilaiTotal,
        umur_bulan: umur,
        depresiasi: null,
        nilai_buku: null,
        tarif_tahunan: 0,
      };
    }
    const dipakai = Math.min(umur, umurMaks);
    const depresiasi = Math.round((nilaiTotal / umurMaks) * dipakai);
    return {
      ...row,
      nilai_total: nilaiTotal,
      umur_bulan: umur,
      depresiasi,
      nilai_buku: nilaiTotal - depresiasi,
      tarif_tahunan: Math.round(nilaiTotal / Math.max(1, masaManfaatTahun)),
    };
  });
}

export type ColumnType = "text" | "number" | "currency" | "date";

export type ColumnKey =
  | "name"
  | "code"
  | "scope"
  | "group"
  | "floor"
  | "roomNumber"
  | "quantity"
  | "condition"
  | "brand"
  | "serial_number"
  | "vendor"
  | "purchase_price"
  | "nilai_total"
  | "purchase_date"
  | "warranty_until"
  | "umur_bulan"
  | "depresiasi"
  | "nilai_buku"
  | "tarif_tahunan";

export type ColumnDef = {
  key: ColumnKey;
  label: string;
  type: ColumnType;
  value: (row: EnrichedRow) => string | number | null;
};

export const ALL_COLUMNS: ColumnDef[] = [
  { key: "name", label: "Nama Barang", type: "text", value: (r) => r.name },
  { key: "code", label: "Kode Inventaris", type: "text", value: (r) => r.code },
  {
    key: "scope",
    label: "Jenis",
    type: "text",
    value: (r) => (r.scope === "kamar" ? "Kamar" : "Fasilitas Utama"),
  },
  { key: "group", label: "Kamar / Kategori", type: "text", value: (r) => r.group },
  { key: "floor", label: "Lantai", type: "number", value: (r) => r.floor },
  { key: "roomNumber", label: "Nomor Kamar", type: "text", value: (r) => r.roomNumber },
  { key: "quantity", label: "Jumlah", type: "number", value: (r) => r.quantity },
  { key: "condition", label: "Kondisi", type: "text", value: (r) => r.condition },
  { key: "brand", label: "Merk", type: "text", value: (r) => r.brand },
  { key: "serial_number", label: "Serial Number", type: "text", value: (r) => r.serial_number },
  { key: "vendor", label: "Vendor", type: "text", value: (r) => r.vendor },
  { key: "purchase_price", label: "Harga Satuan", type: "currency", value: (r) => r.purchase_price },
  { key: "nilai_total", label: "Total Pembelian", type: "currency", value: (r) => r.nilai_total },
  { key: "purchase_date", label: "Tanggal Beli", type: "date", value: (r) => r.purchase_date },
  { key: "warranty_until", label: "Garansi Sampai", type: "date", value: (r) => r.warranty_until },
  { key: "umur_bulan", label: "Umur (bulan)", type: "number", value: (r) => r.umur_bulan },
  { key: "depresiasi", label: "Akumulasi Depresiasi", type: "currency", value: (r) => r.depresiasi },
  { key: "nilai_buku", label: "Nilai Buku", type: "currency", value: (r) => r.nilai_buku },
  { key: "tarif_tahunan", label: "Depresiasi / Tahun", type: "currency", value: (r) => r.tarif_tahunan },
];

export const COLUMN_MAP = new Map(ALL_COLUMNS.map((c) => [c.key, c]));

export type ColumnConfig = { key: ColumnKey; label: string; visible: boolean };

export const DEFAULT_COLUMN_KEYS: ColumnKey[] = [
  "code",
  "name",
  "group",
  "quantity",
  "condition",
  "brand",
  "vendor",
  "purchase_price",
  "nilai_total",
  "purchase_date",
  "depresiasi",
  "nilai_buku",
];

export function defaultColumnConfig(): ColumnConfig[] {
  return ALL_COLUMNS.map((c) => ({
    key: c.key,
    label: c.label,
    visible: DEFAULT_COLUMN_KEYS.includes(c.key),
  })).sort(
    (a, b) =>
      (DEFAULT_COLUMN_KEYS.indexOf(a.key) + 1 || 99) - (DEFAULT_COLUMN_KEYS.indexOf(b.key) + 1 || 99),
  );
}

export function formatCell(value: string | number | null, type: ColumnType): string {
  if (value === null || value === undefined || value === "") return "—";
  if (type === "currency") return formatRupiah(Number(value)) ?? "—";
  if (type === "date") return formatTanggal(String(value));
  if (type === "number") return new Intl.NumberFormat("id-ID").format(Number(value));
  return String(value);
}

export type SortState = { key: ColumnKey; dir: "asc" | "desc" } | null;

export function sortRows(rows: EnrichedRow[], sort: SortState): EnrichedRow[] {
  if (!sort) return rows;
  const col = COLUMN_MAP.get(sort.key);
  if (!col) return rows;
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = col.value(a);
    const vb = col.value(b);
    if (va === null) return 1;
    if (vb === null) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * factor;
    return String(va).localeCompare(String(vb), "id") * factor;
  });
}

export type CategoryBucket = {
  key: string;
  jenis: number;
  unit: number;
  pembelian: number;
  depresiasi: number;
  nilaiBuku: number;
  perluPerhatian: number;
};

/** Ringkasan pembelian & nilai buku per kategori barang atau per nama barang. */
export function summarizeByCategory(
  rows: EnrichedRow[],
  basis: "grup" | "nama",
): CategoryBucket[] {
  const map = new Map<string, CategoryBucket>();
  for (const row of rows) {
    const key = basis === "nama" ? row.name : row.scope === "kamar" ? "Barang Kamar" : row.group;
    let bucket = map.get(key);
    if (!bucket) {
      bucket = {
        key,
        jenis: 0,
        unit: 0,
        pembelian: 0,
        depresiasi: 0,
        nilaiBuku: 0,
        perluPerhatian: 0,
      };
      map.set(key, bucket);
    }
    bucket.jenis += 1;
    bucket.unit += row.quantity;
    bucket.pembelian += row.nilai_total ?? 0;
    bucket.depresiasi += row.depresiasi ?? 0;
    bucket.nilaiBuku += row.nilai_buku ?? 0;
    if (row.condition !== "Baik") bucket.perluPerhatian += 1;
  }
  return [...map.values()].sort((a, b) => b.pembelian - a.pembelian || b.unit - a.unit);
}

/** Kunci grup untuk sebuah baris, konsisten dengan summarizeByCategory. */
export function categoryKeyOf(row: EnrichedRow, basis: "grup" | "nama"): string {
  if (basis === "nama") return row.name;
  return row.scope === "kamar" ? "Barang Kamar" : row.group;
}

export function rowsInCategory(
  rows: EnrichedRow[],
  basis: "grup" | "nama",
  key: string,
): EnrichedRow[] {
  return rows.filter((row) => categoryKeyOf(row, basis) === key);
}

export type TrendPoint = {
  bulan: string;
  label: string;
  pembelian: number;
  depresiasi: number;
  nilaiBuku: number;
};

const BULAN_SINGKAT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** Tren pembelian/depresiasi/nilai buku per bulan berdasarkan tanggal beli. */
export function monthlyTrend(rows: EnrichedRow[]): TrendPoint[] {
  const map = new Map<string, TrendPoint>();
  for (const row of rows) {
    if (!row.purchase_date) continue;
    const bulan = row.purchase_date.slice(0, 7);
    const [y, m] = bulan.split("-").map(Number);
    if (!y || !m) continue;
    let point = map.get(bulan);
    if (!point) {
      point = {
        bulan,
        label: `${BULAN_SINGKAT[m - 1]} ${String(y).slice(2)}`,
        pembelian: 0,
        depresiasi: 0,
        nilaiBuku: 0,
      };
      map.set(bulan, point);
    }
    point.pembelian += row.nilai_total ?? 0;
    point.depresiasi += row.depresiasi ?? 0;
    point.nilaiBuku += row.nilai_buku ?? 0;
  }
  return [...map.values()].sort((a, b) => a.bulan.localeCompare(b.bulan));
}
