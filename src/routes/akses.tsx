import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROLE_LABELS, useAuth, type AppRole } from "@/lib/auth";
import {
  ACTIONS,
  MODULES,
  rolePermissionsQuery,
  saveRolePermission,
  type RolePermission,
} from "@/lib/permissions";

export const Route = createFileRoute("/akses")({
  head: () => ({
    meta: [
      { title: "Hak Akses Peran — Lavin Kost Purwokerto" },
      {
        name: "description",
        content:
          "Atur izin lihat, tambah, ubah, dan hapus untuk setiap peran pengguna pada tiap modul aplikasi Lavin Kost.",
      },
      { property: "og:title", content: "Hak Akses Peran — Lavin Kost Purwokerto" },
      {
        property: "og:description",
        content: "Kelola hak akses per peran dan per modul aplikasi Lavin Kost.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccessPage,
});

const ROLES: AppRole[] = ["admin", "owner", "finance", "employee"];

function RoleMatrix({ role, rows }: { role: AppRole; rows: RolePermission[] }) {
  const queryClient = useQueryClient();
  const byModule = new Map(rows.filter((r) => r.role === role).map((r) => [r.module, r]));

  const mutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<RolePermission> }) =>
      saveRolePermission(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rolePermissionsQuery.queryKey });
      toast.success("Hak akses diperbarui");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const groups = [...new Set(MODULES.map((m) => m.group))];

  return (
    <div className="overflow-x-auto rounded-lg border border-gold-line bg-card">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="border-b border-gold-line text-left text-xs tracking-wider text-muted-foreground uppercase">
          <tr>
            <th className="px-4 py-3">Modul</th>
            {ACTIONS.map((action) => (
              <th key={action.key} className="px-4 py-3 text-center">
                {action.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {groups.map((group) => (
            <>
              <tr key={`g-${group}`} className="bg-muted/40">
                <td colSpan={5} className="px-4 py-2 text-[11px] tracking-[0.16em] uppercase">
                  {group}
                </td>
              </tr>
              {MODULES.filter((m) => m.group === group).map((module) => {
                const row = byModule.get(module.key);
                return (
                  <tr key={module.key}>
                    <td className="px-4 py-3">{module.label}</td>
                    {ACTIONS.map((action) => {
                      const key = action.column as keyof RolePermission;
                      const checked = Boolean(row?.[key]);
                      return (
                        <td key={action.key} className="px-4 py-3 text-center">
                          <Checkbox
                            checked={checked}
                            disabled={!row || mutation.isPending}
                            aria-label={`${action.label} ${module.label}`}
                            onCheckedChange={(next) => {
                              if (!row) return;
                              mutation.mutate({
                                id: row.id,
                                patch: { [action.column]: Boolean(next) } as Partial<RolePermission>,
                              });
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AccessPage() {
  const { role } = useAuth();
  const permissions = useQuery(rolePermissionsQuery);
  const allowed = role === "admin" || role === "owner";

  return (
    <AppShell
      title="Hak Akses"
      subtitle="Tentukan izin tiap peran pengguna untuk setiap modul aplikasi"
    >
      {!allowed ? (
        <p className="rounded-lg border border-gold-line bg-card p-6 text-sm text-muted-foreground">
          Hanya Admin dan Owner yang dapat mengubah hak akses.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-gold-line bg-card p-4 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-gold" />
            Perubahan langsung tersimpan dan berlaku saat pengguna memuat ulang halaman.
          </div>
          <Tabs defaultValue="admin">
            <TabsList>
              {ROLES.map((item) => (
                <TabsTrigger key={item} value={item}>
                  {ROLE_LABELS[item]}
                </TabsTrigger>
              ))}
            </TabsList>
            {ROLES.map((item) => (
              <TabsContent key={item} value={item} className="mt-4">
                <RoleMatrix role={item} rows={permissions.data ?? []} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </AppShell>
  );
}
