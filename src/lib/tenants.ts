import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/** Tabel tenant_* belum ada di tipe generated, jadi pakai client tanpa skema. */
const db = supabase as unknown as SupabaseClient;

export const TENANT_STATUSES = [
  "Aktif",
  "Tidak Aktif",
  "Akan Checkout",
  "Checkout",
] as const;

export const TENANT_PAYMENT_METHODS = ["Transfer Bank", "Cash", "QRIS", "Lainnya"] as const;

export const RENT_PERIODS = [
  { label: "1 Bulan", months: 1 },
  { label: "3 Bulan", months: 3 },
  { label: "6 Bulan", months: 6 },
  { label: "1 Tahun", months: 12 },
] as const;

export function monthsOfPeriod(label: string): number {
  return RENT_PERIODS.find((p) => p.label === label)?.months ?? 1;
}

export function addMonths(date: string, months: number): string {
  const base = new Date(`${date}T00:00:00`);
  if (Number.isNaN(base.getTime())) return date;
  const day = base.getDate();
  const target = new Date(base.getFullYear(), base.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, "0");
  const d = String(target.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type TenantPhone = {
  id?: string;
  phone: string;
  label: string | null;
  is_primary: boolean;
};

export type EmergencyContact = {
  id?: string;
  name: string;
  relationship: string | null;
  phone: string;
  notes: string | null;
};

export type TenantVehicle = {
  id?: string;
  vehicle_type: string;
  brand_model: string | null;
  plate_number: string | null;
};

export type TenantPayment = {
  id: string;
  tenant_id: string;
  payment_date: string;
  period_type: string;
  period_start: string | null;
  period_end: string | null;
  amount: number;
  payment_method: string;
  notes: string | null;
  attachments: string[];
};

export type TenantPaymentPayload = Omit<TenantPayment, "id">;

export type TenantStatusLog = {
  id: string;
  old_status: string | null;
  new_status: string;
  old_room: string | null;
  new_room: string | null;
  note: string | null;
  changed_at: string;
};

export type TenantHistoryEntry = TenantStatusLog & {
  tenant_id: string | null;
  tenant_name: string | null;
};


export type TenantProfile = {
  id: string;
  name: string;
  nik: string | null;
  student_card: string | null;
  home_address: string | null;
  current_address: string | null;
  email: string | null;
  school_work_address: string | null;
  maps_home_url: string | null;
  maps_school_url: string | null;
  documents: string[];
  ktp_files: string[];
  id_card_files: string[];
  photo_path: string | null;
  rules_agreed: boolean;
  rules_agreed_at: string | null;
  room_id: string | null;
  room_number: string | null;
  check_in_date: string | null;
  rent_period: string | null;
  due_date: string | null;
  status: string;
  contact: string | null;
  notes: string | null;
  phones: TenantPhone[];
  emergency_contacts: EmergencyContact[];
  vehicles: TenantVehicle[];
  payments: TenantPayment[];
  status_history: TenantStatusLog[];
};

export type TenantProfilePayload = {
  name: string;
  nik: string | null;
  student_card: string | null;
  home_address: string | null;
  current_address: string | null;
  email: string | null;
  school_work_address: string | null;
  maps_home_url: string | null;
  maps_school_url: string | null;
  documents: string[];
  ktp_files: string[];
  id_card_files: string[];
  photo_path: string | null;
  rules_agreed: boolean;
  room_id: string | null;
  room_number: string | null;
  check_in_date: string | null;
  rent_period: string | null;
  due_date: string | null;
  status: string;
  contact: string | null;
  notes: string | null;
};

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

const SELECT = `
  id, name, nik, student_card, home_address, current_address, email, school_work_address,
  maps_home_url, maps_school_url, documents, ktp_files, id_card_files, photo_path, rules_agreed, rules_agreed_at, room_id,
  room_number, check_in_date, rent_period, due_date, status, contact, notes,
  tenant_phones ( id, phone, label, is_primary ),
  tenant_emergency_contacts ( id, name, relationship, phone, notes ),
  tenant_vehicles ( id, vehicle_type, brand_model, plate_number ),
  tenant_payments ( id, tenant_id, payment_date, period_type, period_start, period_end, amount, payment_method, notes, attachments ),
  tenant_status_history ( id, old_status, new_status, old_room, new_room, note, changed_at )
`;

export const tenantHistoryQuery = {
  queryKey: ["tenant_history"] as const,
  queryFn: async (): Promise<TenantHistoryEntry[]> => {
    const { data, error } = await db
      .from("tenant_status_history")
      .select("id, tenant_id, tenant_name, old_status, new_status, old_room, new_room, note, changed_at")
      .order("changed_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as TenantHistoryEntry[];
  },
};


export const tenantProfilesQuery = {
  queryKey: ["tenant_profiles"] as const,
  queryFn: async (): Promise<TenantProfile[]> => {
    const { data, error } = await db.from("tenants").select(SELECT).order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: Record<string, unknown>) => ({
      ...(row as unknown as TenantProfile),
      documents: strings(row['documents']),
      ktp_files: strings(row['ktp_files']),
      id_card_files: strings(row['id_card_files']),
      photo_path: (row['photo_path'] as string | null) ?? null,
      rules_agreed: Boolean(row['rules_agreed']),
      phones: ((row['tenant_phones'] ?? []) as TenantPhone[]).slice().sort((a, b) =>
        Number(b.is_primary) - Number(a.is_primary),
      ),
      emergency_contacts: (row['tenant_emergency_contacts'] ?? []) as EmergencyContact[],
      vehicles: (row['tenant_vehicles'] ?? []) as TenantVehicle[],
      payments: ((row['tenant_payments'] ?? []) as Record<string, unknown>[])
        .map((p) => ({
          ...(p as unknown as TenantPayment),
          amount: Number(p['amount'] ?? 0),
          attachments: strings(p['attachments']),
        }))
        .sort((a, b) => b.payment_date.localeCompare(a.payment_date)),
      status_history: ((row['tenant_status_history'] ?? []) as TenantStatusLog[])
        .slice()
        .sort((a, b) => b.changed_at.localeCompare(a.changed_at)),
    }));
  },
};

export async function saveTenantProfile(
  id: string | null,
  payload: TenantProfilePayload,
  phones: TenantPhone[],
  contacts: EmergencyContact[],
  vehicles: TenantVehicle[],
): Promise<string> {
  const body = {
    ...payload,
    rules_agreed_at: payload.rules_agreed ? new Date().toISOString() : null,
  };

  let tenantId = id;
  if (tenantId) {
    const { error } = await db.from("tenants").update(body).eq("id", tenantId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await db.from("tenants").insert(body).select("id").single();
    if (error) throw new Error(error.message);
    tenantId = (data as { id: string }).id;
  }

  const children: Array<[string, Record<string, unknown>[]]> = [
    [
      "tenant_phones",
      phones
        .filter((p) => p.phone.trim())
        .map((p) => ({
          tenant_id: tenantId,
          phone: p.phone.trim(),
          label: p.label?.trim() || null,
          is_primary: p.is_primary,
        })),
    ],
    [
      "tenant_emergency_contacts",
      contacts
        .filter((c) => c.name.trim() && c.phone.trim())
        .map((c) => ({
          tenant_id: tenantId,
          name: c.name.trim(),
          relationship: c.relationship?.trim() || null,
          phone: c.phone.trim(),
          notes: c.notes?.trim() || null,
        })),
    ],
    [
      "tenant_vehicles",
      vehicles
        .filter((v) => v.vehicle_type.trim())
        .map((v) => ({
          tenant_id: tenantId,
          vehicle_type: v.vehicle_type.trim(),
          brand_model: v.brand_model?.trim() || null,
          plate_number: v.plate_number?.trim() || null,
        })),
    ],
  ];

  for (const [table, rows] of children) {
    const { error: delError } = await db.from(table).delete().eq("tenant_id", tenantId);
    if (delError) throw new Error(delError.message);
    if (rows.length) {
      const { error: insError } = await db.from(table).insert(rows);
      if (insError) throw new Error(insError.message);
    }
  }

  return tenantId;
}

export async function deleteTenantProfile(id: string) {
  const { error } = await db.from("tenants").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateTenantStatus(id: string, status: string) {
  const { error } = await db.from("tenants").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function addTenantPayment(input: TenantPaymentPayload) {
  const { error } = await db.from("tenant_payments").insert(input);
  if (error) throw new Error(error.message);
}

export async function updateTenantPayment(id: string, patch: Partial<TenantPaymentPayload>) {
  const { error } = await db.from("tenant_payments").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteTenantPayment(id: string) {
  const { error } = await db.from("tenant_payments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function totalPaid(tenant: TenantProfile): number {
  return tenant.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
}

export function dueInfo(dueDate: string | null): {
  label: string;
  tone: "ok" | "soon" | "late" | "none";
} {
  if (!dueDate) return { label: "Belum diatur", tone: "none" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return { label: `Lewat ${Math.abs(days)} hari`, tone: "late" };
  if (days === 0) return { label: "Jatuh tempo hari ini", tone: "soon" };
  if (days <= 7) return { label: `${days} hari lagi`, tone: "soon" };
  return { label: `${days} hari lagi`, tone: "ok" };
}
