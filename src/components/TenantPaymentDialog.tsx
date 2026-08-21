import { useEffect, useState } from "react";
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
  RENT_PERIODS,
  TENANT_PAYMENT_METHODS,
  addMonths,
  monthsOfPeriod,
  type TenantPaymentPayload,
  type TenantProfile,
} from "@/lib/tenants";

const today = () => new Date().toISOString().slice(0, 10);

export function TenantPaymentDialog({
  open,
  onOpenChange,
  tenant,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantProfile | null;
  saving: boolean;
  onSave: (payload: TenantPaymentPayload) => void;
}) {
  const [paymentDate, setPaymentDate] = useState(today());
  const [periodType, setPeriodType] = useState("1 Bulan");
  const [periodStart, setPeriodStart] = useState(today());
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("Transfer Bank");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const start = tenant?.due_date ?? today();
    setPaymentDate(today());
    setPeriodType(tenant?.rent_period ?? "1 Bulan");
    setPeriodStart(start);
    setAmount("");
    setMethod("Transfer Bank");
    setNotes("");
    setAttachments([]);
  }, [open, tenant]);

  const periodEnd = periodStart ? addMonths(periodStart, monthsOfPeriod(periodType)) : "";

  function submit() {
    if (!tenant) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Jumlah pembayaran harus lebih dari 0.");
      return;
    }
    onSave({
      tenant_id: tenant.id,
      payment_date: paymentDate,
      period_type: periodType,
      period_start: periodStart || null,
      period_end: periodEnd || null,
      amount: value,
      payment_method: method,
      notes: notes.trim() || null,
      attachments,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Catat Pembayaran</DialogTitle>
          <DialogDescription>{tenant ? tenant.name : ""}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-date">Tanggal bayar</Label>
              <Input
                id="p-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Periode</Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RENT_PERIODS.map((period) => (
                    <SelectItem key={period.label} value={period.label}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-start">Mulai periode</Label>
              <Input
                id="p-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-end">Sampai</Label>
              <Input id="p-end" type="date" value={periodEnd} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-amount">Jumlah (Rp)</Label>
              <Input
                id="p-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="600000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Metode pembayaran</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TENANT_PAYMENT_METHODS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-notes">Catatan</Label>
            <Textarea
              id="p-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <ProofUploader
            folder="tenant-payments"
            paths={attachments}
            onChange={setAttachments}
            label="Bukti pembayaran"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan pembayaran"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
