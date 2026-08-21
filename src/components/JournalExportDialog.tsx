import { useEffect, useMemo, useState } from "react";
import { FileDown, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { JournalColumnEditor } from "@/components/JournalColumnEditor";
import { formatRupiah, formatTanggal } from "@/lib/expenses";
import {
  JOURNAL_PRESETS,
  journalByMonth,
  journalTotals,
  presetRange,
  type JournalEntry,
  type JournalPreset,
} from "@/lib/journal";
import {
  defaultJournalColumns,
  type JournalColumnConfig,
  type JournalRow,
} from "@/lib/journal-columns";
import {
  exportJournalCsv,
  exportJournalExcel,
  exportJournalPdf,
} from "@/lib/journal-export";

const STEPS = ["Periode", "Kolom", "Format & Unduh"] as const;

export function JournalExportDialog({
  open,
  onOpenChange,
  entries,
  initialFrom,
  initialTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: JournalEntry[];
  initialFrom: string;
  initialTo: string;
}) {
  const [step, setStep] = useState(0);
  const [preset, setPreset] = useState<JournalPreset>("kustom");
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [columns, setColumns] = useState<JournalColumnConfig[]>(() => defaultJournalColumns());
  const [title, setTitle] = useState("Jurnal Umum — Lavin Kost Purwokerto");
  const [includeTotals, setIncludeTotals] = useState(true);
  const [includeMonths, setIncludeMonths] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setFrom(initialFrom);
    setTo(initialTo);
    setPreset(initialFrom || initialTo ? "kustom" : "semua");
  }, [open, initialFrom, initialTo]);

  const applyPreset = (next: JournalPreset) => {
    setPreset(next);
    if (next === "kustom") return;
    const range = presetRange(next);
    setFrom(range.from);
    setTo(range.to);
  };

  const filtered = useMemo(
    () =>
      entries.filter((entry) => {
        if (from && entry.date < from) return false;
        if (to && entry.date > to) return false;
        return true;
      }),
    [entries, from, to],
  );

  const totals = useMemo(() => journalTotals(filtered), [filtered]);
  const months = useMemo(() => journalByMonth(filtered), [filtered]);

  const rows: JournalRow[] = useMemo(() => {
    const ascending = [...filtered].reverse();
    let saldo = 0;
    return ascending.map((entry, index) => {
      saldo += entry.kind === "Pendapatan" ? entry.amount : -entry.amount;
      return { entry, saldo, index };
    });
  }, [filtered]);

  const periodLabel =
    from || to
      ? `${from ? formatTanggal(from) : "awal"} s/d ${to ? formatTanggal(to) : "kini"}`
      : "Semua periode";

  const meta = {
    title: title.trim() || "Jurnal Umum",
    periode: periodLabel,
    ringkasan: [
      { label: "Total Pendapatan", value: formatRupiah(totals.pendapatan) },
      { label: "Total Pengeluaran", value: formatRupiah(totals.pengeluaran) },
      { label: "Saldo", value: formatRupiah(totals.saldo) },
      { label: "Jumlah Transaksi", value: String(filtered.length) },
    ],
    includeTotals,
    ...(includeMonths ? { months } : {}),
  };

  const slug = (from || to ? `${from || "awal"}_${to || "kini"}` : "semua-periode").replace(
    /[^\w-]/g,
    "",
  );

  async function run(kind: "excel" | "csv" | "pdf") {
    if (!rows.length) {
      toast.error("Tidak ada transaksi pada periode ini.");
      return;
    }
    if (!columns.some((c) => c.visible)) {
      toast.error("Pilih minimal satu kolom.");
      return;
    }
    setBusy(kind);
    try {
      if (kind === "excel") {
        await exportJournalExcel(rows, columns, meta, `jurnal-umum-${slug}.xlsx`);
      } else if (kind === "csv") {
        exportJournalCsv(rows, columns, meta, `jurnal-umum-${slug}.csv`);
      } else {
        await exportJournalPdf(rows, columns, meta, `jurnal-umum-${slug}.pdf`);
      }
      toast.success("Berkas jurnal diunduh.");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengekspor jurnal.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ekspor Jurnal Umum</DialogTitle>
          <DialogDescription>
            Langkah {step + 1} dari {STEPS.length} · {STEPS[step]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(i)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-gold" : "bg-muted"
              }`}
              aria-label={`Ke langkah ${label}`}
            />
          ))}
        </div>

        {step === 0 ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Preset periode</Label>
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
                <Label htmlFor="export-dari">Dari tanggal</Label>
                <Input
                  id="export-dari"
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPreset("kustom");
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="export-sampai">Sampai tanggal</Label>
                <Input
                  id="export-sampai"
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPreset("kustom");
                  }}
                />
              </div>
            </div>

            <div className="rounded-lg border border-gold-line bg-background/40 p-3 text-sm">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                {periodLabel}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Transaksi</p>
                  <p className="font-medium">{filtered.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendapatan</p>
                  <p className="font-medium text-success">{formatRupiah(totals.pendapatan)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pengeluaran</p>
                  <p className="font-medium text-destructive">
                    {formatRupiah(totals.pengeluaran)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className="font-medium">{formatRupiah(totals.saldo)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <JournalColumnEditor
            columns={columns}
            onChange={setColumns}
            onTitleDetected={setTitle}
            onTotalsDetected={setIncludeTotals}
          />
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="export-judul">Judul laporan</Label>
              <Input
                id="export-judul"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Jurnal Umum"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={includeTotals}
                  onCheckedChange={(v) => setIncludeTotals(v === true)}
                />
                Sertakan baris total
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={includeMonths}
                  onCheckedChange={(v) => setIncludeMonths(v === true)}
                />
                Sertakan rekap bulanan
              </label>
            </div>
            <div className="rounded-lg border border-gold-line bg-background/40 p-3 text-xs text-muted-foreground">
              {rows.length} baris · {columns.filter((c) => c.visible).length} kolom ·{" "}
              {periodLabel}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button type="button" disabled={busy !== null} onClick={() => void run("excel")}>
                {busy === "excel" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy !== null}
                onClick={() => void run("csv")}
              >
                <FileText className="mr-2 h-4 w-4" /> CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy !== null}
                onClick={() => void run("pdf")}
              >
                {busy === "pdf" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4" />
                )}
                PDF
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-2 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Kembali
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={step === STEPS.length - 1}
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          >
            Lanjut
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
