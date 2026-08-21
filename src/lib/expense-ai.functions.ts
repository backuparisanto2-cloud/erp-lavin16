import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  imageDataUrl: z.string().min(20),
  categories: z.array(z.string()).min(1),
});

export type ExpenseScan = {
  name?: string;
  expense_date?: string;
  amount?: number;
  invoice_no?: string;
  vendor?: string;
  notes?: string;
  category?: string;
};

const PROMPT = `Kamu membaca foto nota, kuitansi, atau invoice berbahasa Indonesia.
Balas HANYA JSON valid tanpa markdown, dengan bentuk:
{"name":string,"expense_date":"YYYY-MM-DD","amount":number,"invoice_no":string,"vendor":string,"notes":string,"category":string}
Aturan: amount adalah total akhir dalam angka rupiah tanpa titik/koma pemisah.
Kosongkan string ("") atau gunakan 0 bila tidak terbaca. category harus salah satu dari daftar yang diberikan.`;

export const scanExpenseDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<ExpenseScan> => {
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) throw new Error("Fitur AI belum dikonfigurasi.");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${PROMPT}\nDaftar kategori: ${data.categories.join(", ")}` },
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
      throw new Error(`AI gagal membaca dokumen (${response.status}): ${text.slice(0, 200)}`);
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI tidak menemukan data pada dokumen.");

    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const str = (key: string) =>
      typeof parsed[key] === "string" && parsed[key] ? (parsed[key] as string) : undefined;
    const amount = Number(parsed['amount']);

    return {
      ...(str("name") ? { name: str("name")! } : {}),
      ...(str("expense_date") ? { expense_date: str("expense_date")! } : {}),
      ...(Number.isFinite(amount) && amount > 0 ? { amount } : {}),
      ...(str("invoice_no") ? { invoice_no: str("invoice_no")! } : {}),
      ...(str("vendor") ? { vendor: str("vendor")! } : {}),
      ...(str("notes") ? { notes: str("notes")! } : {}),
      ...(str("category") ? { category: str("category")! } : {}),
    };
  });
