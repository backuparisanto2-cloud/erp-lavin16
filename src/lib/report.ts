import type { Room, RoomItem, SharedItem } from "@/lib/inventory";

export type Scope = "semua" | "kamar" | "fasilitas";

export type ReportRow = {
  id: string;
  name: string;
  code: string | null;
  scope: "kamar" | "fasilitas";
  group: string;
  floor: number | null;
  roomNumber: string | null;
  quantity: number;
  condition: string;
  brand: string | null;
  serial_number: string | null;
  vendor: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  warranty_until: string | null;
};

export function buildRows(
  rooms: Room[],
  roomItems: RoomItem[],
  sharedItems: SharedItem[],
): ReportRow[] {
  const byId = new Map(rooms.map((r) => [r.id, r]));
  const kamar: ReportRow[] = roomItems.map((item) => {
    const room = byId.get(item.room_id);
    return {
      id: item.id,
      name: item.name,
      code: item.code,
      scope: "kamar",
      group: room ? `Kamar ${room.number}` : "Kamar tidak diketahui",
      floor: room?.floor ?? null,
      roomNumber: room?.number ?? null,
      quantity: item.quantity,
      condition: item.condition,
      brand: item.brand,
      serial_number: item.serial_number,
      vendor: item.vendor,
      purchase_price: item.purchase_price,
      purchase_date: item.purchase_date,
      warranty_until: item.warranty_until,
    };
  });

  const fasilitas: ReportRow[] = sharedItems.map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    scope: "fasilitas",
    group: item.category,
    floor: null,
    roomNumber: null,
    quantity: item.quantity,
    condition: item.condition,
    brand: item.brand,
    serial_number: item.serial_number,
    vendor: item.vendor,
    purchase_price: item.purchase_price,
    purchase_date: item.purchase_date,
    warranty_until: item.warranty_until,
  }));

  return [...kamar, ...fasilitas];
}

export type Filters = {
  dari: string;
  sampai: string;
  lingkup: Scope;
  lantai: number;
};

export function applyFilters(rows: ReportRow[], f: Filters) {
  const scoped = rows.filter((row) => {
    if (f.lingkup === "kamar" && row.scope !== "kamar") return false;
    if (f.lingkup === "fasilitas" && row.scope !== "fasilitas") return false;
    if (f.lingkup !== "fasilitas" && f.lantai > 0 && row.scope === "kamar") {
      if (row.floor !== f.lantai) return false;
    }
    return true;
  });

  const hasRange = Boolean(f.dari || f.sampai);
  if (!hasRange) return { rows: scoped, tanpaTanggal: [] as ReportRow[] };

  const inRange: ReportRow[] = [];
  const tanpaTanggal: ReportRow[] = [];
  for (const row of scoped) {
    if (!row.purchase_date) {
      tanpaTanggal.push(row);
      continue;
    }
    if (f.dari && row.purchase_date < f.dari) continue;
    if (f.sampai && row.purchase_date > f.sampai) continue;
    inRange.push(row);
  }
  return { rows: inRange, tanpaTanggal };
}

export type Bucket = {
  key: string;
  jenis: number;
  unit: number;
  nilai: number;
  perluPerhatian: number;
};

function emptyBucket(key: string): Bucket {
  return { key, jenis: 0, unit: 0, nilai: 0, perluPerhatian: 0 };
}

function add(bucket: Bucket, row: ReportRow) {
  bucket.jenis += 1;
  bucket.unit += row.quantity;
  bucket.nilai += row.purchase_price ?? 0;
  if (row.condition !== "Baik") bucket.perluPerhatian += 1;
}

export function totals(rows: ReportRow[]) {
  const bucket = emptyBucket("total");
  let nilaiPerluPerhatian = 0;
  let tanpaHarga = 0;
  for (const row of rows) {
    add(bucket, row);
    if (row.condition !== "Baik") nilaiPerluPerhatian += row.purchase_price ?? 0;
    if (row.purchase_price === null) tanpaHarga += 1;
  }
  return { ...bucket, nilaiPerluPerhatian, tanpaHarga };
}

export function groupBy(rows: ReportRow[], key: (row: ReportRow) => string): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const row of rows) {
    const k = key(row);
    let bucket = map.get(k);
    if (!bucket) {
      bucket = emptyBucket(k);
      map.set(k, bucket);
    }
    add(bucket, row);
  }
  return [...map.values()];
}

export function byCondition(rows: ReportRow[], known: string[]): Bucket[] {
  const buckets = groupBy(rows, (r) => r.condition);
  const order = new Map(known.map((name, index) => [name, index]));
  return buckets.sort(
    (a, b) => (order.get(a.key) ?? 999) - (order.get(b.key) ?? 999) || a.key.localeCompare(b.key),
  );
}

export function topPurchases(rows: ReportRow[], limit = 10): ReportRow[] {
  return rows
    .filter((r) => (r.purchase_price ?? 0) > 0)
    .sort((a, b) => (b.purchase_price ?? 0) - (a.purchase_price ?? 0))
    .slice(0, limit);
}

/* ---- CSV ---- */

const HEADERS = [
  "Nama",
  "Jenis",
  "Kamar/Kategori",
  "Lantai",
  "Jumlah",
  "Kondisi",
  "Merk",
  "Serial Number",
  "Vendor",
  "Harga Pembelian",
  "Tanggal Pembelian",
  "Garansi Sampai",
];

function cell(value: string | number | null) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows: ReportRow[]): string {
  const lines = [HEADERS.map(cell).join(";")];
  for (const row of rows) {
    lines.push(
      [
        cell(row.name),
        cell(row.scope === "kamar" ? "Kamar" : "Fasilitas Utama"),
        cell(row.group),
        cell(row.floor),
        cell(row.quantity),
        cell(row.condition),
        cell(row.brand),
        cell(row.serial_number),
        cell(row.vendor),
        cell(row.purchase_price),
        cell(row.purchase_date),
        cell(row.warranty_until),
      ].join(";"),
    );
  }
  return lines.join("\r\n");
}

export function downloadCsv(rows: ReportRow[], filename: string) {
  const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/* ---- date presets ---- */

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function presetRange(preset: "bulan" | "tiga-bulan" | "tahun" | "semua") {
  const now = new Date();
  if (preset === "semua") return { dari: "", sampai: "" };
  if (preset === "bulan") {
    return { dari: iso(new Date(now.getFullYear(), now.getMonth(), 1)), sampai: iso(now) };
  }
  if (preset === "tiga-bulan") {
    return { dari: iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), sampai: iso(now) };
  }
  return { dari: iso(new Date(now.getFullYear(), 0, 1)), sampai: iso(now) };
}

export function formatTanggal(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(
    date,
  );
}
