import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, FileDown, History, Pencil, Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { DueReminders } from "@/components/DueReminders";
import { ExportButtons } from "@/components/ExportButtons";
import { SignedImage } from "@/components/SignedImage";
import { TenantDetailDialog } from "@/components/TenantDetailDialog";
import { TenantFullFormDialog } from "@/components/TenantFullFormDialog";
import { TenantPaymentDialog } from "@/components/TenantPaymentDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRupiah, formatTanggal } from "@/lib/expenses";
import { exportTenantHistory } from "@/lib/history-export";
import { roomsQuery } from "@/lib/inventory";
import { downloadSimplePdf } from "@/lib/pdf-report";
import {
  TENANT_STATUSES,
  addTenantPayment,
  deleteTenantPayment,
  deleteTenantProfile,
  dueInfo,
  saveTenantProfile,
  tenantHistoryQuery,
  tenantProfilesQuery,
  totalPaid,
  type EmergencyContact,
  type TenantPaymentPayload,
  type TenantPhone,
  type TenantProfile,
  type TenantProfilePayload,
  type TenantVehicle,
} from "@/lib/tenants";
import { IfCanDelete } from "@/components/IfCanDelete";


export const Route = createFileRoute("/tenant/")({
  head: () => ({
    meta: [
      { title: "Tenant & Pembayaran — Kost Lavin Purwokerto" },
      {
        name: "description",
        content:
          "Kelola data penghuni kost: data pribadi, kontak darurat, kendaraan, dokumen, riwayat pembayaran, dan status tenant.",
      },
      { property: "og:title", content: "Tenant & Pembayaran — Kost Lavin Purwokerto" },
      {
        property: "og:description",
        content: "Data penghuni lengkap beserta riwayat pembayaran dan status tenant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TenantPage,
});

const toneClass: Record<string, string> = {
  late: "text-destructive",
  soon: "text-amber-600 dark:text-amber-400",
  ok: "text-muted-foreground",
  none: "text-muted-foreground",
};

function TenantPage() {
  const queryClient = useQueryClient();
  const tenants = useQuery(tenantProfilesQuery);
  const rooms = useQuery(roomsQuery);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TenantProfile | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [paymentFor, setPaymentFor] = useState<TenantProfile | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tenant_profiles"] });

  const saveMutation = useMutation({
    mutationFn: (input: {
      id: string | null;
      payload: TenantProfilePayload;
      phones: TenantPhone[];
      contacts: EmergencyContact[];
      vehicles: TenantVehicle[];
    }) => saveTenantProfile(input.id, input.payload, input.phones, input.contacts, input.vehicles),
    onSuccess: async () => {
      await invalidate();
      setFormOpen(false);
      setEditing(null);
      toast.success("Data tenant tersimpan.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTenantProfile,
    onSuccess: async () => {
      await invalidate();
      setDetailId(null);
      toast.success("Tenant dihapus.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const paymentMutation = useMutation({
    mutationFn: (payload: TenantPaymentPayload) => addTenantPayment(payload),
    onSuccess: async () => {
      await invalidate();
      setPaymentFor(null);
      toast.success("Pembayaran tercatat.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: deleteTenantPayment,
    onSuccess: async () => {
      await invalidate();
      toast.success("Pembayaran dihapus.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const list = tenants.data ?? [];

  const occupiedRoomIds = useMemo(() => {
    const map: Record<string, string> = {};
    for (const tenant of list) {
      if (tenant.room_id && tenant.status === "Aktif") map[tenant.room_id] = tenant.id;
    }
    return map;
  }, [list]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return list.filter((tenant) => {
      if (statusFilter !== "Semua" && tenant.status !== statusFilter) return false;
      if (!term) return true;
      const haystack = [
        tenant.name,
        tenant.room_number ?? "",
        tenant.contact ?? "",
        ...tenant.phones.map((p) => p.phone),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [list, search, statusFilter]);

  const detail = list.find((tenant) => tenant.id === detailId) ?? null;
  const activeCount = list.filter((t) => t.status === "Aktif").length;
  const lateCount = list.filter((t) => dueInfo(t.due_date).tone === "late").length;

  return (
    <AppShell title="Tenant & Pembayaran" subtitle="Data penghuni kost Lavin dan riwayat bayar">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground uppercase">Tenant aktif</p>
            <p className="text-2xl font-semibold">{activeCount}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground uppercase">Total tenant</p>
            <p className="text-2xl font-semibold">{list.length}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground uppercase">Lewat jatuh tempo</p>
            <p className="text-2xl font-semibold text-destructive">{lateCount}</p>
          </div>
        </div>

        <DueReminders onRecordPayment={(tenant) => setPaymentFor(tenant)} />


        <Tabs defaultValue="daftar">
        <TabsList>
          <TabsTrigger value="daftar">Daftar tenant</TabsTrigger>
          <TabsTrigger value="riwayat" className="gap-1">
            <History className="h-4 w-4" /> Riwayat perubahan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daftar" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">

          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, kamar, atau telepon"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Semua">Semua status</SelectItem>
              {TENANT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <UserPlus className="mr-1 h-4 w-4" /> Tambah tenant
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadSimplePdf(
                {
                  title: "Laporan Tenant & Pembayaran",
                  subtitle: "Data penghuni Lavin Kost Purwokerto",
                  summary: [
                    { label: "Tenant aktif", value: String(activeCount) },
                    { label: "Total tenant", value: String(list.length) },
                    { label: "Lewat jatuh tempo", value: String(lateCount) },
                  ],
                  head: ["Nama", "Kamar", "Status", "Kontak", "Masuk", "Jatuh tempo", "Total bayar"],
                  body: filtered.map((t) => [
                    t.name,
                    t.room_number ?? "—",
                    t.status,
                    t.contact ?? t.phones[0]?.phone ?? "—",
                    t.check_in_date ? formatTanggal(t.check_in_date) : "—",
                    t.due_date ? formatTanggal(t.due_date) : "—",
                    formatRupiah(totalPaid(t)),
                  ]),
                  numericColumns: [6],
                },
                "laporan-tenant.pdf",
              )
            }
          >
            <FileDown className="mr-1 h-4 w-4" /> PDF
          </Button>

        </div>

        {tenants.isLoading ? <p className="text-sm text-muted-foreground">Memuat data…</p> : null}

        {tenants.isError ? (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
            <div>
              <p className="font-medium">Tabel tenant belum siap.</p>
              <p className="text-muted-foreground">
                Jalankan skrip <code>sql/tenant-profile.sql</code> di SQL Editor Supabase, lalu muat
                ulang halaman ini.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(tenants.error as Error).message}
              </p>
            </div>
          </div>
        ) : null}

        {!tenants.isLoading && !tenants.isError && filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada tenant yang cocok.</p>
        ) : null}

        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tenant) => {
            const due = dueInfo(tenant.due_date);
            return (
              <li key={tenant.id} className="rounded-lg border p-4">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setDetailId(tenant.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {tenant.photo_path ? (
                        <SignedImage
                          path={tenant.photo_path}
                          alt={`Foto ${tenant.name}`}
                          className="h-10 w-10 rounded-full border border-gold-line object-cover"
                        />
                      ) : null}
                      <div>
                        <p className="font-semibold">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Kamar {tenant.room_number ?? "—"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={tenant.status === "Aktif" ? "default" : "secondary"}>
                      {tenant.status}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-xs">
                    <p className={toneClass[due.tone]}>
                      Jatuh tempo {formatTanggal(tenant.due_date ?? "")} · {due.label}
                    </p>
                    <p className="text-muted-foreground">
                      Total bayar {formatRupiah(totalPaid(tenant))} · {tenant.payments.length}{" "}
                      transaksi
                    </p>
                  </div>
                </button>
                <div className="mt-3 flex gap-2">
                  <Link
                    to="/tenant/$id"
                    params={{ id: tenant.id }}
                    className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-accent"
                  >
                    Detail lengkap
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => setPaymentFor(tenant)}>
                    Bayar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(tenant);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <IfCanDelete>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Hapus tenant"
                      onClick={() => {
                        if (confirm(`Hapus data tenant ${tenant.name}?`)) {
                          deleteMutation.mutate(tenant.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </IfCanDelete>
                </div>
              </li>
            );
          })}
        </ul>
        </TabsContent>

        <TabsContent value="riwayat" className="space-y-4">
          <TenantHistoryTab />
        </TabsContent>
        </Tabs>
      </div>


      <TenantFullFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        tenant={editing}
        rooms={rooms.data ?? []}
        occupiedRoomIds={occupiedRoomIds}
        saving={saveMutation.isPending}
        onSave={(payload, phones, contacts, vehicles) =>
          saveMutation.mutate({ id: editing?.id ?? null, payload, phones, contacts, vehicles })
        }
      />

      <TenantPaymentDialog
        open={Boolean(paymentFor)}
        onOpenChange={(open) => {
          if (!open) setPaymentFor(null);
        }}
        tenant={paymentFor}
        saving={paymentMutation.isPending}
        onSave={(payload) => paymentMutation.mutate(payload)}
      />

      <TenantDetailDialog
        tenant={detail}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onAddPayment={(tenant) => setPaymentFor(tenant)}
        onDeletePayment={(id) => deletePaymentMutation.mutate(id)}
      />
    </AppShell>
  );
}

function TenantHistoryTab() {
  const history = useQuery(tenantHistoryQuery);
  const rows = history.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {rows.length} catatan perubahan status dan perpindahan kamar.
        </p>
        <ExportButtons
          label="Riwayat perubahan"
          disabled={rows.length === 0}
          onExport={(format) => exportTenantHistory(rows, format)}
        />
      </div>

      {history.isLoading ? <p className="text-sm text-muted-foreground">Memuat riwayat…</p> : null}
      {history.isError ? (
        <p className="text-sm text-destructive">{(history.error as Error).message}</p>
      ) : null}

      <ol className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{row.tenant_name ?? "Tenant"}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(row.changed_at).toLocaleString("id-ID")}
              </p>
            </div>
            <p className="mt-1 text-muted-foreground">
              Status: {row.old_status ?? "—"} → <span className="text-foreground">{row.new_status}</span>
              {" · "}Kamar: {row.old_room ?? "—"} → <span className="text-foreground">{row.new_room ?? "—"}</span>
            </p>
            {row.note ? <p className="mt-1 text-xs text-muted-foreground">{row.note}</p> : null}
          </li>
        ))}
      </ol>

      {!history.isLoading && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada riwayat perubahan.</p>
      ) : null}
    </div>
  );
}
