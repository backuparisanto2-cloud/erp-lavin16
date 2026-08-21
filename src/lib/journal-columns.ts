import type { JournalEntry } from "@/lib/journal";
import { formatRupiah, formatTanggal } from "@/lib/expenses";

export type JournalColumnKey =
  | "no"
  | "date"
  | "description"
  | "kind"
  | "category"
  | "source"
  | "method"
  | "notes"
  | "income"
  | "expense"
  | "amount"
  | "balance";

export type JournalCellType = "text" | "date" | "currency" | "number";

export type JournalRow = {
  entry: JournalEntry;
  saldo: number;
  index: number;
};

export type JournalColumnDef = {
  key: JournalColumnKey;
  label: string;
  type: JournalCellType;
  value: (row: JournalRow) => string | number | null;
  /** kata kunci untuk mencocokkan header hasil pembacaan AI */
  aliases: string[];
};

export const ALL_JOURNAL_COLUMNS: JournalColumnDef[] = [
  {
    key: "no",
    label: "No",
    type: "number",
    value: (r) => r.index + 1,
    aliases: ["no", "nomor", "urut", "#"],
  },
  {
    key: "date",
    label: "Tanggal",
    type: "date",
    value: (r) => r.entry.date,
    aliases: ["tanggal", "tgl", "date", "periode"],
  },
  {
    key: "description",
    label: "Keterangan",
    type: "text",
    value: (r) => r.entry.description,
    aliases: ["keterangan", "uraian", "deskripsi", "description", "transaksi", "nama"],
  },
  {
    key: "kind",
    label: "Jenis",
    type: "text",
    value: (r) => r.entry.kind,
    aliases: ["jenis", "tipe", "type"],
  },
  {
    key: "category",
    label: "Kategori",
    type: "text",
    value: (r) => r.entry.category,
    aliases: ["kategori", "akun", "perkiraan", "category", "coa"],
  },
  {
    key: "source",
    label: "Sumber",
    type: "text",
    value: (r) => r.entry.source,
    aliases: ["sumber", "source", "asal", "referensi", "ref"],
  },
  {
    key: "method",
    label: "Metode / Lokasi",
    type: "text",
    value: (r) => r.entry.method ?? "-",
    aliases: ["metode", "pembayaran", "lokasi", "vendor", "kas", "bank", "method"],
  },
  {
    key: "notes",
    label: "Catatan",
    type: "text",
    value: (r) => r.entry.notes ?? "-",
    aliases: ["catatan", "note", "memo", "keterangan tambahan"],
  },
  {
    key: "income",
    label: "Pendapatan (Debit)",
    type: "currency",
    value: (r) => (r.entry.kind === "Pendapatan" ? r.entry.amount : 0),
    aliases: ["pendapatan", "penerimaan", "debit", "debet", "masuk", "kredit masuk", "income"],
  },
  {
    key: "expense",
    label: "Pengeluaran (Kredit)",
    type: "currency",
    value: (r) => (r.entry.kind === "Pengeluaran" ? r.entry.amount : 0),
    aliases: ["pengeluaran", "biaya", "kredit", "keluar", "expense", "beban"],
  },
  {
    key: "amount",
    label: "Nominal",
    type: "currency",
    value: (r) => r.entry.amount,
    aliases: ["nominal", "jumlah", "nilai", "total", "amount", "rupiah"],
  },
  {
    key: "balance",
    label: "Saldo Berjalan",
    type: "currency",
    value: (r) => r.saldo,
    aliases: ["saldo", "balance", "sisa"],
  },
];

export const JOURNAL_COLUMN_MAP = new Map<JournalColumnKey, JournalColumnDef>(
  ALL_JOURNAL_COLUMNS.map((c) => [c.key, c]),
);

export type JournalColumnConfig = {
  key: JournalColumnKey;
  label: string;
  visible: boolean;
};

const DEFAULT_VISIBLE: JournalColumnKey[] = [
  "no",
  "date",
  "description",
  "category",
  "method",
  "income",
  "expense",
  "balance",
];

export function defaultJournalColumns(): JournalColumnConfig[] {
  const visible = DEFAULT_VISIBLE.map((key) => {
    const def = JOURNAL_COLUMN_MAP.get(key)!;
    return { key, label: def.label, visible: true };
  });
  const hidden = ALL_JOURNAL_COLUMNS.filter((c) => !DEFAULT_VISIBLE.includes(c.key)).map((c) => ({
    key: c.key,
    label: c.label,
    visible: false,
  }));
  return [...visible, ...hidden];
}

export function formatJournalCell(value: string | number | null, type: JournalCellType): string {
  if (value === null || value === "") return "-";
  if (type === "currency") {
    const num = Number(value);
    if (!Number.isFinite(num) || num === 0) return "-";
    return formatRupiah(num);
  }
  if (type === "date") return formatTanggal(String(value));
  return String(value);
}

/** Mencocokkan header bebas (mis. dari gambar Excel) ke kolom jurnal yang dikenal. */
export function matchJournalColumn(header: string): JournalColumnKey | null {
  const text = header.trim().toLowerCase();
  if (!text) return null;
  for (const col of ALL_JOURNAL_COLUMNS) {
    if (col.label.toLowerCase() === text) return col.key;
  }
  let best: { key: JournalColumnKey; score: number } | null = null;
  for (const col of ALL_JOURNAL_COLUMNS) {
    for (const alias of col.aliases) {
      if (text.includes(alias)) {
        const score = alias.length;
        if (!best || score > best.score) best = { key: col.key, score };
      }
    }
  }
  return best?.key ?? null;
}
