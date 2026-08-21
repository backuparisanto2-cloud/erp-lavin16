import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, FileDown, FileSpreadsheet, Search, Wallet } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { SignedImage } from "@/components/SignedImage";
import { JournalExportDialog } from "@/components/JournalExportDialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { expensesQuery, formatRupiah, formatTanggal } from "@/lib/expenses";
import { formatMonth, incomesQuery, otherIncomesQuery } from "@/lib/income";
import {
  JOURNAL_PRESETS,
  buildJournal,
  journalByMonth,
  journalTotals,
  presetRange,
  type JournalEntry,
  type JournalPreset,
} from "@/lib/journal";
import { downloadSimplePdf } from "@/lib/pdf-report";

export const Route = createFileRoute("/jurnal")({
  head: () => ({
    meta: [
      { title: "Jurnal Umum Keuangan — Lavin Kost Purwokerto" },
      {
        name: "description",
        content:
          "Jurnal umum yang menggabungkan seluruh pendapatan sewa kamar, pendapatan lain-lain, dan pengeluaran kost dalam satu buku dengan saldo berjalan.",
      },
      { property: "og:title", content: "Jurnal Umum Keuangan — Lavin Kost Purwokerto" },
      {
        property: "og:description",
        content: "Semua penerimaan dan pengeluaran Lavin Kost dalam satu jurnal terpadu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JournalPage,
});

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone: "income" | "expense" | "neutral";
}) {
  const color =
    tone === "income" ? "text-success" : tone === "expense" ? "text-destructive" : "text-foreground";
  return (
    <div className="gold-card rounded-xl p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className={`mt-2 font-display text-2xl font-semibold break-words ${color}`}>{value}</p>
    </div>
  );
}

function JournalPage() {
  const incomes = useQuery(incomesQuery);
  const others = useQuery(otherIncomesQuery);
  const expenses = useQuery(expensesQuery);

  const [preset, setPreset] = useState<JournalPreset>("semua");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kind, setKind] = useState("Semua");
  const [category, setCategory] = useState("Semua");
  const [keyword, setKeyword] = useState("");
  const [detail, setDetail] = useState<JournalEntry | null>(null);
  const [exportOpen, setExportOpen] = useState(false);


  const all = useMemo(
    () => buildJournal(incomes.data ?? [], others.data ?? [], expenses.data ?? []),
    [incomes.data, others.data, expenses.data],
  );

  const categories = useMemo(
    () => [...new Set(all.map((e) => e.category))].sort((a, b) => a.localeCompare(b, "id")),
    [all],
  );

  const applyPreset = (next: JournalPreset) => {
    setPreset(next);
    if (next === "kustom") return;
    const range = presetRange(next);
    setFrom(range.from);
    setTo(range.to);
  };

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return all.filter((entry) => {
      if (from && entry.date < from) return false;
      if (to && entry.date > to) return false;
      if (kind !== "Semua" && entry.kind !== kind) return false;
      if (category !== "Semua" && entry.category !== category) return false;
      if (
        q &&
        ![entry.description, entry.category, entry.source, entry.method ?? "", entry.notes ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [all, from, to, kind, category, keyword]);

  const totals = useMemo(() => journalTotals(filtered), [filtered]);
  const months = useMemo(() => journalByMonth(filtered), [filtered]);

  // saldo berjalan dihitung dari transaksi terlama
  const rows = useMemo(() => {
    const ascending = [...filtered].reverse();
    let saldo = 0;
    const withSaldo = ascending.map((entry) => {
      saldo += entry.kind === "Pendapatan" ? entry.amount : -entry.amount;
      return { entry, saldo };
    });
    return withSaldo.reverse();
  }, [filtered]);

  const periodLabel = from || to ? `${from || "awal"} s/d ${to || "kini"}` : "Semua periode";

  const exportRows = () =>
    filtered.map((entry) => [
      formatTanggal(entry.date),
      entry.description,
      entry.kind,
      entry.category,
      entry.method ?? "-",
      entry.kind === "Pendapatan" ? entry.amount : 0,
      entry.kind === "Pengeluaran" ? entry.amount : 0,
    ]);

  const handlePdf = async () => {
    await downloadSimplePdf(
      {
        title: "Jurnal Umum — Lavin Kost Purwokerto",
        subtitle: `Periode: ${periodLabel}`,
        summary: [
          { label: "Total Pendapatan", value: formatRupiah(totals.pendapatan) },
          { label: "Total Pengeluaran", value: formatRupiah(totals.pengeluaran) },
          { label: "Saldo", value: formatRupiah(totals.saldo) },
          { label: "Jumlah Transaksi", value: String(filtered.length) },
        ],
        head: ["Tanggal", "Keterangan", "Jenis", "Kategori", "Metode/Lokasi", "Pendapatan", "Pengeluaran"],
        body: exportRows().map((row) =>
          row.map((cell, i) =>
            i >= 5 ? (Number(cell) ? formatRupiah(Number(cell)) : "-") : String(cell),
          ),
        ),
        numericColumns: [5, 6],
        orientation: "landscape",
      },
      "jurnal-umum.pdf",
    );
  };




  const loading = incomes.isLoading || others.isLoading || expenses.isLoading;

  return (
    <AppShell
      title="Jurnal Umum"
      subtitle="Semua penerimaan dikategorikan sebagai pendapatan dan semua biaya sebagai pengeluaran, tersinkron dengan halaman Pendapatan dan Pengeluaran."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Total Pendapatan"
          value={formatRupiah(totals.pendapatan)}
          icon={ArrowUpCircle}
          tone="income"
        />
        <Stat
          label="Total Pengeluaran"
          value={formatRupiah(totals.pengeluaran)}
          icon={ArrowDownCircle}
          tone="expense"
        />
        <Stat
          label="Saldo"
          value={formatRupiah(totals.saldo)}
          icon={Wallet}
          tone={totals.saldo < 0 ? "expense" : "neutral"}
        />
        <Stat
          label="Jumlah Transaksi"
          value={String(filtered.length)}
          icon={FileSpreadsheet}
          tone="neutral"
        />
      </div>

      <div className="gold-card mt-4 rounded-xl p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Periode</Label>
            <Select value={preset} onValueChange={(v) => applyPreset(v as JournalPreset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOURNAL_PRESETS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jurnal-dari">Dari tanggal</Label>
            <Input
              id="jurnal-dari"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("kustom");
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jurnal-sampai">Sampai tanggal</Label>
            <Input
              id="jurnal-sampai"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("kustom");
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Jenis</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua</SelectItem>
                <SelectItem value="Pendapatan">Pendapatan</SelectItem>
                <SelectItem value="Pengeluaran">Pengeluaran</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semua">Semua kategori</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="jurnal-cari">Cari</Label>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="jurnal-cari"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Keterangan, kategori, metode, catatan…"
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" onClick={() => setExportOpen(true)} className="flex-1">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Ekspor Jurnal
            </Button>
            <Button type="button" variant="outline" onClick={handlePdf} className="flex-1">
              <FileDown className="mr-2 h-4 w-4" /> PDF Cepat
            </Button>
          </div>

        </div>
      </div>

      <div className="gold-card mt-4 overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="bg-accent/60 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Keterangan</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 text-right font-medium">Pendapatan</th>
                <th className="px-4 py-3 text-right font-medium">Pengeluaran</th>
                <th className="px-4 py-3 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Memuat jurnal…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Belum ada transaksi pada filter ini.
                  </td>
                </tr>
              ) : (
                rows.map(({ entry, saldo }) => (
                  <tr
                    key={entry.id}
                    onClick={() => setDetail(entry)}
                    className="cursor-pointer border-t border-gold-line transition-colors hover:bg-accent/50"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">{formatTanggal(entry.date)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.source}
                        {entry.method ? ` · ${entry.method}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{entry.category}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-success">
                      {entry.kind === "Pendapatan" ? formatRupiah(entry.amount) : "-"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-destructive">
                      {entry.kind === "Pengeluaran" ? formatRupiah(entry.amount) : "-"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${saldo < 0 ? "text-destructive" : ""}`}
                    >
                      {formatRupiah(saldo)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot>
                <tr className="border-t border-gold-line bg-accent/40 font-medium">
                  <td className="px-4 py-3" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-success">
                    {formatRupiah(totals.pendapatan)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-destructive">
                    {formatRupiah(totals.pengeluaran)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatRupiah(totals.saldo)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>

      <div className="gold-card mt-4 rounded-xl p-5">
        <h2 className="font-display text-xl font-semibold">Rekap Bulanan</h2>
        {months.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Belum ada data.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Bulan</th>
                  <th className="py-2 text-right font-medium">Pendapatan</th>
                  <th className="py-2 text-right font-medium">Pengeluaran</th>
                  <th className="py-2 text-right font-medium">Laba / Rugi</th>
                  <th className="py-2 text-right font-medium">Transaksi</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.month} className="border-t border-gold-line">
                    <td className="py-2">{formatMonth(m.month)}</td>
                    <td className="py-2 text-right tabular-nums text-success">
                      {formatRupiah(m.pendapatan)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-destructive">
                      {formatRupiah(m.pengeluaran)}
                    </td>
                    <td
                      className={`py-2 text-right tabular-nums ${m.saldo < 0 ? "text-destructive" : ""}`}
                    >
                      {formatRupiah(m.saldo)}
                    </td>
                    <td className="py-2 text-right tabular-nums">{m.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.description}</DialogTitle>
            <DialogDescription>
              {detail ? `${detail.kind} · ${detail.category}` : ""}
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal</p>
                  <p>{formatTanggal(detail.date)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nilai</p>
                  <p
                    className={detail.kind === "Pendapatan" ? "text-success" : "text-destructive"}
                  >
                    {formatRupiah(detail.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sumber</p>
                  <p>{detail.source}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Metode / Lokasi</p>
                  <p>{detail.method ?? "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Catatan</p>
                <p className="whitespace-pre-wrap">{detail.notes || "-"}</p>
              </div>
              {detail.attachments.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Lampiran</p>
                  <div className="grid grid-cols-3 gap-2">
                    {detail.attachments.map((path) => (
                      <SignedImage
                        key={path}
                        path={path}
                        alt={`Lampiran ${detail.description}`}
                        className="h-24 w-full rounded-md border border-gold-line object-cover"
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <JournalExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        entries={all}
        initialFrom={from}
        initialTo={to}
      />

    </AppShell>
  );
}
