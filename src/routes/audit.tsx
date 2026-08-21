import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — Lavin Kost Purwokerto" },
      {
        name: "description",
        content: "Riwayat setiap perubahan data aplikasi Lavin Kost: pengguna, waktu, dan aksinya.",
      },
      { property: "og:title", content: "Audit Log — Lavin Kost Purwokerto" },
      {
        property: "og:description",
        content: "Pantau siapa mengubah data apa dan kapan di aplikasi Lavin Kost.",
      },
    ],
  }),
  component: AuditPage,
});

const TABLE_LABELS: Record<string, string> = {
  rooms: "Kamar",
  room_items: "Barang Kamar",
  shared_items: "Fasilitas Utama",
  tenants: "Tenant",
  tenant_phones: "Nomor Tenant",
  tenant_vehicles: "Kendaraan Tenant",
  tenant_emergency_contacts: "Kontak Darurat",
  tenant_payments: "Pembayaran Tenant",
  incomes: "Pendapatan",
  other_incomes: "Pendapatan Lain",
  expenses: "Pengeluaran",
  user_roles: "Level Pengguna",
  profiles: "Profil Pengguna",
  conditions: "Kondisi",
  expense_locations: "Lokasi Pengeluaran",
};

const ACTION_LABELS: Record<string, string> = {
  INSERT: "Tambah",
  UPDATE: "Ubah",
  DELETE: "Hapus",
};

const EVENT_LABELS: Record<string, string> = {
  data: "Perubahan data",
  auth: "Login / Logout",
};

type AuditRow = {
  id: string;
  event_type: string;
  summary: string | null;
  user_email: string | null;
  table_name: string;
  record_id: string | null;
  action: string;
  changed_fields: unknown;
  created_at: string;
};

function formatWaktu(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function AuditPage() {
  const [eventType, setEventType] = useState("");
  const [table, setTable] = useState("");
  const [action, setAction] = useState("");
  const [user, setUser] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const logsQuery = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, user_email, table_name, record_id, action, changed_fields, created_at, event_type, summary")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw new Error(error.message);
      return (data ?? []) as AuditRow[];
    },
  });

  const rows = useMemo(() => {
    return (logsQuery.data ?? []).filter((row) => {
      if (eventType && row.event_type !== eventType) return false;
      if (table && row.table_name !== table) return false;
      if (action && row.action !== action) return false;
      if (user && !(row.user_email ?? "").toLowerCase().includes(user.toLowerCase())) return false;
      const date = row.created_at.slice(0, 10);
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    });
  }, [logsQuery.data, eventType, table, action, user, from, to]);

  function exportCsv() {
    const header = ["Waktu", "Pengguna", "Data", "Aksi", "Peristiwa", "ID Data", "Field berubah"];
    const lines = rows.map((row) =>
      [
        formatWaktu(row.created_at),
        row.user_email ?? "-",
        TABLE_LABELS[row.table_name] ?? row.table_name,
        ACTION_LABELS[row.action] ?? row.action,
        EVENT_LABELS[row.event_type] ?? row.event_type,
        row.record_id ?? "-",
        Array.isArray(row.changed_fields) ? (row.changed_fields as string[]).join(" ") : "",
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "audit-log.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Audit Log" subtitle="Riwayat perubahan data: siapa, kapan, dan aksinya">
      <div className="space-y-4">
        <div className="grid gap-3 rounded-lg border border-gold-line bg-card p-4 sm:grid-cols-6">
          <div className="space-y-1">
            <Label htmlFor="f-event">Jenis peristiwa</Label>
            <select
              id="f-event"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Semua</option>
              {Object.entries(EVENT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-user">Pengguna</Label>
            <Input id="f-user" value={user} onChange={(e) => setUser(e.target.value)} placeholder="email" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-table">Jenis data</Label>
            <select
              id="f-table"
              value={table}
              onChange={(e) => setTable(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Semua</option>
              {Object.entries(TABLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-action">Aksi</Label>
            <select
              id="f-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Semua</option>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-from">Dari</Label>
            <Input id="f-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-to">Sampai</Label>
            <Input id="f-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{rows.length} catatan</p>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" /> Ekspor CSV
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gold-line bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-gold-line text-left text-xs tracking-wider text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Aksi</th>
                <th className="px-4 py-3">Peristiwa</th>
                <th className="px-4 py-3">Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 whitespace-nowrap">{formatWaktu(row.created_at)}</td>
                  <td className="px-4 py-3">{row.user_email ?? "-"}</td>
                  <td className="px-4 py-3">{TABLE_LABELS[row.table_name] ?? row.table_name}</td>
                  <td className="px-4 py-3">{ACTION_LABELS[row.action] ?? row.action}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {EVENT_LABELS[row.event_type] ?? row.event_type}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {row.summary
                      ? row.summary
                      : Array.isArray(row.changed_fields) && row.changed_fields.length > 0
                      ? (row.changed_fields as string[]).join(", ")
                      : "-"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Belum ada catatan perubahan.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
