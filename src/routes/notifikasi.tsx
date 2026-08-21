import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  formatNotifTime,
  markRead,
  markUnread,
  notificationsQuery,
} from "@/lib/notifications";

export const Route = createFileRoute("/notifikasi")({
  head: () => ({
    meta: [
      { title: "Notifikasi — Lavin Kost Purwokerto" },
      {
        name: "description",
        content:
          "Riwayat notifikasi Lavin Kost: perubahan status tenant, perpindahan kamar, dan kondisi barang yang perlu perhatian.",
      },
      { property: "og:title", content: "Notifikasi — Lavin Kost Purwokerto" },
      {
        property: "og:description",
        content: "Pantau pemberitahuan perubahan status dan penugasan di Lavin Kost.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"semua" | "belum">("semua");
  const notifications = useQuery(notificationsQuery);

  const rows = useMemo(() => {
    const all = notifications.data ?? [];
    return filter === "belum" ? all.filter((n) => !n.read) : all;
  }, [notifications.data, filter]);

  const toggle = useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) => {
      if (!userId) throw new Error("Sesi tidak ditemukan");
      if (read) await markUnread(id, userId);
      else await markRead([id], userId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsQuery.queryKey }),
    onError: (error: Error) => toast.error(error.message),
  });

  const readAll = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sesi tidak ditemukan");
      await markRead(
        (notifications.data ?? []).filter((n) => !n.read).map((n) => n.id),
        userId,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQuery.queryKey });
      toast.success("Semua notifikasi ditandai dibaca");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell title="Notifikasi" subtitle="Riwayat pemberitahuan aktivitas aplikasi">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {(["semua", "belum"] as const).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key)}
              >
                {key === "semua" ? "Semua" : "Belum dibaca"}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => readAll.mutate()}>
            <CheckCheck className="mr-2 h-4 w-4" /> Tandai semua dibaca
          </Button>
        </div>

        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`rounded-lg border p-4 ${row.read ? "border-border bg-card" : "border-gold-line bg-accent/40"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <Bell className="h-4 w-4 shrink-0 text-gold" />
                    {row.title}
                    {row.read ? null : <Badge variant="secondary">Baru</Badge>}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{row.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatNotifTime(row.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {row.link ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link to={row.link}>Buka</Link>
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggle.mutate({ id: row.id, read: row.read })}
                  >
                    {row.read ? "Tandai belum dibaca" : "Tandai dibaca"}
                  </Button>
                </div>
              </div>
            </li>
          ))}
          {rows.length === 0 ? (
            <li className="rounded-lg border border-gold-line bg-card p-6 text-center text-sm text-muted-foreground">
              Belum ada notifikasi.
            </li>
          ) : null}
        </ul>
      </div>
    </AppShell>
  );
}
