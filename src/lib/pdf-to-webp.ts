import { compressToWebp } from "@/lib/image-compress";

const MAX_PDF_PAGES = 10;

function canvasToFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Gagal merender halaman PDF"));
      resolve(new File([blob], name, { type: "image/png" }));
    }, "image/png");
  });
}

/** Render every PDF page to a WebP blob (max 300KB each). Browser only. */
export async function pdfToWebpBlobs(file: File): Promise<{ blob: Blob; name: string }[]> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const out: { blob: Blob; name: string }[] = [];
  const pages = Math.min(doc.numPages, MAX_PDF_PAGES);

  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak mendukung render PDF");
    await page.render({ canvasContext: ctx, viewport }).promise;
    const rendered = await canvasToFile(canvas, `${file.name}-hal-${i}.png`);
    out.push({ blob: await compressToWebp(rendered), name: `${file.name}-hal-${i}` });
  }

  return out;
}
