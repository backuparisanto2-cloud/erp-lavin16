import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { TENANT_STATUSES, type Tenant, type TenantPayload } from "@/lib/income";

export type TenantFormValues = {
  name: string;
  contact: string;
  room_number: string;
  status: string;
  notes: string;
};

const empty: TenantFormValues = {
  name: "",
  contact: "",
  room_number: "",
  status: "Aktif",
  notes: "",
};

export function toTenantPayload(values: TenantFormValues): TenantPayload {
  return {
    name: values.name.trim(),
    contact: values.contact.trim() || null,
    room_number: values.room_number.trim() || null,
    status: values.status,
    notes: values.notes.trim() || null,
  };
}

export function tenantInitial(tenant: Tenant): TenantFormValues {
  return {
    name: tenant.name,
    contact: tenant.contact ?? "",
    room_number: tenant.room_number ?? "",
    status: tenant.status,
    notes: tenant.notes ?? "",
  };
}

export function TenantFormDialog({
  trigger,
  title,
  initial,
  onSubmit,
}: {
  trigger: ReactNode;
  title: string;
  initial?: Partial<TenantFormValues>;
  onSubmit: (values: TenantFormValues) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<TenantFormValues>({ ...empty, ...initial });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValues({ ...empty, ...initial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function set<K extends keyof TenantFormValues>(key: K, value: TenantFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!values.name.trim()) {
      toast.error("Nama penghuni wajib diisi");
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          <DialogDescription>
            Hanya penghuni berstatus aktif yang bisa dipilih saat mencatat pembayaran.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-name">Nama penghuni</Label>
            <Input
              id="tenant-name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Contoh: Budi Santoso"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tenant-room">Nomor kamar</Label>
              <Input
                id="tenant-room"
                value={values.room_number}
                onChange={(e) => set("room_number", e.target.value)}
                placeholder="Contoh: 12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-contact">Kontak / WhatsApp</Label>
              <Input
                id="tenant-contact"
                value={values.contact}
                onChange={(e) => set("contact", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={values.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TENANT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tenant-notes">Catatan</Label>
            <Textarea
              id="tenant-notes"
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
