import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ProofUploader } from "@/components/ProofUploader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PAYMENT_METHODS,
  PERIOD_TYPES,
  addMonths,
  monthsOfPeriod,
  type Income,
  type IncomePayload,
  type Tenant,
} from "@/lib/income";
import { formatTanggal } from "@/lib/expenses";

export type IncomeFormValues = {
  tenant_id: string;
  period_type: string;
  start_date: string;
  payment_date: string;
  payment_method: string;
  amount: string;
  notes: string;
  attachments: string[];
};

const empty: IncomeFormValues = {
  tenant_id: "",
  period_type: "1 Bulan",
  start_date: new Date().toISOString().slice(0, 10),
  payment_date: new Date().toISOString().slice(0, 10),
  payment_method: "Transfer Bank",
  amount: "",
  notes: "",
  attachments: [],
};

export function toIncomePayload(values: IncomeFormValues, tenants: Tenant[]): IncomePayload {
  const tenant = tenants.find((t) => t.id === values.tenant_id);
  const months = monthsOfPeriod(values.period_type);
  return {
    tenant_id: values.tenant_id,
    tenant_name: tenant?.name ?? "",
    room_number: tenant?.room_number ?? null,
    period_type: values.period_type,
    period_months: months,
    start_date: values.start_date,
    end_date: addMonths(values.start_date, months),
    payment_date: values.payment_date,
    payment_method: values.payment_method,
    amount: values.amount.trim() === "" ? 0 : Number(values.amount),
    notes: values.notes.trim() || null,
    attachments: values.attachments,
  };
}

export function incomeInitial(income: Income): IncomeFormValues {
  return {
    tenant_id: income.tenant_id,
    period_type: income.period_type,
    start_date: income.start_date,
    payment_date: income.payment_date,
    payment_method: income.payment_method,
    amount: String(income.amount ?? ""),
    notes: income.notes ?? "",
    attachments: income.attachments,
  };
}

export function IncomeFormDialog({
  trigger,
  title,
  initial,
  tenants,
  onSubmit,
}: {
  trigger: ReactNode;
  title: string;
  initial?: Partial<IncomeFormValues>;
  tenants: Tenant[];
  onSubmit: (values: IncomeFormValues) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<IncomeFormValues>({ ...empty, ...initial });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValues({ ...empty, ...initial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function set<K extends keyof IncomeFormValues>(key: K, value: IncomeFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // Hanya penghuni aktif yang bisa dipilih; penghuni pada data lama tetap tampil.
  const selectable = useMemo(() => {
    const active = tenants.filter((t) => t.status === "Aktif");
    const current = tenants.find((t) => t.id === values.tenant_id);
    return current && current.status !== "Aktif" ? [current, ...active] : active;
  }, [tenants, values.tenant_id]);

  const endDate = addMonths(values.start_date, monthsOfPeriod(values.period_type));

  async function submit() {
    if (!values.tenant_id) {
      toast.error("Pilih nama penghuni terlebih dahulu");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
      setOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription>
            Catat pembayaran kos penghuni beserta periode dan bukti transfernya.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nama penghuni (status aktif)</Label>
            <Select value={values.tenant_id} onValueChange={(v) => set("tenant_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih penghuni" />
              </SelectTrigger>
              <SelectContent>
                {selectable.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.room_number ? ` — Kamar ${t.room_number}` : ""}
                    {t.status !== "Aktif" ? ` (${t.status})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectable.length === 0 ? (
              <p className="text-xs text-destructive">
                Belum ada penghuni aktif. Tambah penghuni dan set statusnya “Aktif” dulu.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipe periode kos</Label>
              <Select value={values.period_type} onValueChange={(v) => set("period_type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_TYPES.map((p) => (
                    <SelectItem key={p.label} value={p.label}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cara pembayaran</Label>
              <Select value={values.payment_method} onValueChange={(v) => set("payment_method", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inc-start">Tanggal mulai kos</Label>
              <Input
                id="inc-start"
                type="date"
                value={values.start_date}
                onChange={(e) => set("start_date", e.target.value)}
              />
              <p className="text-[11px] text-primary">
                Periode {values.period_type} — berlaku sampai {formatTanggal(endDate)}
                <span className="block text-muted-foreground">
                  Tanggal selesai dihitung ulang otomatis saat periode atau tanggal mulai diubah.
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inc-paid">Tanggal pembayaran</Label>
              <Input
                id="inc-paid"
                type="date"
                value={values.payment_date}
                onChange={(e) => set("payment_date", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="inc-amount">Nominal (Rp)</Label>
              <Input
                id="inc-amount"
                inputMode="numeric"
                value={values.amount}
                onChange={(e) => set("amount", e.target.value.replace(/[^\d]/g, ""))}
                placeholder="0"
              />
            </div>
          </div>

          <ProofUploader
            folder="pendapatan"
            paths={values.attachments}
            onChange={(next) => set("attachments", next)}
            label="Bukti transfer"
          />

          <div className="space-y-2">
            <Label htmlFor="inc-notes">Catatan</Label>
            <Textarea
              id="inc-notes"
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
