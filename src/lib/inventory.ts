import { supabase } from "@/integrations/supabase/client";
import { compressToWebp, webpFileName } from "@/lib/image-compress";
import { buildItemCode, codePrefix } from "@/lib/item-code";

export const PHOTO_BUCKET = "inventory-photos";

export const SHARED_CATEGORIES = [
  "Air",
  "Listrik",
  "Bangunan",
  "Dapur",
  "Penerangan",
  "Jaringan",
  "Keamanan",
  "Umum",
];

export const DEFAULT_ROOM_ITEMS = [
  "TV",
  "AC",
  "Dipan",
  "Meja Belajar",
  "Kursi Pendek",
  "Kursi Panjang",
  "MCB Listrik",
  "Kasur",
  "Bantal Guling",
];

export type Room = {
  id: string;
  number: string;
  floor: number;
  notes: string | null;
};

type PurchaseFields = {
  code: string | null;
  brand: string | null;
  serial_number: string | null;
  vendor: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  warranty_until: string | null;
  photos: string[];
  receipts: string[];
};

export type RoomItem = PurchaseFields & {
  id: string;
  room_id: string;
  name: string;
  quantity: number;
  condition: string;
  notes: string | null;
};

export type SharedItem = PurchaseFields & {
  id: string;
  name: string;
  category: string;
  quantity: number;
  condition: string;
  location: string | null;
  notes: string | null;
};

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

function toPaths(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function normalize<T extends { photos: unknown; receipts: unknown }>(row: T) {
  return { ...row, photos: toPaths(row.photos), receipts: toPaths(row.receipts) };
}

const ITEM_COLUMNS =
  "code, brand, serial_number, vendor, purchase_price, purchase_date, warranty_until, photos, receipts";

export const roomsQuery = {
  queryKey: ["rooms"] as const,
  queryFn: async (): Promise<Room[]> =>
    unwrap(
      await supabase.from("rooms").select("id, number, floor, notes").order("number"),
    ) as Room[],
};

export const allRoomItemsQuery = {
  queryKey: ["room_items", "all"] as const,
  queryFn: async (): Promise<RoomItem[]> => {
    const rows = unwrap(
      await supabase
        .from("room_items")
        .select(`id, room_id, name, quantity, condition, notes, ${ITEM_COLUMNS}`)
        .order("created_at"),
    );
    return (rows as unknown[]).map((r) => normalize(r as never)) as unknown as RoomItem[];
  },
};

export const sharedItemsQuery = {
  queryKey: ["shared_items"] as const,
  queryFn: async (): Promise<SharedItem[]> => {
    const rows = unwrap(
      await supabase
        .from("shared_items")
        .select(`id, name, category, quantity, condition, location, notes, ${ITEM_COLUMNS}`)
        .order("category")
        .order("name"),
    );
    return (rows as unknown[]).map((r) => normalize(r as never)) as unknown as SharedItem[];
  },
};

export const conditionsQuery = {
  queryKey: ["conditions"] as const,
  queryFn: async (): Promise<string[]> => {
    const rows = unwrap(
      await supabase.from("conditions").select("name, sort_order").order("sort_order").order("name"),
    ) as { name: string }[];
    return rows.map((r) => r.name);
  },
};

export async function addCondition(name: string) {
  const clean = name.trim();
  if (!clean) return;
  const { error } = await supabase.from("conditions").upsert({ name: clean }, { onConflict: "name" });
  if (error) throw new Error(error.message);
}

/* ---- item payloads ---- */

export type ItemPayload = {
  name: string;
  code?: string | null;
  brand?: string | null;
  serial_number?: string | null;
  quantity: number;
  condition: string;
  notes?: string | null;
  vendor?: string | null;
  purchase_price?: number | null;
  purchase_date?: string | null;
  warranty_until?: string | null;
  photos?: string[];
  receipts?: string[];
};

/* ---- kode unik inventaris ---- */

type ItemTable = "room_items" | "shared_items";

async function existingCodes(prefix: string): Promise<(string | null)[]> {
  const [a, b] = await Promise.all([
    supabase.from("room_items").select("code").like("code", `${prefix}-%`),
    supabase.from("shared_items").select("code").like("code", `${prefix}-%`),
  ]);
  const rows = [...(a.data ?? []), ...(b.data ?? [])] as { code: string | null }[];
  return rows.map((r) => r.code);
}

/** Kode baru berdasarkan nama + tanggal beli; null jika tanggal beli belum ada. */
export async function generateItemCode(
  name: string,
  purchaseDate: string | null | undefined,
): Promise<string | null> {
  const prefix = codePrefix(name, purchaseDate);
  if (!prefix) return null;
  return buildItemCode(name, purchaseDate, await existingCodes(prefix));
}

async function currentItem(table: ItemTable, id: string) {
  const { data } = await supabase
    .from(table)
    .select("name, purchase_date")
    .eq("id", id)
    .maybeSingle();
  return (data ?? { name: "", purchase_date: null }) as { name: string; purchase_date: string | null };
}

/** Kode untuk update: dipertahankan jika masih cocok, dibuat ulang jika nama/tanggal berubah. */
async function codeForUpdate(
  table: ItemTable,
  id: string,
  patch: Partial<ItemPayload>,
): Promise<string | null | undefined> {
  if (!("name" in patch) && !("purchase_date" in patch)) return undefined;
  const { data } = await supabase
    .from(table)
    .select("name, purchase_date, code")
    .eq("id", id)
    .maybeSingle();
  const current = (data ?? null) as { name: string; purchase_date: string | null; code: string | null } | null;
  const name = patch.name ?? current?.name ?? "";
  const date = "purchase_date" in patch ? patch.purchase_date : current?.purchase_date;
  const prefix = codePrefix(name, date ?? null);
  if (!prefix) return null;
  if (current?.code && current.code.startsWith(`${prefix}-`)) return current.code;
  return buildItemCode(name, date ?? null, await existingCodes(prefix));
}

type PgError = { message: string; code?: string } | null;

function isCodeConflict(error: PgError): boolean {
  if (!error) return false;
  return error.code === "23505" || /duplicate key|_code_key/i.test(error.message);
}

function friendlyError(error: PgError, fallbackCode?: string | null): never {
  if (isCodeConflict(error)) {
    throw new Error(
      `Kode inventaris ${fallbackCode ?? ""} sudah dipakai barang lain. Coba simpan lagi — sistem akan memberi nomor urut berikutnya.`.replace(
        "  ",
        " ",
      ),
    );
  }
  throw new Error(error?.message ?? "Gagal menyimpan data");
}

/** Menjalankan operasi tulis dengan kode unik; mengulang saat kode bentrok. */
async function withUniqueCode(
  name: string,
  purchaseDate: string | null | undefined,
  presetCode: string | null | undefined,
  run: (code: string | null) => Promise<{ error: PgError }>,
): Promise<void> {
  let code = presetCode ?? (await generateItemCode(name, purchaseDate));
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await run(code);
    if (!error) return;
    if (!isCodeConflict(error) || !code) friendlyError(error, code);
    const prefix = codePrefix(name, purchaseDate);
    code = prefix ? await generateItemCode(name, purchaseDate) : null;
  }
  friendlyError({ message: "duplicate key", code: "23505" }, code);
}

/* ---- mutations ---- */

export type RoomPayload = { number: string; floor: number; notes: string | null };

export async function addRoom(input: RoomPayload) {
  const { error } = await supabase.from("rooms").insert(input as never);
  if (error) throw new Error(error.message);
}

export async function updateRoom(id: string, patch: Partial<RoomPayload>) {
  const { error } = await supabase.from("rooms").update(patch as never).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteRoom(id: string) {
  const { error } = await supabase.from("rooms").delete().eq("id", id);
  if (error) throw new Error(error.message);
}



export async function addRoomItem(input: ItemPayload & { room_id: string }) {
  await withUniqueCode(input.name, input.purchase_date, input.code, async (code) => {
    const { error } = await supabase.from("room_items").insert({ ...input, code } as never);
    return { error };
  });
}

export async function updateRoomItem(id: string, patch: Partial<ItemPayload>) {
  const code = await codeForUpdate("room_items", id, patch);
  if (code === undefined) {
    const { error } = await supabase.from("room_items").update(patch as never).eq("id", id);
    if (error) friendlyError(error);
    return;
  }
  const current = await currentItem("room_items", id);
  await withUniqueCode(
    patch.name ?? current.name,
    "purchase_date" in patch ? patch.purchase_date : current.purchase_date,
    code,
    async (nextCode) => {
      const { error } = await supabase
        .from("room_items")
        .update({ ...patch, code: nextCode } as never)
        .eq("id", id);
      return { error };
    },
  );
}

export async function deleteRoomItem(id: string) {
  const { error } = await supabase.from("room_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addSharedItem(input: ItemPayload & { category: string; location?: string | null }) {
  await withUniqueCode(input.name, input.purchase_date, input.code, async (code) => {
    const { error } = await supabase.from("shared_items").insert({ ...input, code } as never);
    return { error };
  });
}

export async function updateSharedItem(
  id: string,
  patch: Partial<ItemPayload & { category: string; location: string | null }>,
) {
  const code = await codeForUpdate("shared_items", id, patch);
  if (code === undefined) {
    const { error } = await supabase.from("shared_items").update(patch as never).eq("id", id);
    if (error) friendlyError(error);
    return;
  }
  const current = await currentItem("shared_items", id);
  await withUniqueCode(
    patch.name ?? current.name,
    "purchase_date" in patch ? patch.purchase_date : current.purchase_date,
    code,
    async (nextCode) => {
      const { error } = await supabase
        .from("shared_items")
        .update({ ...patch, code: nextCode } as never)
        .eq("id", id);
      return { error };
    },
  );
}

export async function deleteSharedItem(id: string) {
  const { error } = await supabase.from("shared_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function seedRoomItems(roomId: string) {
  const { error } = await supabase.from("room_items").insert(
    DEFAULT_ROOM_ITEMS.map((name) => ({
      room_id: roomId,
      name,
      quantity: name === "Bantal Guling" ? 2 : 1,
      condition: "Baik",
    })),
  );
  if (error) throw new Error(error.message);
}

/* ---- photos ---- */

export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const blob = await compressToWebp(file);
  const path = `${folder}/${webpFileName(file.name)}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, {
    contentType: "image/webp",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function removePhoto(path: string) {
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
}

const urlCache = new Map<string, string>();

export async function photoUrl(path: string): Promise<string | null> {
  const cached = urlCache.get(path);
  if (cached) return cached;
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
  if (!data?.signedUrl) return null;
  urlCache.set(path, data.signedUrl);
  return data.signedUrl;
}

export function warrantyStatus(until: string | null | undefined) {
  if (!until) return null;
  const end = new Date(`${until}T23:59:59`);
  const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: "Garansi habis", tone: "expired" as const, days };
  if (days <= 30) return { label: `Garansi ${days} hari lagi`, tone: "soon" as const, days };
  return { label: "Garansi aktif", tone: "active" as const, days };
}

export function formatRupiah(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
