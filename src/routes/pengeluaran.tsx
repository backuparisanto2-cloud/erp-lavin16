import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FileDown, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { SignedImage } from "@/components/SignedImage";
import {
  ExpenseFormDialog,
  expenseInitial,
  toExpensePayload,
} from "@/components/ExpenseFormDialog";
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
import {
  EXPENSE_CATEGORIES,
  addExpense,
  addExpenseLocation,
  deleteExpense,
  expenseLocationsQuery,
  expensesQuery,
  formatRupiah,
  formatTanggal,
  updateExpense,
} from "@/lib/expenses";
import { downloadSimplePdf } from "@/lib/pdf-report";
import { IfCanDelete } from "@/components/IfCanDelete";


export const Route = createFileRoute("/pengeluaran")({
  head: () => ({
    meta: [
      { title: "Pengeluaran Kost — Lavin Kost Purwokerto" },
      {
        name: "description",
        content:
          "Catat pengeluaran kost per kategori: belanja, service/perbaikan, jasa, iuran, dan lain-lain, lengkap dengan bukti invoice atau kuitansi.",
      },
      { property: "og:title", content: "Pengeluaran Kost — Lavin Kost Purwokerto" },
      {
        property: "og:description",
        content: "Rekap pengeluaran kost lengkap dengan bukti dan pembacaan nota otomatis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("Semua");
  const [location, setLocation] = useState("Semua");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: expenses = [], isLoading } = useQuery(expensesQuery);
  const { data: locations = [] } = useQuery(expenseLocationsQuery);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: expensesQuery.queryKey });
    void qc.invalidateQueries({ queryKey: expenseLocationsQuery.queryKey });
  };

  const create = useMutation({
    mutationFn: addExpense,
    onSuccess: () => {
      invalidate();
      toast.success("Pengeluaran ditambahkan");
    },
  });
  const edit = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateExpense>[1] }) =>
      updateExpense(id, patch),
    onSuccess: () => {
      invalidate();
      toast.success("Pengeluaran diperbarui");
    },
  });
  const remove = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      invalidate();
      toast.success("Pengeluaran dihapus");
    },
  });

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return expenses.filter((e) => {
      if (category !== "Semua" && e.category !== category) return false;
      if (location !== "Semua" && (e.location ?? "") !== location) return false;
      if (from && e.expense_date < from) return false;
      if (to && e.expense_date > to) return false;
      if (!kw) return true;
      return [e.name, e.vendor, e.invoice_no, e.notes, e.dues_name, e.location]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(kw));
    });
  }, [expenses, keyword, category, location, from, to]);

  const total = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);
  const perCategory = EXPENSE_CATEGORIES.map((c) => ({
    category: c,
    total: filtered.filter((e) => e.category === c).reduce((s, e) => s + (e.amount || 0), 0),
  }));

  async function handleAddLocation(name: string) {
    await addExpenseLocation(name);
    await qc.invalidateQueries({ queryKey: expenseLocationsQuery.queryKey });
  }

  return (
    <AppShell
      title="Pengeluaran"
      subtitle="Belanja, service, jasa, iuran, dan pengeluaran lainnya."
    >
      <div className="mb-3 flex justify-end">
        <Button
          variant="outline"
          onClick={() =>
            downloadSimplePdf(
              {
                title: "Laporan Pengeluaran",
                subtitle: "Belanja, service, jasa, dan iuran Lavin Kost Purwokerto.",
                summary: [
                  { label: "Total", value: formatRupiah(total) },
                  { label: "Transaksi", value: String(filtered.length) },
                ],
                head: ["Tanggal", "Kategori", "Nama", "Lokasi/Vendor", "Nota", "Nominal"],
                body: filtered.map((e) => [
                  formatTanggal(e.expense_date),
                  e.category,
                  e.name,
                  e.location ?? e.vendor ?? "—",
                  e.invoice_no ?? "—",
                  formatRupiah(e.amount || 0),
                ]),
                numericColumns: [5],
              },
              "laporan-pengeluaran.pdf",
            )
          }
        >
          <FileDown className="mr-2 h-4 w-4" /> Ekspor PDF
        </Button>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

        <div className="rounded-lg border border-gold-line bg-card p-4">
          <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
            Total tampil
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">{formatRupiah(total)}</p>
          <p className="text-xs text-muted-foreground">{filtered.length} transaksi</p>
        </div>
        {perCategory.map((c) => (
          <div key={c.category} className="rounded-lg border border-gold-line bg-card p-4">
            <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              {c.category}
            </p>
            <p className="mt-1 font-display text-lg font-semibold">{formatRupiah(c.total)}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari nama, vendor, invoice…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua kategori</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua lokasi</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
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

      <div className="mb-4">
        <ExpenseFormDialog
          title="Tambah pengeluaran"
          locations={locations}
          onAddLocation={handleAddLocation}
          onSubmit={async (values) => {
            await create.mutateAsync(toExpensePayload(values));
          }}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Tambah pengeluaran
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gold-line p-8 text-center text-sm text-muted-foreground">
          Belum ada pengeluaran yang cocok.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((expense) => (
            <li
              key={expense.id}
              className="rounded-lg border border-gold-line bg-card p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                    {expense.category}
                  </p>
                  <p className="font-display text-lg font-semibold">{expense.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatTanggal(expense.expense_date)}
                    {expense.location ? ` • ${expense.location}` : ""}
                    {expense.vendor ? ` • ${expense.vendor}` : ""}
                  </p>
                  {expense.invoice_no ? (
                    <p className="text-xs text-muted-foreground">No. {expense.invoice_no}</p>
                  ) : null}
                  {expense.dues_name ? (
                    <p className="text-xs text-muted-foreground">
                      Iuran: {expense.dues_name}
                      {expense.dues_contact ? ` • ${expense.dues_contact}` : ""}
                    </p>
                  ) : null}
                  {expense.notes ? <p className="mt-1 text-sm">{expense.notes}</p> : null}
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-semibold text-primary">
                    {formatRupiah(expense.amount)}
                  </p>
                  <div className="mt-2 flex justify-end gap-2">
                    <ExpenseFormDialog
                      title="Edit pengeluaran"
                      initial={expenseInitial(expense)}
                      locations={locations}
                      onAddLocation={handleAddLocation}
                      onSubmit={async (values) => {
                        await edit.mutateAsync({
                          id: expense.id,
                          patch: toExpensePayload(values),
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
                            <AlertDialogTitle>Hapus pengeluaran?</AlertDialogTitle>
                            <AlertDialogDescription>
                              “{expense.name}” akan dihapus permanen.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(expense.id)}>
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </IfCanDelete>
                  </div>
                </div>
              </div>

              {expense.attachments.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {expense.attachments.map((path) => (
                    <li key={path}>
                      <SignedImage
                        path={path}
                        alt={`Bukti ${expense.name}`}
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
    </AppShell>
  );
}
