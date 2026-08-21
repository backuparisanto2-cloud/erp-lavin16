import {
  JOURNAL_COLUMN_MAP,
  formatJournalCell,
  type JournalColumnConfig,
  type JournalRow,
} from "@/lib/journal-columns";
import type { JournalMonth } from "@/lib/journal";
import { formatMonth } from "@/lib/income";

export type JournalExportMeta = {
  title: string;
  periode: string;
  ringkasan: { label: string; value: string }[];
  includeTotals: boolean;
  months?: JournalMonth[];
};

function activeColumns(columns: JournalColumnConfig[]) {
  return columns
    .filter((c) => c.visible)
    .map((c) => ({ config: c, def: JOURNAL_COLUMN_MAP.get(c.key)! }))
    .filter((c) => Boolean(c.def));
}

function totalsFor(rows: JournalRow[], key: string) {
  const def = JOURNAL_COLUMN_MAP.get(key as never);
  if (!def || def.type !== "currency" || def.key === "balance") return null;
  return rows.reduce((sum, row) => sum + Number(def.value(row) ?? 0), 0);
}

export async function exportJournalExcel(
  rows: JournalRow[],
  columns: JournalColumnConfig[],
  meta: JournalExportMeta,
  filename: string,
) {
  const XLSX = await import("xlsx");
  const cols = activeColumns(columns);

  const head: (string | number | null)[][] = [
    [meta.title],
    [`Periode: ${meta.periode}`],
    [],
    ...meta.ringkasan.map((r) => [r.label, r.value]),
    [],
  ];

  const header = cols.map((c) => c.config.label);
  const body = rows.map((row) =>
    cols.map((c) => {
      const value = c.def.value(row);
      if (value === null) return "";
      if (c.def.type === "currency" || c.def.type === "number") return Number(value);
      if (c.def.type === "date") return String(value);
      return String(value);
    }),
  );

  const aoa = [...head, header, ...body];

  if (meta.includeTotals && rows.length) {
    const totalRow = cols.map((c, i) => {
      if (i === 0) return "TOTAL";
      const total = totalsFor(rows, c.def.key);
      return total === null ? "" : total;
    });
    aoa.push(totalRow);
  }

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const headerRow = head.length;
  sheet["!cols"] = cols.map((c) => ({
    wch: Math.max(10, Math.min(38, c.config.label.length + 8)),
  }));

  const lastRow = headerRow + body.length + (meta.includeTotals && rows.length ? 1 : 0);
  cols.forEach((c, i) => {
    if (c.def.type !== "currency") return;
    for (let r = headerRow + 1; r <= lastRow; r += 1) {
      const ref = XLSX.utils.encode_cell({ r, c: i });
      const cell = sheet[ref];
      if (cell && typeof cell.v === "number") cell.z = '"Rp"#,##0;("Rp"#,##0);"-"';
    }
  });

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Jurnal Umum");

  if (meta.months?.length) {
    const recap = XLSX.utils.aoa_to_sheet([
      ["Bulan", "Pendapatan", "Pengeluaran", "Laba / Rugi", "Transaksi"],
      ...meta.months.map((m) => [
        formatMonth(m.month),
        m.pendapatan,
        m.pengeluaran,
        m.saldo,
        m.count,
      ]),
    ]);
    recap["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(book, recap, "Rekap Bulanan");
  }

  XLSX.writeFile(book, filename);
}

export function exportJournalCsv(
  rows: JournalRow[],
  columns: JournalColumnConfig[],
  meta: JournalExportMeta,
  filename: string,
) {
  const cols = activeColumns(columns);
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines: string[] = [
    esc(meta.title),
    esc(`Periode: ${meta.periode}`),
    ...meta.ringkasan.map((r) => [esc(r.label), esc(r.value)].join(";")),
    "",
    cols.map((c) => esc(c.config.label)).join(";"),
    ...rows.map((row) =>
      cols
        .map((c) => {
          const value = c.def.value(row);
          return esc(value === null ? "" : String(value));
        })
        .join(";"),
    ),
  ];

  if (meta.includeTotals && rows.length) {
    lines.push(
      cols
        .map((c, i) => {
          if (i === 0) return esc("TOTAL");
          const total = totalsFor(rows, c.def.key);
          return esc(total === null ? "" : String(total));
        })
        .join(";"),
    );
  }

  if (meta.months?.length) {
    lines.push("", esc("Rekap Bulanan"));
    lines.push(
      ["Bulan", "Pendapatan", "Pengeluaran", "Laba / Rugi", "Transaksi"].map(esc).join(";"),
    );
    for (const m of meta.months) {
      lines.push(
        [formatMonth(m.month), m.pendapatan, m.pengeluaran, m.saldo, m.count]
          .map((v) => esc(String(v)))
          .join(";"),
      );
    }
  }

  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportJournalPdf(
  rows: JournalRow[],
  columns: JournalColumnConfig[],
  meta: JournalExportMeta,
  filename: string,
) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;
  const cols = activeColumns(columns);

  const doc = new jsPDF({ orientation: cols.length > 6 ? "landscape" : "portrait", unit: "pt" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const navy: [number, number, number] = [26, 54, 93];
  const softBlue: [number, number, number] = [237, 243, 250];

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...navy);
  doc.text("LAVIN KOST PURWOKERTO", 40, 40);
  doc.setFontSize(15);
  doc.setTextColor(20);
  doc.text(meta.title, 40, 60);

  doc.setDrawColor(...navy);
  doc.setLineWidth(1);
  doc.line(40, 68, pageWidth - 40, 68);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(`Periode: ${meta.periode}`, 40, 84);
  doc.text(
    `Dicetak: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`,
    40,
    96,
  );
  doc.text(meta.ringkasan.map((r) => `${r.label}: ${r.value}`).join("   |   "), 40, 110, {
    maxWidth: pageWidth - 80,
  });
  doc.setTextColor(0);

  const body = rows.map((row) => cols.map((c) => formatJournalCell(c.def.value(row), c.def.type)));
  const foot =
    meta.includeTotals && rows.length
      ? [
          cols.map((c, i) => {
            if (i === 0) return "TOTAL";
            const total = totalsFor(rows, c.def.key);
            return total === null ? "" : formatJournalCell(total, "currency");
          }),
        ]
      : undefined;

  autoTable(doc, {
    startY: 126,
    head: [cols.map((c) => c.config.label)],
    body,
    ...(foot ? { foot } : {}),
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: "linebreak",
      lineColor: [205, 219, 234],
      lineWidth: 0.5,
      textColor: [35, 42, 54],
    },
    headStyles: { fillColor: navy, textColor: [255, 255, 255], fontStyle: "bold" },
    footStyles: { fillColor: softBlue, textColor: [20, 20, 20], fontStyle: "bold" },
    alternateRowStyles: { fillColor: softBlue },
    columnStyles: Object.fromEntries(
      cols.map((c, i) => [
        i,
        { halign: c.def.type === "currency" || c.def.type === "number" ? "right" : "left" },
      ]),
    ),
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      const bottom = doc.internal.pageSize.getHeight();
      doc.setDrawColor(205, 219, 234);
      doc.setLineWidth(0.5);
      doc.line(40, bottom - 32, pageWidth - 40, bottom - 32);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(meta.title, 40, bottom - 18);
      doc.text(`Halaman ${page}`, pageWidth - 40, bottom - 18, { align: "right" });
      doc.setTextColor(0);
    },
  });

  if (meta.months?.length) {
    doc.addPage();
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("Rekap Bulanan", 40, 50);
    autoTable(doc, {
      startY: 64,
      head: [["Bulan", "Pendapatan", "Pengeluaran", "Laba / Rugi", "Transaksi"]],
      body: meta.months.map((m) => [
        formatMonth(m.month),
        formatJournalCell(m.pendapatan, "currency"),
        formatJournalCell(m.pengeluaran, "currency"),
        formatJournalCell(m.saldo, "currency"),
        String(m.count),
      ]),
      styles: { fontSize: 8, cellPadding: 4, lineColor: [205, 219, 234], lineWidth: 0.5 },
      headStyles: { fillColor: navy, textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
      margin: { left: 40, right: 40, bottom: 40 },
    });
  }

  doc.save(filename);
}
