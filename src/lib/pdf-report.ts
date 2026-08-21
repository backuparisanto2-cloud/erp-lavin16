export type PdfSummary = { label: string; value: string };

export type PdfDocOptions = {
  title: string;
  subtitle?: string;
  summary?: PdfSummary[];
  head: string[];
  body: (string | number)[][];
  /** kolom (index) yang di-align kanan */
  numericColumns?: number[];
  orientation?: "portrait" | "landscape";
};

const navy: [number, number, number] = [26, 54, 93];
const softBlue: [number, number, number] = [237, 243, 250];

export async function buildSimplePdf(options: PdfDocOptions) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({
    orientation: options.orientation ?? (options.head.length > 6 ? "landscape" : "portrait"),
    unit: "pt",
  });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...navy);
  doc.text("LAVIN KOST PURWOKERTO", 40, 40);
  doc.setFontSize(15);
  doc.setTextColor(20);
  doc.text(options.title, 40, 60);

  doc.setDrawColor(...navy);
  doc.setLineWidth(1);
  doc.line(40, 68, pageWidth - 40, 68);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  let y = 84;
  if (options.subtitle) {
    doc.text(options.subtitle, 40, y, { maxWidth: pageWidth - 80 });
    y += 12;
  }
  doc.text(
    `Dicetak: ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}`,
    40,
    y,
  );
  y += 14;
  if (options.summary?.length) {
    doc.text(options.summary.map((s) => `${s.label}: ${s.value}`).join("   |   "), 40, y, {
      maxWidth: pageWidth - 80,
    });
    y += 16;
  }
  doc.setTextColor(0);

  const numeric = new Set(options.numericColumns ?? []);

  autoTable(doc, {
    startY: y + 4,
    head: [options.head],
    body: options.body.map((row) => row.map((cell) => String(cell ?? ""))),
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
      options.head.map((_, i) => [i, { halign: numeric.has(i) ? "right" : "left" }]),
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
      doc.text(options.title, 40, bottom - 18);
      doc.text(`Halaman ${page}`, pageWidth - 40, bottom - 18, { align: "right" });
      doc.setTextColor(0);
    },
  });

  return doc;
}

export async function downloadSimplePdf(options: PdfDocOptions, filename: string) {
  const doc = await buildSimplePdf(options);
  doc.save(filename);
}
