import { supabase } from "@/integrations/supabase/client";
import { compressToWebp, webpFileName } from "@/lib/image-compress";
import { PHOTO_BUCKET } from "@/lib/inventory";
import { pdfToWebpBlobs } from "@/lib/pdf-to-webp";

export const EXPENSE_CATEGORIES = [
  "Belanja",
  "Service / Perbaikan",
  "Jasa",
  "Iuran",
  "Lain-lain",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type Expense = {
  id: string;
  category: string;
  name: string;
  expense_date: string;
  amount: number;
  invoice_no: string | null;
  notes: string | null;
  location: string | null;
  vendor: string | null;
  dues_name: string | null;
  dues_contact: string | null;
  attachments: string[];
};

export type ExpensePayload = Omit<Expense, "id">;

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

const COLUMNS =
  "id, category, name, expense_date, amount, invoice_no, notes, location, vendor, dues_name, dues_contact, attachments";

export const expensesQuery = {
  queryKey: ["expenses"] as const,
  queryFn: async (): Promise<Expense[]> => {
    const rows = unwrap(
      await supabase
        .from("expenses")
        .select(COLUMNS)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ) as Record<string, unknown>[];
    return rows.map((row) => ({
      ...row,
      amount: Number(row['amount'] ?? 0),
      attachments: Array.isArray(row['attachments'])
        ? (row['attachments'] as unknown[]).filter((v): v is string => typeof v === "string")
        : [],
    })) as Expense[];
  },
};

export const expenseLocationsQuery = {
  queryKey: ["expense_locations"] as const,
  queryFn: async (): Promise<string[]> => {
    const rows = unwrap(
      await supabase
        .from("expense_locations")
        .select("name, sort_order")
        .order("sort_order")
        .order("name"),
    ) as { name: string }[];
    return rows.map((r) => r.name);
  },
};

export async function addExpenseLocation(name: string) {
  const clean = name.trim();
  if (!clean) return;
  const { error } = await supabase
    .from("expense_locations")
    .upsert({ name: clean } as never, { onConflict: "name" });
  if (error) throw new Error(error.message);
}

export async function addExpense(input: ExpensePayload) {
  const { error } = await supabase.from("expenses").insert(input as never);
  if (error) throw new Error(error.message);
}

export async function updateExpense(id: string, patch: Partial<ExpensePayload>) {
  const { error } = await supabase.from("expenses").update(patch as never).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---- attachments (gambar & PDF → WebP maks 300KB) ---- */

async function uploadBlob(blob: Blob, folder: string, name: string): Promise<string> {
  const path = `${folder}/${webpFileName(name)}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, {
    contentType: "image/webp",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function uploadAttachment(file: File, folder: string): Promise<string[]> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pages = await pdfToWebpBlobs(file);
    const paths: string[] = [];
    for (const page of pages) paths.push(await uploadBlob(page.blob, folder, page.name));
    return paths;
  }
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} bukan gambar atau PDF`);
  }
  return [await uploadBlob(await compressToWebp(file), folder, file.name)];
}

export function formatRupiah(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatTanggal(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}
