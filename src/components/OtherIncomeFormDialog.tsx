import { useEffect, useState, type ReactNode } from "react";
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
  type OtherIncome,
  type OtherIncomePayload,
} from "@/lib/income";

export type OtherIncomeFormValues = {
  name: string;
  income_date: string;
  description: string;
  payer: string;
  payment_method: string;
  amount: string;
  attachments: string[];
};

const empty: OtherIncomeFormValues = {
  name: "",
  income_date: new Date().toISOString().slice(0, 10),
  description: "",
  payer: "",
  payment_method: "Transfer Bank",
  amount: "",
  attachments: [],
};

export function toOtherIncomePayload(values: OtherIncomeFormValues): OtherIncomePayload {
  return {
    name: values.name.trim(),
    income_date: values.income_date,
    description: values.description.trim() || null,
    payer: values.payer.trim() || null,
    payment_method: values.payment_method,
    amount: values.amount.trim() === "" ? 0 : Number(values.amount),
    attachments: values.attachments,
  };
}

export function otherIncomeInitial(row: OtherIncome): OtherIncomeFormValues {
  return {
    name: row.name,
    income_date: row.income_date,
    description: row.description ?? "",
    payer: row.payer ?? "",
    payment_method: row.payment_method,
    amount: String(row.amount ?? ""),
    attachments: row.attachments,
  };
}

export function OtherIncomeFormDialog({
  trigger,
  title,
  initial,
  onSubmit,
}: {
  trigger: ReactNode;
  title: string;
  initial?: Partial<OtherIncomeFormValues>;
  onSubmit: (values: OtherIncomeFormValues) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<OtherIncomeFormValues>({ ...empty, ...initial });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValues({ ...empty, ...initial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function set<K extends keyof OtherIncomeFormValues>(key: K, value: OtherIncomeFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!values.name.trim()) {
      toast.error("Isi nama pendapatan terlebih dahulu");
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
            Pendapatan di luar pembayaran kos: denda, laundry, parkir, dan lainnya.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="oi-name">Nama pendapatan</Label>
            <Input
              id="oi-name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Mis. Sewa parkir motor"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="oi-date">Tanggal</Label>
              <Input
                id="oi-date"
                type="date"
                value={values.income_date}
                onChange={(e) => set("income_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oi-payer">Nama pembayar</Label>
              <Input
                id="oi-payer"
                value={values.payer}
                onChange={(e) => set("payer", e.target.value)}
                placeholder="Mis. Budi"
              />
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
              <Label htmlFor="oi-amount">Jumlah (Rp)</Label>
              <Input
                id="oi-amount"
                inputMode="numeric"
                value={values.amount}
                onChange={(e) => set("amount", e.target.value.replace(/[^\d]/g, ""))}
                placeholder="0"
              />
            </div>
          </div>

          <ProofUploader
            folder="pendapatan-lain"
            paths={values.attachments}
            onChange={(next) => set("attachments", next)}
            label="Tanda terima"
          />

          <div className="space-y-2">
            <Label htmlFor="oi-desc">Keterangan</Label>
            <Textarea
              id="oi-desc"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
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
