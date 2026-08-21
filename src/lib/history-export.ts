import { formatRupiah, formatTanggal } from "@/lib/expenses";
import { downloadSimplePdf } from "@/lib/pdf-report";
import type { TenantHistoryEntry, TenantPayment, TenantStatusLog } from "@/lib/tenants";

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "data"
  );
}

export function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

type Sheet = {
  title: string;
  subtitle?: string;
  summary: { label: string; value: string }[];
  head: string[];
  body: (string | number)[][];
  numericColumns?: number[];
};

async function downloadExcel(sheet: Sheet, filename: string) {
  const XLSX = await import("xlsx");
  const head: (string | number)[][] = [
    [sheet.title],
    ...(sheet.subtitle ? [[sheet.subtitle]] : []),
    [
      `Dicetak: ${new Date().toLocaleString("id-ID", {
        dateStyle: "long",
        timeStyle: "short",
      })}`,
    ],
    [],
    ...sheet.summary.map((s) => [s.label, s.value]),
    [],
  ];

  const ws = XLSX.utils.aoa_to_sheet([...head, sheet.head, ...sheet.body]);
  ws["!cols"] = sheet.head.map((h) => ({ wch: Math.max(12, Math.min(38, h.length + 8)) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Riwayat");
  XLSX.writeFile(wb, filename);
}

function historySheet(
  rows: (TenantHistoryEntry | (TenantStatusLog & { tenant_name?: string | null }))[],
  options: { title: string; subtitle?: string; withName: boolean },
): Sheet {
  const head = options.withName
    ? ["Waktu", "Tenant", "Status lama", "Status baru", "Kamar lama", "Kamar baru", "Catatan"]
    : ["Waktu", "Status lama", "Status baru", "Kamar lama", "Kamar baru", "Catatan"];

  const body = rows.map((r) => {
    const base = [
      new Date(r.changed_at).toLocaleString("id-ID"),
      r.old_status ?? "—",
      r.new_status,
      r.old_room ?? "—",
      r.new_room ?? "—",
      r.note ?? "—",
    ];
    if (!options.withName) return base;
    const name = ("tenant_name" in r ? r.tenant_name : null) ?? "—";
    return [base[0]!, name, ...base.slice(1)];
  });

  return {
    title: options.title,
    ...(options.subtitle ? { subtitle: options.subtitle } : {}),
    summary: [{ label: "Jumlah catatan", value: String(rows.length) }],
    head,
    body,
  };
}

function paymentSheet(
  payments: TenantPayment[],
  options: { tenantName: string; roomNumber: string | null },
): Sheet {
  const sorted = payments
    .slice()
    .sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1));
  const total = sorted.reduce((sum, p) => sum + (p.amount || 0), 0);
  const tanpaBukti = sorted.filter((p) => p.attachments.length === 0).length;

  return {
    title: `Riwayat Pembayaran — ${options.tenantName}`,
    subtitle: `Kamar ${options.roomNumber ?? "—"} · Lavin Kost Purwokerto`,
    summary: [
      { label: "Jumlah transaksi", value: String(sorted.length) },
      { label: "Total dibayar", value: formatRupiah(total) },
      { label: "Tanpa bukti", value: String(tanpaBukti) },
    ],
    head: [
      "Tanggal bayar",
      "Periode",
      "Masa berlaku",
      "Jumlah",
      "Metode",
      "Bukti",
      "Catatan",
    ],
    body: sorted.map((p) => [
      formatTanggal(p.payment_date),
      p.period_type,
      p.period_start || p.period_end
        ? `${p.period_start ? formatTanggal(p.period_start) : "—"} s/d ${
            p.period_end ? formatTanggal(p.period_end) : "—"
          }`
        : "—",
      p.amount,
      p.payment_method,
      p.attachments.length ? `${p.attachments.length} file` : "Belum ada",
      p.notes ?? "—",
    ]),
    numericColumns: [3],
  };
}

async function exportSheet(sheet: Sheet, base: string, format: "pdf" | "excel") {
  const filename = `${base}-${todayStamp()}.${format === "pdf" ? "pdf" : "xlsx"}`;
  if (format === "excel") {
    await downloadExcel(
      {
        ...sheet,
        body: sheet.body.map((row) =>
          row.map((cell, i) =>
            sheet.numericColumns?.includes(i) ? Number(cell) : String(cell ?? ""),
          ),
        ),
      },
      filename,
    );
    return;
  }
  await downloadSimplePdf(
    {
      title: sheet.title,
      ...(sheet.subtitle ? { subtitle: sheet.subtitle } : {}),
      summary: sheet.summary,
      head: sheet.head,
      body: sheet.body.map((row) =>
        row.map((cell, i) =>
          sheet.numericColumns?.includes(i) ? formatRupiah(Number(cell)) : String(cell ?? ""),
        ),
      ),
      ...(sheet.numericColumns ? { numericColumns: sheet.numericColumns } : {}),
    },
    filename,
  );
}

/** Ekspor seluruh log perubahan data tenant. */
export async function exportTenantHistory(
  rows: TenantHistoryEntry[],
  format: "pdf" | "excel",
) {
  await exportSheet(
    historySheet(rows, {
      title: "Riwayat Perubahan Data Tenant",
      subtitle: "Log status dan perpindahan kamar · Lavin Kost Purwokerto",
      withName: true,
    }),
    "riwayat-perubahan-tenant",
    format,
  );
}

/** Ekspor log perubahan untuk satu tenant. */
export async function exportTenantHistoryFor(
  tenantName: string,
  rows: TenantStatusLog[],
  format: "pdf" | "excel",
) {
  await exportSheet(
    historySheet(rows, {
      title: `Riwayat Perubahan Data — ${tenantName}`,
      subtitle: "Lavin Kost Purwokerto",
      withName: false,
    }),
    `riwayat-perubahan-${slugify(tenantName)}`,
    format,
  );
}

/** Ekspor riwayat pembayaran satu tenant. */
export async function exportTenantPayments(
  tenantName: string,
  roomNumber: string | null,
  payments: TenantPayment[],
  format: "pdf" | "excel",
) {
  await exportSheet(
    paymentSheet(payments, { tenantName, roomNumber }),
    `riwayat-pembayaran-${slugify(tenantName)}`,
    format,
  );
}
