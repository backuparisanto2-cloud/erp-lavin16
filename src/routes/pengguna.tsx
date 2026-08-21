import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { UserPlus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, useAuth, type AppRole } from "@/lib/auth";
import { createAppUser, deleteAppUser, setUserRole } from "@/lib/users.functions";

export const Route = createFileRoute("/pengguna")({
  head: () => ({
    meta: [
      { title: "Pengguna — Lavin Kost Purwokerto" },
      {
        name: "description",
        content: "Kelola akun pengguna aplikasi Lavin Kost beserta level aksesnya.",
      },
      { property: "og:title", content: "Pengguna — Lavin Kost Purwokerto" },
      {
        property: "og:description",
        content: "Buat akun baru dan atur level akses pengguna aplikasi Lavin Kost.",
      },
    ],
  }),
  component: PenggunaPage,
});

const ROLES: AppRole[] = ["admin", "owner", "finance", "employee"];

type UserRow = { id: string; full_name: string; email: string | null; role: AppRole | null };

function PenggunaPage() {
  const { canManageUsers, userId } = useAuth();
  const queryClient = useQueryClient();
  const createFn = useServerFn(createAppUser);
  const roleFn = useServerFn(setUserRole);
  const deleteFn = useServerFn(deleteAppUser);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("employee");

  const usersQuery = useQuery({
    queryKey: ["app-users"],
    queryFn: async (): Promise<UserRow[]> => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role as AppRole]));
      return (profiles ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        role: roleMap.get(p.id) ?? null,
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: () => createFn({ data: { email, password, fullName, role } }),
    onSuccess: () => {
      toast.success("Pengguna dibuat");
      setEmail("");
      setFullName("");
      setPassword("");
      setRole("employee");
      void queryClient.invalidateQueries({ queryKey: ["app-users"] });
    },
    onError: (error: Error) => toast.error("Gagal membuat pengguna", { description: error.message }),
  });

  const roleMutation = useMutation({
    mutationFn: (vars: { userId: string; role: AppRole }) => roleFn({ data: vars }),
    onSuccess: () => {
      toast.success("Level pengguna diperbarui");
      void queryClient.invalidateQueries({ queryKey: ["app-users"] });
    },
    onError: (error: Error) => toast.error("Gagal mengubah level", { description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { userId: id } }),
    onSuccess: () => {
      toast.success("Pengguna dihapus");
      void queryClient.invalidateQueries({ queryKey: ["app-users"] });
    },
    onError: (error: Error) => toast.error("Gagal menghapus", { description: error.message }),
  });

  if (!canManageUsers) {
    return (
      <AppShell title="Pengguna" subtitle="Kelola akun dan level akses">
        <p className="rounded-md border border-gold-line bg-card p-4 text-sm text-muted-foreground">
          Hanya admin, owner, dan finance yang dapat mengelola pengguna.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Pengguna" subtitle="Buat akun baru dan atur level aksesnya">
      <div className="space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="grid gap-4 rounded-lg border border-gold-line bg-card p-5 sm:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor="nama">Nama lengkap</Label>
            <Input id="nama" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sandi">Kata sandi</Label>
            <Input
              id="sandi"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <select
              id="level"
              value={role}
              onChange={(e) => setRole(e.target.value as AppRole)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createMutation.isPending}>
              <UserPlus className="mr-2 h-4 w-4" /> Buat pengguna
            </Button>
          </div>
        </form>

        <div className="rounded-lg border border-gold-line bg-card">
          <div className="border-b border-gold-line px-5 py-3 text-sm font-medium">
            Daftar pengguna
          </div>
          <ul className="divide-y divide-border">
            {(usersQuery.data ?? []).map((user) => (
              <li key={user.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.full_name || "(tanpa nama)"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <select
                  value={user.role ?? "employee"}
                  onChange={(e) =>
                    roleMutation.mutate({ userId: user.id, role: e.target.value as AppRole })
                  }
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                {user.id === userId ? null : (
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label={`Hapus ${user.email}`}
                    onClick={() => {
                      if (window.confirm(`Hapus pengguna ${user.email}?`)) {
                        deleteMutation.mutate(user.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </li>
            ))}
            {usersQuery.data?.length === 0 ? (
              <li className="px-5 py-4 text-sm text-muted-foreground">Belum ada pengguna.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
