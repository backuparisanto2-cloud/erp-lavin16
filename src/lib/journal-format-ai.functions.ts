import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  imageDataUrl: z.string().min(20),
  availableColumns: z.array(z.object({ key: z.string(), label: z.string() })).min(1),
});

export type JournalFormatColumn = {
  header: string;
  mapTo: string | null;
};

export type JournalFormatScan = {
  title?: string;
  includeTotals: boolean;
  columns: JournalFormatColumn[];
};

const PROMPT = `Kamu membaca tangkapan layar / foto sebuah tabel jurnal keuangan (biasanya Excel) berbahasa Indonesia.
Tugasmu: menyalin STRUKTUR formatnya, bukan datanya.
Balas HANYA JSON valid tanpa markdown, dengan bentuk:
{"title":string,"includeTotals":boolean,"columns":[{"header":string,"mapTo":string}]}
Aturan:
- "columns" berurutan persis seperti kolom pada gambar, kiri ke kanan.
- "header" adalah teks judul kolom apa adanya pada gambar.
- "mapTo" harus salah satu "key" dari daftar kolom yang tersedia, atau "" bila tidak ada yang cocok.
- Jangan memakai satu "key" untuk dua kolom.
- "title" adalah judul laporan pada kop tabel bila ada, selain itu "".
- "includeTotals" true bila ada baris total/jumlah di bawah tabel.`;

export const scanJournalFormat = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<JournalFormatScan> => {
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) throw new Error("Fitur AI belum dikonfigurasi.");

    const list = data.availableColumns.map((c) => `${c.key} = ${c.label}`).join("; ");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${PROMPT}\nDaftar kolom tersedia: ${list}` },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (response.status === 429) {
      throw new Error("Terlalu banyak permintaan AI. Coba lagi sebentar lagi.");
    }
    if (response.status === 402) {
      throw new Error("Kredit AI habis. Tambahkan kredit di workspace Lovable.");
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI gagal membaca gambar (${response.status}): ${text.slice(0, 200)}`);
    }

    const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI tidak menemukan tabel pada gambar.");

    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const validKeys = new Set(data.availableColumns.map((c) => c.key));
    const rawColumns = Array.isArray(parsed['columns']) ? parsed['columns'] : [];

    const used = new Set<string>();
    const columns: JournalFormatColumn[] = [];
    for (const raw of rawColumns) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      const header = typeof item['header'] === "string" ? item['header'].trim() : "";
      if (!header) continue;
      const mapRaw = typeof item['mapTo'] === "string" ? item['mapTo'].trim() : "";
      const mapTo = mapRaw && validKeys.has(mapRaw) && !used.has(mapRaw) ? mapRaw : null;
      if (mapTo) used.add(mapTo);
      columns.push({ header, mapTo });
    }

    if (!columns.length) throw new Error("AI tidak menemukan kolom pada gambar.");

    const title = typeof parsed['title'] === "string" ? parsed['title'].trim() : "";

    return {
      ...(title ? { title } : {}),
      includeTotals: parsed['includeTotals'] !== false,
      columns,
    };
  });
