import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoUploader } from "@/components/PhotoUploader";
import { addCondition, conditionsQuery, SHARED_CATEGORIES } from "@/lib/inventory";
import { codePrefix, previewItemCode } from "@/lib/item-code";

export type ItemFormValues = {
  name: string;
  code?: string | null;
  brand: string;
  serial_number: string;
  quantity: number;
  condition: string;
  notes: string;
  category?: string;
  location?: string;
  vendor: string;
  purchase_price: string;
  purchase_date: string;
  warranty_until: string;
  photos: string[];
  receipts: string[];
};

function initialValues(initial?: Partial<ItemFormValues>): ItemFormValues {
  return {
    name: initial?.name ?? "",
    code: initial?.code ?? null,
    brand: initial?.brand ?? "",
    serial_number: initial?.serial_number ?? "",
    quantity: initial?.quantity ?? 1,
    condition: initial?.condition ?? "Baik",
    notes: initial?.notes ?? "",
    category: initial?.category ?? "Umum",
    location: initial?.location ?? "",
    vendor: initial?.vendor ?? "",
    purchase_price: initial?.purchase_price ?? "",
    purchase_date: initial?.purchase_date ?? "",
    warranty_until: initial?.warranty_until ?? "",
    photos: initial?.photos ?? [],
    receipts: initial?.receipts ?? [],
  };
}

export function ItemFormDialog({
  trigger,
  title,
  description,
  initial,
  withCategory = false,
  folder,
  onSubmit,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  initial?: Partial<ItemFormValues>;
  withCategory?: boolean;
  folder: string;
  onSubmit: (values: ItemFormValues) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCondition, setNewCondition] = useState("");
  const [addingCondition, setAddingCondition] = useState(false);
  const [values, setValues] = useState<ItemFormValues>(() => initialValues(initial));

  const queryClient = useQueryClient();
  const conditions = useQuery(conditionsQuery);
  const conditionList = conditions.data ?? ["Baik", "Perlu Perbaikan", "Rusak"];
  const options = conditionList.includes(values.condition)
    ? conditionList
    : [...conditionList, values.condition];

  function set<K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function saveNewCondition() {
    const name = newCondition.trim();
    if (!name) return;
    await addCondition(name);
    await queryClient.invalidateQueries({ queryKey: ["conditions"] });
    set("condition", name);
    setNewCondition("");
    setAddingCondition(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setValues(initialValues(initial));
          setAddingCondition(false);
          setNewCondition("");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[92dvh] max-w-md flex-col gap-0 border-gold-line p-0 sm:max-h-[88vh]">
        <DialogHeader className="border-b border-gold-line px-5 pt-5 pb-4 text-left">
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <form
          id="item-form"
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!values.name.trim()) return;
            setSaving(true);
            try {
              await onSubmit({ ...values, name: values.name.trim() });
              setOpen(false);
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="item-name">Nama barang</Label>
            <Input
              id="item-name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Contoh: Lemari Pakaian"
              required
            />
            <p className="text-xs text-muted-foreground">
              Kode inventaris:{" "}
              <span className="font-mono text-gold">
                {(() => {
                  const prefix = codePrefix(values.name, values.purchase_date);
                  if (values.code && prefix && values.code.startsWith(`${prefix}-`)) return values.code;
                  return previewItemCode(values.name, values.purchase_date) ?? "otomatis setelah nama & tanggal beli diisi";
                })()}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-qty">Jumlah</Label>
              <Input
                id="item-qty"
                type="number"
                inputMode="numeric"
                min={0}
                value={values.quantity}
                onChange={(e) => set("quantity", Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div className="space-y-2">
              <Label>Kondisi</Label>
              <Select value={values.condition} onValueChange={(v) => set("condition", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {addingCondition ? (
            <div className="flex gap-2">
              <Input
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                placeholder="Kondisi baru, mis. Hilang"
                aria-label="Kondisi baru"
              />
              <Button type="button" size="icon" onClick={saveNewCondition} aria-label="Simpan kondisi">
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingCondition(true)}
              className="inline-flex items-center gap-1 text-xs text-gold hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah pilihan kondisi
            </button>
          )}

          {withCategory ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={values.category ?? "Umum"} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHARED_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-loc">Lokasi</Label>
                <Input
                  id="item-loc"
                  value={values.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="Contoh: Halaman depan"
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-4 rounded-lg border border-gold-line p-3">
            <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              Data pembelian
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="item-brand">Merk</Label>
                <Input
                  id="item-brand"
                  value={values.brand}
                  onChange={(e) => set("brand", e.target.value)}
                  placeholder="Contoh: Samsung"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-sn">Serial number</Label>
                <Input
                  id="item-sn"
                  value={values.serial_number}
                  onChange={(e) => set("serial_number", e.target.value)}
                  placeholder="Contoh: SN-00123"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-vendor">Vendor / toko</Label>
              <Input
                id="item-vendor"
                value={values.vendor}
                onChange={(e) => set("vendor", e.target.value)}
                placeholder="Contoh: Toko Elektronik Sejahtera"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-price">Harga pembelian (Rp)</Label>
              <Input
                id="item-price"
                type="number"
                inputMode="numeric"
                min={0}
                value={values.purchase_price}
                onChange={(e) => set("purchase_price", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="item-date">Tgl. pembelian</Label>
                <Input
                  id="item-date"
                  type="date"
                  value={values.purchase_date}
                  onChange={(e) => set("purchase_date", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-warranty">Garansi s/d</Label>
                <Input
                  id="item-warranty"
                  type="date"
                  value={values.warranty_until}
                  onChange={(e) => set("warranty_until", e.target.value)}
                />
              </div>
            </div>
          </div>

          <PhotoUploader
            label="Foto barang"
            hint="Otomatis dikompres ke WebP maks 300KB"
            folder={`${folder}/barang`}
            paths={values.photos}
            onChange={(next) => set("photos", next)}
          />

          <PhotoUploader
            label="Foto nota / invoice / kuitansi"
            hint="Bisa lebih dari satu lembar"
            folder={`${folder}/nota`}
            paths={values.receipts}
            onChange={(next) => set("receipts", next)}
          />

          <div className="space-y-2">
            <Label htmlFor="item-notes">Catatan</Label>
            <Textarea
              id="item-notes"
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Opsional"
              rows={2}
            />
          </div>
        </form>

        <DialogFooter className="border-t border-gold-line px-5 py-3">
          <Button type="submit" form="item-form" disabled={saving} className="h-11 w-full">
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
