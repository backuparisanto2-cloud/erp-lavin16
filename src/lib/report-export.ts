import type { ColumnConfig, EnrichedRow } from "@/lib/report-columns";
import { COLUMN_MAP, formatCell } from "@/lib/report-columns";

export type ExportMeta = {
  title: string;
  periode: string;
  lingkup: string;
  masaManfaat: number;
  ringkasan: { label: string; value: string }[];
};

function activeColumns(columns: ColumnConfig[]) {
  return columns
    .filter((c) => c.visible)
    .map((c) => ({ config: c, def: COLUMN_MAP.get(c.key)! }))
    .filter((c) => Boolean(c.def));
}

export async function exportExcel(
  rows: EnrichedRow[],
  columns: ColumnConfig[],
  meta: ExportMeta,
  filename: string,
) {
  const XLSX = await import("xlsx");
  const cols = activeColumns(columns);

  const head: (string | number | null)[][] = [
    [meta.title],
    [`Periode: ${meta.periode}`],
    [`Lingkup: ${meta.lingkup} · Masa manfaat: ${meta.masaManfaat} tahun`],
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
      return String(value);
    }),
  );

  const sheet = XLSX.utils.aoa_to_sheet([...head, header, ...body]);
  const headerRow = head.length;
  sheet["!cols"] = cols.map((c) => ({
    wch: Math.max(12, Math.min(34, c.config.label.length + 6)),
  }));

  cols.forEach((c, i) => {
    if (c.def.type !== "currency") return;
    for (let r = 0; r < body.length; r += 1) {
      const ref = XLSX.utils.encode_cell({ r: headerRow + 1 + r, c: i });
      const cell = sheet[ref];
      if (cell && typeof cell.v === "number") cell.z = '"Rp"#,##0;("Rp"#,##0);"-"';
    }
  });

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Laporan");
  XLSX.writeFile(book, filename);
}

export function exportCsv(
  rows: EnrichedRow[],
  columns: ColumnConfig[],
  meta: ExportMeta,
  filename: string,
) {
  const cols = activeColumns(columns);
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines: string[] = [
    esc(meta.title),
    esc(`Periode: ${meta.periode}`),
    esc(`Lingkup: ${meta.lingkup} · Masa manfaat: ${meta.masaManfaat} tahun`),
    ...meta.ringkasan.map((r) => [esc(r.label), esc(r.value)].join(";")),
    "",
    cols.map((c) => esc(c.config.label)).join(";"),
    ...rows.map((row) =>
      cols
        .map((c) => {
          const value = c.def.value(row);
          if (value === null) return esc("");
          if (c.def.type === "currency" || c.def.type === "number") return esc(String(value));
          return esc(String(value));
        })
        .join(";"),
    ),
  ];

  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function buildPdf(rows: EnrichedRow[], columns: ColumnConfig[], meta: ExportMeta) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
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
  doc.setFont("times", "bold");
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
  doc.text(`Lingkup: ${meta.lingkup} · Masa manfaat: ${meta.masaManfaat} tahun`, 40, 96);
  doc.text(
    `Dicetak: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`,
    40,
    108,
  );
  doc.text(meta.ringkasan.map((r) => `${r.label}: ${r.value}`).join("   |   "), 40, 122, {
    maxWidth: pageWidth - 80,
  });
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 138,
    head: [cols.map((c) => c.config.label)],
    body: rows.map((row) => cols.map((c) => formatCell(c.def.value(row), c.def.type))),
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: "linebreak",
      lineColor: [205, 219, 234],
      lineWidth: 0.5,
      textColor: [35, 42, 54],
    },
    headStyles: { fillColor: navy, textColor: [255, 255, 255], fontStyle: "bold" },
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

  return doc;
}

export async function exportPdf(
  rows: EnrichedRow[],
  columns: ColumnConfig[],
  meta: ExportMeta,
  filename: string,
) {
  const doc = await buildPdf(rows, columns, meta);
  doc.save(filename);
}

export async function pdfPreviewUrl(
  rows: EnrichedRow[],
  columns: ColumnConfig[],
  meta: ExportMeta,
) {
  const doc = await buildPdf(rows, columns, meta);
  return URL.createObjectURL(doc.output("blob"));
}

