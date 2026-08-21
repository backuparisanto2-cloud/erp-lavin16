import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";

export type PermissionAction = "view" | "create" | "update" | "delete";

export type ModuleKey =
  | "dashboard"
  | "denah"
  | "kamar"
  | "fasilitas"
  | "tenant"
  | "pendapatan"
  | "pengeluaran"
  | "jurnal"
  | "laporan"
  | "kelola"
  | "notifikasi"
  | "pengguna"
  | "audit"
  | "akses";

export const MODULES: { key: ModuleKey; label: string; group: string }[] = [
  { key: "dashboard", label: "Ringkasan", group: "Umum" },
  { key: "denah", label: "Denah", group: "Umum" },
  { key: "notifikasi", label: "Notifikasi", group: "Umum" },
  { key: "kamar", label: "Inventaris Kamar", group: "Inventaris" },
  { key: "fasilitas", label: "Fasilitas Utama", group: "Inventaris" },
  { key: "kelola", label: "Kelola Data", group: "Inventaris" },
  { key: "tenant", label: "Tenant & Pembayaran", group: "Operasional" },
  { key: "pendapatan", label: "Pendapatan", group: "Akuntansi" },
  { key: "pengeluaran", label: "Pengeluaran", group: "Akuntansi" },
  { key: "jurnal", label: "Jurnal Umum", group: "Akuntansi" },
  { key: "laporan", label: "Laporan", group: "Akuntansi" },
  { key: "pengguna", label: "Pengguna", group: "Administrasi" },
  { key: "audit", label: "Audit Log", group: "Administrasi" },
  { key: "akses", label: "Hak Akses", group: "Administrasi" },
];

export const ACTIONS: { key: PermissionAction; label: string; column: string }[] = [
  { key: "view", label: "Lihat", column: "can_view" },
  { key: "create", label: "Tambah", column: "can_create" },
  { key: "update", label: "Ubah", column: "can_update" },
  { key: "delete", label: "Hapus", column: "can_delete" },
];

export type RolePermission = {
  id: string;
  role: AppRole;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
};

export const rolePermissionsQuery = {
  queryKey: ["role_permissions"] as const,
  queryFn: async (): Promise<RolePermission[]> => {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("id, role, module, can_view, can_create, can_update, can_delete");
    if (error) throw new Error(error.message);
    return (data ?? []) as RolePermission[];
  },
};

export async function saveRolePermission(
  id: string,
  patch: Partial<Pick<RolePermission, "can_view" | "can_create" | "can_update" | "can_delete">>,
) {
  const { error } = await supabase.from("role_permissions").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export function usePermissions() {
  const { role, loading: authLoading } = useAuth();
  const query = useQuery(rolePermissionsQuery);

  return useMemo(() => {
    const rows = query.data ?? [];
    const mine = new Map<string, RolePermission>();
    for (const row of rows) {
      if (row.role === role) mine.set(row.module, row);
    }
    const can = (module: ModuleKey, action: PermissionAction = "view") => {
      if (!role) return false;
      const row = mine.get(module);
      // Selama data izin belum termuat, jangan sembunyikan apa pun.
      if (!row) return query.isLoading ? true : role === "admin" || role === "owner";
      if (action === "view") return row.can_view;
      if (action === "create") return row.can_create;
      if (action === "update") return row.can_update;
      return row.can_delete;
    };
    return { can, loading: authLoading || query.isLoading, role };
  }, [query.data, query.isLoading, role, authLoading]);
}
