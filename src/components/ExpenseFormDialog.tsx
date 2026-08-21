import { useEffect, useState, type ReactNode } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { AttachmentUploader } from "@/components/AttachmentUploader";
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
import { compressToWebp } from "@/lib/image-compress";
import { pdfToWebpBlobs } from "@/lib/pdf-to-webp";
import { scanExpenseDocument } from "@/lib/expense-ai.functions";
import { EXPENSE_CATEGORIES, type Expense, type ExpensePayload } from "@/lib/expenses";

export type ExpenseFormValues = {
  category: string;
  name: string;
  expense_date: string;
  amount: string;
  invoice_no: string;
  notes: string;
  location: string;
  vendor: string;
  dues_name: string;
  dues_contact: string;
  attachments: string[];
};

const empty: ExpenseFormValues = {
  category: "Belanja",
  name: "",
  expense_date: new Date().toISOString().slice(0, 10),
  amount: "",
  invoice_no: "",
  notes: "",
  location: "",
  vendor: "",
  dues_name: "",
  dues_contact: "",
  attachments: [],
};

export function toExpensePayload(values: ExpenseFormValues): ExpensePayload {
  return {
    category: values.category,
    name: values.name.trim(),
    expense_date: values.expense_date,
    amount: values.amount.trim() === "" ? 0 : Number(values.amount),
    invoice_no: values.invoice_no.trim() || null,
    notes: values.notes.trim() || null,
    location: values.location.trim() || null,
    vendor: values.vendor.trim() || null,
    dues_name: values.dues_name.trim() || null,
    dues_contact: values.dues_contact.trim() || null,
    attachments: values.attachments,
  };
}

export function expenseInitial(expense: Expense): ExpenseFormValues {
  return {
    category: expense.category,
    name: expense.name,
    expense_date: expense.expense_date,
    amount: String(expense.amount ?? ""),
    invoice_no: expense.invoice_no ?? "",
    notes: expense.notes ?? "",
    location: expense.location ?? "",
    vendor: expense.vendor ?? "",
    dues_name: expense.dues_name ?? "",
    dues_contact: expense.dues_contact ?? "",
    attachments: expense.attachments,
  };
}

async function fileToWebpDataUrl(file: File): Promise<string> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const blob = isPdf ? (await pdfToWebpBlobs(file))[0]?.blob : await compressToWebp(file);
  if (!blob) throw new Error("Dokumen kosong");
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membaca dokumen"));
    reader.readAsDataURL(blob);
  });
}

export function ExpenseFormDialog({
  trigger,
  title,
  initial,
  locations,
  onAddLocation,
  onSubmit,
}: {
  trigger: ReactNode;
  title: string;
  initial?: Partial<ExpenseFormValues>;
  locations: string[];
  onAddLocation: (name: string) => Promise<void>;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ExpenseFormValues>({ ...empty, ...initial });
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [newLocation, setNewLocation] = useState("");

  useEffect(() => {
    if (open) setValues({ ...empty, ...initial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function set<K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleScan(file: File) {
    setScanning(true);
    try {
      const imageDataUrl = await fileToWebpDataUrl(file);
      const result = await scanExpenseDocument({
        data: { imageDataUrl, categories: [...EXPENSE_CATEGORIES] },
      });
      setValues((prev) => ({
        ...prev,
        name: result.name || prev.name,
        expense_date: result.expense_date || prev.expense_date,
        amount: result.amount ? String(result.amount) : prev.amount,
        invoice_no: result.invoice_no || prev.invoice_no,
        vendor: result.vendor || prev.vendor,
        notes: result.notes || prev.notes,
        category:
          result.category && (EXPENSE_CATEGORIES as readonly string[]).includes(result.category)
            ? result.category
            : prev.category,
      }));
      toast.success("Form terisi dari dokumen. Periksa kembali sebelum simpan.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setScanning(false);
    }
  }

  async function submit() {
    if (!values.name.trim()) {
      toast.error("Nama pengeluaran wajib diisi");
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
            Lengkapi data pengeluaran. Bukti bisa diunggah lalu dibaca otomatis oleh AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Kategori</Label>
            <Select value={values.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AttachmentUploader
            folder="pengeluaran"
            paths={values.attachments}
            onChange={(next) => set("attachments", next)}
            onScan={handleScan}
            scanning={scanning}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="exp-name">Nama pengeluaran</Label>
              <Input
                id="exp-name"
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Contoh: Beli pompa air"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-date">Tanggal</Label>
              <Input
                id="exp-date"
                type="date"
                value={values.expense_date}
                onChange={(e) => set("expense_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-amount">Nominal (Rp)</Label>
              <Input
                id="exp-amount"
                inputMode="numeric"
                value={values.amount}
                onChange={(e) => set("amount", e.target.value.replace(/[^\d]/g, ""))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-invoice">No. invoice / kuitansi</Label>
              <Input
                id="exp-invoice"
                value={values.invoice_no}
                onChange={(e) => set("invoice_no", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-vendor">Nama vendor</Label>
              <Input
                id="exp-vendor"
                value={values.vendor}
                onChange={(e) => set("vendor", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Peruntukan di (lokasi kost)</Label>
            <Select value={values.location} onValueChange={(v) => set("location", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih lokasi" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Tambah lokasi baru"
              />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const clean = newLocation.trim();
                  if (!clean) return;
                  try {
                    await onAddLocation(clean);
                    set("location", clean);
                    setNewLocation("");
                    toast.success("Lokasi ditambahkan");
                  } catch (error) {
                    toast.error((error as Error).message);
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {values.category === "Iuran" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="exp-dues">Nama iuran</Label>
                <Input
                  id="exp-dues"
                  value={values.dues_name}
                  onChange={(e) => set("dues_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp-dues-contact">Kontak iuran</Label>
                <Input
                  id="exp-dues-contact"
                  value={values.dues_contact}
                  onChange={(e) => set("dues_contact", e.target.value)}
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="exp-notes">Keterangan</Label>
            <Textarea
              id="exp-notes"
              rows={3}
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
