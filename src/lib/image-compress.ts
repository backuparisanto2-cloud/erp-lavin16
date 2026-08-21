export const MAX_UPLOAD_BYTES = 300 * 1024;

async function loadBitmap(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
      close: () => bitmap.close?.(),
    };
  }
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Gagal membaca gambar"));
    el.src = url;
  });
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
    close: () => URL.revokeObjectURL(url),
  };
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/webp", quality));
}

/**
 * Convert any image file to WebP, scaled + quality-reduced until it fits
 * under `maxBytes` (default 300KB).
 */
export async function compressToWebp(file: File, maxBytes = MAX_UPLOAD_BYTES): Promise<Blob> {
  const source = await loadBitmap(file);
  try {
    let maxEdge = 1600;
    let best: Blob | null = null;

    for (let attempt = 0; attempt < 4; attempt++) {
      const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
      const width = Math.max(1, Math.round(source.width * scale));
      const height = Math.max(1, Math.round(source.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Browser tidak mendukung kompresi gambar");
      source.draw(ctx, width, height);

      for (const quality of [0.82, 0.7, 0.6, 0.5, 0.4]) {
        const blob = await toBlob(canvas, quality);
        if (!blob) continue;
        best = blob;
        if (blob.size <= maxBytes) return blob;
      }
      maxEdge = Math.round(maxEdge * 0.7);
    }

    if (!best) throw new Error("Gagal mengompres gambar");
    return best;
  } finally {
    source.close();
  }
}

export function webpFileName(original: string) {
  const base = original.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 40) || "foto";
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
}
