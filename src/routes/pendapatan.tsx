import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileDown, Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { SignedImage } from "@/components/SignedImage";
import {
  IncomeFormDialog,
  incomeInitial,
  toIncomePayload,
} from "@/components/IncomeFormDialog";
import { TenantFormDialog, tenantInitial, toTenantPayload } from "@/components/TenantFormDialog";
import {
  OtherIncomeFormDialog,
  otherIncomeInitial,
  toOtherIncomePayload,
} from "@/components/OtherIncomeFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupiah, formatTanggal } from "@/lib/expenses";
import { downloadSimplePdf } from "@/lib/pdf-report";
import {
  PAYMENT_METHODS,
  PERIOD_TYPES,
  addIncome,
  addOtherIncome,
  addTenant,
  deleteIncome,
  deleteOtherIncome,
  deleteTenant,
  incomesQuery,
  otherIncomesQuery,
  tenantsQuery,
  updateIncome,
  updateOtherIncome,
  updateTenant,
} from "@/lib/income";
import { IfCanDelete } from "@/components/IfCanDelete";

export const Route = createFileRoute("/pendapatan")({
  head: () => ({
    meta: [
      { title: "Pendapatan Kos — Lavin Kost Purwokerto" },
      {
        name: "description",
        content:
          "Catat pendapatan dari pembayaran penghuni kos: pilih penghuni aktif, periode 1/3/6 bulan atau setahun, cara bayar QRIS, transfer bank, atau tunai, plus bukti transfer.",
      },
      { property: "og:title", content: "Pendapatan Kos — Lavin Kost Purwokerto" },
      {
        property: "og:description",
        content: "Rekap pembayaran kos penghuni lengkap dengan periode dan bukti transfer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IncomePage,
});

function IncomePage() {
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [method, setMethod] = useState("Semua");
  const [period, setPeriod] = useState("Semua");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: tenants = [] } = useQuery(tenantsQuery);
  const { data: incomes = [], isLoading } = useQuery(incomesQuery);
  const { data: others = [] } = useQuery(otherIncomesQuery);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: incomesQuery.queryKey });
    void qc.invalidateQueries({ queryKey: tenantsQuery.queryKey });
    void qc.invalidateQueries({ queryKey: otherIncomesQuery.queryKey });
  };

  const createIncome = useMutation({
    mutationFn: addIncome,
    onSuccess: () => {
      invalidate();
      toast.success("Pendapatan dicatat");
    },
  });
  const editIncome = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateIncome>[1] }) =>
      updateIncome(id, patch),
    onSuccess: () => {
      invalidate();
      toast.success("Pendapatan diperbarui");
    },
  });
  const removeIncome = useMutation({
    mutationFn: deleteIncome,
    onSuccess: () => {
      invalidate();
      toast.success("Pendapatan dihapus");
    },
  });
  const createOther = useMutation({
    mutationFn: addOtherIncome,
    onSuccess: () => {
      invalidate();
      toast.success("Pendapatan lain-lain dicatat");
    },
  });
  const editOther = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateOtherIncome>[1] }) =>
      updateOtherIncome(id, patch),
    onSuccess: () => {
      invalidate();
      toast.success("Pendapatan lain-lain diperbarui");
    },
  });
  const removeOther = useMutation({
    mutationFn: deleteOtherIncome,
    onSuccess: () => {
      invalidate();
      toast.success("Pendapatan lain-lain dihapus");
    },
  });
  const createTenant = useMutation({
    mutationFn: addTenant,
    onSuccess: () => {
      invalidate();
      toast.success("Penghuni ditambahkan");
    },
  });
  const editTenant = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateTenant>[1] }) =>
      updateTenant(id, patch),
    onSuccess: () => {
      invalidate();
      toast.success("Penghuni diperbarui");
    },
  });
  const removeTenant = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => {
      invalidate();
      toast.success("Penghuni dihapus");
    },
  });

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return incomes.filter((i) => {
      if (method !== "Semua" && i.payment_method !== method) return false;
      if (period !== "Semua" && i.period_type !== period) return false;
      if (from && i.payment_date < from) return false;
      if (to && i.payment_date > to) return false;
      if (!kw) return true;
      return [i.tenant_name, i.room_number, i.notes, i.payment_method]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(kw));
    });
  }, [incomes, keyword, method, period, from, to]);

  const filteredOthers = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return others.filter((o) => {
      if (method !== "Semua" && o.payment_method !== method) return false;
      if (from && o.income_date < from) return false;
      if (to && o.income_date > to) return false;
      if (!kw) return true;
      return [o.name, o.payer, o.description, o.payment_method]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(kw));
    });
  }, [others, keyword, method, from, to]);

  const totalKos = filtered.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalLain = filteredOthers.reduce((sum, o) => sum + (o.amount || 0), 0);
  const total = totalKos + totalLain;
  const activeTenants = tenants.filter((t) => t.status === "Aktif");

  return (
    <AppShell
      title="Pendapatan"
      subtitle="Pembayaran kos penghuni: periode, cara pembayaran, dan bukti transfer."
    >
      <div className="mb-3 flex justify-end">
        <Button
          variant="outline"
          onClick={() =>
            downloadSimplePdf(
              {
                title: "Laporan Pendapatan",
                subtitle: "Pembayaran kos dan pemasukan lain-lain Lavin Kost Purwokerto.",
                summary: [
                  { label: "Total", value: formatRupiah(total) },
                  { label: "Kos", value: formatRupiah(totalKos) },
                  { label: "Lain-lain", value: formatRupiah(totalLain) },
                ],
                head: ["Tanggal", "Sumber", "Keterangan", "Metode", "Nominal"],
                body: [
                  ...filtered.map((i) => [
                    formatTanggal(i.payment_date),
                    `Kos · ${i.tenant_name}`,
                    `Kamar ${i.room_number ?? "—"} · ${i.period_type}`,
                    i.payment_method,
                    formatRupiah(i.amount || 0),
                  ]),
                  ...filteredOthers.map((o) => [
                    formatTanggal(o.income_date),
                    `Lain-lain · ${o.name}`,
                    o.payer ?? o.description ?? "—",
                    o.payment_method,
                    formatRupiah(o.amount || 0),
                  ]),
                ],
                numericColumns: [4],
              },
              "laporan-pendapatan.pdf",
            )
          }
        >
          <FileDown className="mr-2 h-4 w-4" /> Ekspor PDF
        </Button>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-lg border border-gold-line bg-card p-4">
          <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
            Total tampil
          </p>
          <p className="mt-1 font-display text-2xl font-semibold text-primary">
            {formatRupiah(total)}
          </p>
          <p className="text-xs text-muted-foreground">
            {filtered.length} pembayaran kos + {filteredOthers.length} lain-lain
          </p>
          <p className="text-[11px] text-muted-foreground">
            Kos {formatRupiah(totalKos)} • Lain-lain {formatRupiah(totalLain)}
          </p>
        </div>
        <div className="rounded-lg border border-gold-line bg-card p-4">
          <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
            Penghuni aktif
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">{activeTenants.length}</p>
          <p className="text-xs text-muted-foreground">dari {tenants.length} penghuni</p>
        </div>
        {PAYMENT_METHODS.slice(0, 2).map((m) => (
          <div key={m} className="rounded-lg border border-gold-line bg-card p-4">
            <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">{m}</p>
            <p className="mt-1 font-display text-lg font-semibold">
              {formatRupiah(
                filtered.filter((i) => i.payment_method === m).reduce((s, i) => s + i.amount, 0) +
                  filteredOthers
                    .filter((o) => o.payment_method === m)
                    .reduce((s, o) => s + o.amount, 0),
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari nama penghuni, kamar…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua cara bayar</SelectItem>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua periode</SelectItem>
            {PERIOD_TYPES.map((p) => (
              <SelectItem key={p.label} value={p.label}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-muted-foreground">–</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <IncomeFormDialog
          title="Catat pendapatan"
          tenants={tenants}
          onSubmit={async (values) => {
            await createIncome.mutateAsync(toIncomePayload(values, tenants));
          }}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Catat pembayaran
            </Button>
          }
        />
        <OtherIncomeFormDialog
          title="Catat pendapatan lain-lain"
          onSubmit={async (values) => {
            await createOther.mutateAsync(toOtherIncomePayload(values));
          }}
          trigger={
            <Button variant="secondary">
              <Plus className="mr-2 h-4 w-4" /> Pendapatan lain-lain
            </Button>
          }
        />
        <TenantFormDialog
          title="Tambah penghuni"
          onSubmit={async (values) => {
            await createTenant.mutateAsync(toTenantPayload(values));
          }}
          trigger={
            <Button variant="outline">
              <UserPlus className="mr-2 h-4 w-4" /> Tambah penghuni
            </Button>
          }
        />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg font-semibold">Daftar penghuni</h2>
        {tenants.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gold-line p-6 text-center text-sm text-muted-foreground">
            Belum ada penghuni. Tambah penghuni dan set statusnya “Aktif” agar bisa dipilih saat
            mencatat pembayaran.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {tenants.map((tenant) => (
              <li
                key={tenant.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-gold-line bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tenant.room_number ? `Kamar ${tenant.room_number}` : "Tanpa kamar"}
                    {tenant.contact ? ` • ${tenant.contact}` : ""}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] ${
                      tenant.status === "Aktif"
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {tenant.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <TenantFormDialog
                    title="Edit penghuni"
                    initial={tenantInitial(tenant)}
                    onSubmit={async (values) => {
                      await editTenant.mutateAsync({
                        id: tenant.id,
                        patch: toTenantPayload(values),
                      });
                    }}
                    trigger={
                      <Button variant="outline" size="icon" aria-label="Edit penghuni">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <IfCanDelete>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" aria-label="Hapus penghuni">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus penghuni?</AlertDialogTitle>
                          <AlertDialogDescription>
                            “{tenant.name}” beserta riwayat pembayarannya akan dihapus permanen.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeTenant.mutate(tenant.id)}>
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </IfCanDelete>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Riwayat pembayaran</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gold-line p-8 text-center text-sm text-muted-foreground">
            Belum ada pendapatan yang cocok.
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((income) => (
              <li
                key={income.id}
                className="rounded-lg border border-gold-line bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                      {income.period_type} • {income.payment_method}
                    </p>
                    <p className="font-display text-lg font-semibold">
                      {income.tenant_name}
                      {income.room_number ? ` — Kamar ${income.room_number}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Kos {formatTanggal(income.start_date)}
                      {income.end_date ? ` – ${formatTanggal(income.end_date)}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dibayar {formatTanggal(income.payment_date)}
                    </p>
                    {income.notes ? <p className="mt-1 text-sm">{income.notes}</p> : null}
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-semibold text-primary">
                      {formatRupiah(income.amount)}
                    </p>
                    <div className="mt-2 flex justify-end gap-2">
                      <IncomeFormDialog
                        title="Edit pendapatan"
                        initial={incomeInitial(income)}
                        tenants={tenants}
                        onSubmit={async (values) => {
                          await editIncome.mutateAsync({
                            id: income.id,
                            patch: toIncomePayload(values, tenants),
                          });
                        }}
                        trigger={
                          <Button variant="outline" size="icon" aria-label="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <IfCanDelete>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" aria-label="Hapus">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus pendapatan?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Pembayaran <strong>{income.tenant_name}</strong> tanggal{" "}
                                {formatTanggal(income.payment_date)} sebesar{" "}
                                {formatRupiah(income.amount)} ({income.period_type}) akan dihapus
                                permanen. Tindakan ini tidak bisa dibatalkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeIncome.mutate(income.id)}>
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </IfCanDelete>
                    </div>
                  </div>
                </div>

                {income.attachments.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {income.attachments.map((path) => (
                      <li key={path}>
                        <SignedImage
                          path={path}
                          alt={`Bukti transfer ${income.tenant_name}`}
                          className="h-16 w-16 rounded-md border border-gold-line object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Pendapatan lain-lain</h2>
            <p className="text-xs text-muted-foreground">
              Total {formatRupiah(totalLain)} dari {filteredOthers.length} catatan.
            </p>
          </div>
          <OtherIncomeFormDialog
            title="Catat pendapatan lain-lain"
            onSubmit={async (values) => {
              await createOther.mutateAsync(toOtherIncomePayload(values));
            }}
            trigger={
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" /> Tambah
              </Button>
            }
          />
        </div>

        {filteredOthers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gold-line p-8 text-center text-sm text-muted-foreground">
            Belum ada pendapatan lain-lain. Catat denda, laundry, parkir, atau pemasukan lain di
            sini.
          </p>
        ) : (
          <ul className="space-y-3">
            {filteredOthers.map((row) => (
              <li key={row.id} className="rounded-lg border border-gold-line bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                      {row.payment_method}
                    </p>
                    <p className="font-display text-lg font-semibold">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTanggal(row.income_date)}
                      {row.payer ? ` • Pembayar: ${row.payer}` : ""}
                    </p>
                    {row.description ? <p className="mt-1 text-sm">{row.description}</p> : null}
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-semibold text-primary">
                      {formatRupiah(row.amount)}
                    </p>
                    <div className="mt-2 flex justify-end gap-2">
                      <OtherIncomeFormDialog
                        title="Edit pendapatan lain-lain"
                        initial={otherIncomeInitial(row)}
                        onSubmit={async (values) => {
                          await editOther.mutateAsync({
                            id: row.id,
                            patch: toOtherIncomePayload(values),
                          });
                        }}
                        trigger={
                          <Button variant="outline" size="icon" aria-label="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <IfCanDelete>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" aria-label="Hapus">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus pendapatan lain-lain?</AlertDialogTitle>
                              <AlertDialogDescription>
                                <strong>{row.name}</strong> tanggal {formatTanggal(row.income_date)}{" "}
                                sebesar {formatRupiah(row.amount)} akan dihapus permanen. Tindakan ini
                                tidak bisa dibatalkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => removeOther.mutate(row.id)}>
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </IfCanDelete>
                    </div>
                  </div>
                </div>

                {row.attachments.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {row.attachments.map((path) => (
                      <li key={path}>
                        <SignedImage
                          path={path}
                          alt={`Tanda terima ${row.name}`}
                          className="h-16 w-16 rounded-md border border-gold-line object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
