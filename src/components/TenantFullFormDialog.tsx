import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ProofUploader } from "@/components/ProofUploader";
import { PhotoUploader } from "@/components/PhotoUploader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Room } from "@/lib/inventory";
import {
  RENT_PERIODS,
  TENANT_STATUSES,
  addMonths,
  monthsOfPeriod,
  type EmergencyContact,
  type TenantPhone,
  type TenantProfile,
  type TenantProfilePayload,
  type TenantVehicle,
} from "@/lib/tenants";

const VEHICLE_TYPES = ["Motor", "Mobil", "Sepeda", "Tidak ada"] as const;

export type TenantFormState = {
  name: string;
  nik: string;
  student_card: string;
  home_address: string;
  current_address: string;
  email: string;
  school_work_address: string;
  maps_home_url: string;
  maps_school_url: string;
  documents: string[];
  ktp_files: string[];
  id_card_files: string[];
  photo_path: string;
  rules_agreed: boolean;
  room_id: string;
  check_in_date: string;
  rent_period: string;
  due_date: string;
  status: string;
  notes: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export const tenantFormInitial: TenantFormState = {
  name: "",
  nik: "",
  student_card: "",
  home_address: "",
  current_address: "",
  email: "",
  school_work_address: "",
  maps_home_url: "",
  maps_school_url: "",
  documents: [],
  ktp_files: [],
  id_card_files: [],
  photo_path: "",
  rules_agreed: false,
  room_id: "",
  check_in_date: today(),
  rent_period: "1 Bulan",
  due_date: addMonths(today(), 1),
  status: "Aktif",
  notes: "",
};

export function toFormState(tenant: TenantProfile): TenantFormState {
  return {
    name: tenant.name,
    nik: tenant.nik ?? "",
    student_card: tenant.student_card ?? "",
    home_address: tenant.home_address ?? "",
    current_address: tenant.current_address ?? "",
    email: tenant.email ?? "",
    school_work_address: tenant.school_work_address ?? "",
    maps_home_url: tenant.maps_home_url ?? "",
    maps_school_url: tenant.maps_school_url ?? "",
    documents: tenant.documents,
    ktp_files: tenant.ktp_files,
    id_card_files: tenant.id_card_files,
    photo_path: tenant.photo_path ?? "",
    rules_agreed: tenant.rules_agreed,
    room_id: tenant.room_id ?? "",
    check_in_date: tenant.check_in_date ?? today(),
    rent_period: tenant.rent_period ?? "1 Bulan",
    due_date: tenant.due_date ?? "",
    status: tenant.status,
    notes: tenant.notes ?? "",
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function TenantFullFormDialog({
  open,
  onOpenChange,
  tenant,
  rooms,
  occupiedRoomIds,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: TenantProfile | null;
  rooms: Room[];
  occupiedRoomIds: Record<string, string>;
  saving: boolean;
  onSave: (
    payload: TenantProfilePayload,
    phones: TenantPhone[],
    contacts: EmergencyContact[],
    vehicles: TenantVehicle[],
  ) => void;
}) {
  const [form, setForm] = useState<TenantFormState>(tenantFormInitial);
  const [phones, setPhones] = useState<TenantPhone[]>([
    { phone: "", label: "Pribadi", is_primary: true },
  ]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { name: "", relationship: "", phone: "", notes: "" },
  ]);
  const [vehicles, setVehicles] = useState<TenantVehicle[]>([]);

  useEffect(() => {
    if (!open) return;
    if (tenant) {
      setForm(toFormState(tenant));
      setPhones(
        tenant.phones.length
          ? tenant.phones
          : [{ phone: tenant.contact ?? "", label: "Pribadi", is_primary: true }],
      );
      setContacts(
        tenant.emergency_contacts.length
          ? tenant.emergency_contacts
          : [{ name: "", relationship: "", phone: "", notes: "" }],
      );
      setVehicles(tenant.vehicles);
    } else {
      setForm({ ...tenantFormInitial, check_in_date: today(), due_date: addMonths(today(), 1) });
      setPhones([{ phone: "", label: "Pribadi", is_primary: true }]);
      setContacts([{ name: "", relationship: "", phone: "", notes: "" }]);
      setVehicles([]);
    }
  }, [open, tenant]);

  function set<K extends keyof TenantFormState>(key: K, value: TenantFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleIdUpload(key: "ktp_files" | "id_card_files", next: string[]) {
    setForm((prev) => {
      const added = next.filter((path) => !prev[key].includes(path));
      const firstImage = added.find((path) => /\.(jpe?g|png|webp|heic|heif)$/i.test(path));
      return {
        ...prev,
        [key]: next,
        photo_path: prev.photo_path || firstImage || "",
      };
    });
  }

  function syncDue(checkIn: string, period: string) {
    setForm((prev) => ({
      ...prev,
      check_in_date: checkIn,
      rent_period: period,
      due_date: checkIn ? addMonths(checkIn, monthsOfPeriod(period)) : prev.due_date,
    }));
  }

  function submit() {
    if (!form.name.trim()) {
      toast.error("Nama lengkap wajib diisi.");
      return;
    }
    if (form.nik && !/^\d{16}$/.test(form.nik.trim())) {
      toast.error("NIK harus 16 digit angka.");
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Format email tidak valid.");
      return;
    }
    if (!phones.some((p) => p.phone.trim())) {
      toast.error("Minimal satu nomor telepon.");
      return;
    }
    if (!form.rules_agreed) {
      toast.error("Centang kesanggupan mengikuti peraturan kost.");
      return;
    }
    const primary = phones.find((p) => p.is_primary && p.phone.trim()) ?? phones[0];
    const room = rooms.find((r) => r.id === form.room_id);
    onSave(
      {
        name: form.name.trim(),
        nik: form.nik.trim() || null,
        student_card: form.student_card.trim() || null,
        home_address: form.home_address.trim() || null,
        current_address: form.current_address.trim() || null,
        email: form.email.trim() || null,
        school_work_address: form.school_work_address.trim() || null,
        maps_home_url: form.maps_home_url.trim() || null,
        maps_school_url: form.maps_school_url.trim() || null,
        documents: form.documents,
        ktp_files: form.ktp_files,
        id_card_files: form.id_card_files,
        photo_path: form.photo_path || null,
        rules_agreed: form.rules_agreed,
        room_id: form.room_id || null,
        room_number: room?.number ?? null,
        check_in_date: form.check_in_date || null,
        rent_period: form.rent_period || null,
        due_date: form.due_date || null,
        status: form.status,
        contact: primary?.phone.trim() || null,
        notes: form.notes.trim() || null,
      },
      phones,
      contacts,
      vehicles,
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tenant ? "Ubah Data Tenant" : "Form Data Penghuni / Tenant"}</DialogTitle>
          <DialogDescription>
            Data Penghuni → Kontak Darurat → Data Kost → Pembayaran → Dokumen → Status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Section title="A. Data Pribadi">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nama lengkap" htmlFor="t-name">
                <Input
                  id="t-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Nama sesuai identitas"
                />
              </Field>
              <Field label="NIK (16 digit)" htmlFor="t-nik">
                <Input
                  id="t-nik"
                  inputMode="numeric"
                  maxLength={16}
                  value={form.nik}
                  onChange={(e) => set("nik", e.target.value.replace(/\D/g, ""))}
                />
              </Field>
              <Field label="No. kartu pelajar / mahasiswa" htmlFor="t-card">
                <Input
                  id="t-card"
                  value={form.student_card}
                  onChange={(e) => set("student_card", e.target.value)}
                />
              </Field>
              <Field label="Email" htmlFor="t-email">
                <Input
                  id="t-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </Field>
              <Field label="Alamat rumah asal" htmlFor="t-home">
                <Textarea
                  id="t-home"
                  rows={2}
                  value={form.home_address}
                  onChange={(e) => set("home_address", e.target.value)}
                />
              </Field>
              <Field label="Alamat tinggal saat ini" htmlFor="t-current">
                <Textarea
                  id="t-current"
                  rows={2}
                  value={form.current_address}
                  onChange={(e) => set("current_address", e.target.value)}
                />
              </Field>
              <Field label="Alamat sekolah / tempat kerja" htmlFor="t-work">
                <Textarea
                  id="t-work"
                  rows={2}
                  value={form.school_work_address}
                  onChange={(e) => set("school_work_address", e.target.value)}
                />
              </Field>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Nomor telepon</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPhones((prev) => [...prev, { phone: "", label: "", is_primary: false }])
                  }
                >
                  <Plus className="mr-1 h-4 w-4" /> Tambah
                </Button>
              </div>
              {phones.map((phone, index) => (
                <div key={index} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center">
                  <Input
                    value={phone.phone}
                    placeholder="08xxxxxxxxxx"
                    inputMode="tel"
                    onChange={(e) =>
                      setPhones((prev) =>
                        prev.map((p, i) => (i === index ? { ...p, phone: e.target.value } : p)),
                      )
                    }
                  />
                  <Input
                    value={phone.label ?? ""}
                    placeholder="Label (Pribadi / WA)"
                    onChange={(e) =>
                      setPhones((prev) =>
                        prev.map((p, i) => (i === index ? { ...p, label: e.target.value } : p)),
                      )
                    }
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox
                      checked={phone.is_primary}
                      onCheckedChange={() =>
                        setPhones((prev) => prev.map((p, i) => ({ ...p, is_primary: i === index })))
                      }
                    />
                    Utama
                  </label>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Hapus nomor"
                    onClick={() => setPhones((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Section>

          <Section title="B. Kontak Darurat">
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setContacts((prev) => [
                    ...prev,
                    { name: "", relationship: "", phone: "", notes: "" },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Tambah kontak
              </Button>
            </div>
            {contacts.map((contact, index) => (
              <div key={index} className="grid gap-2 rounded-md border border-dashed p-3 sm:grid-cols-4">
                <Input
                  value={contact.name}
                  placeholder="Nama"
                  onChange={(e) =>
                    setContacts((prev) =>
                      prev.map((c, i) => (i === index ? { ...c, name: e.target.value } : c)),
                    )
                  }
                />
                <Input
                  value={contact.relationship ?? ""}
                  placeholder="Hubungan (Ayah/Ibu/Wali)"
                  onChange={(e) =>
                    setContacts((prev) =>
                      prev.map((c, i) => (i === index ? { ...c, relationship: e.target.value } : c)),
                    )
                  }
                />
                <Input
                  value={contact.phone}
                  placeholder="No. telepon"
                  inputMode="tel"
                  onChange={(e) =>
                    setContacts((prev) =>
                      prev.map((c, i) => (i === index ? { ...c, phone: e.target.value } : c)),
                    )
                  }
                />
                <div className="flex gap-2">
                  <Input
                    value={contact.notes ?? ""}
                    placeholder="Catatan"
                    onChange={(e) =>
                      setContacts((prev) =>
                        prev.map((c, i) => (i === index ? { ...c, notes: e.target.value } : c)),
                      )
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Hapus kontak"
                    onClick={() => setContacts((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </Section>

          <Section title="C. Data Kepatuhan">
            <label className="flex items-start gap-3 rounded-md bg-muted/50 p-3 text-sm">
              <Checkbox
                checked={form.rules_agreed}
                onCheckedChange={(checked) => set("rules_agreed", checked === true)}
              />
              <span>
                Penghuni menyatakan sanggup mengikuti seluruh peraturan Kost Lavin selama masa
                tinggal.
              </span>
            </label>
          </Section>

          <Section title="D. Data Kendaraan">
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setVehicles((prev) => [
                    ...prev,
                    { vehicle_type: "Motor", brand_model: "", plate_number: "" },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Tambah kendaraan
              </Button>
            </div>
            {vehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada kendaraan terdaftar.</p>
            ) : null}
            {vehicles.map((vehicle, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[160px_1fr_1fr_auto]">
                <Select
                  value={vehicle.vehicle_type}
                  onValueChange={(value) =>
                    setVehicles((prev) =>
                      prev.map((v, i) => (i === index ? { ...v, vehicle_type: value } : v)),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={vehicle.brand_model ?? ""}
                  placeholder="Merk / tipe"
                  onChange={(e) =>
                    setVehicles((prev) =>
                      prev.map((v, i) => (i === index ? { ...v, brand_model: e.target.value } : v)),
                    )
                  }
                />
                <Input
                  value={vehicle.plate_number ?? ""}
                  placeholder="Nomor polisi"
                  onChange={(e) =>
                    setVehicles((prev) =>
                      prev.map((v, i) =>
                        i === index ? { ...v, plate_number: e.target.value.toUpperCase() } : v,
                      ),
                    )
                  }
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Hapus kendaraan"
                  onClick={() => setVehicles((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </Section>

          <Section title="F. Lokasi (Google Maps)">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Link Maps rumah asal" htmlFor="t-maps-home">
                <Input
                  id="t-maps-home"
                  value={form.maps_home_url}
                  placeholder="https://maps.app.goo.gl/..."
                  onChange={(e) => set("maps_home_url", e.target.value)}
                />
              </Field>
              <Field label="Link Maps sekolah / tempat kerja" htmlFor="t-maps-work">
                <Input
                  id="t-maps-work"
                  value={form.maps_school_url}
                  placeholder="https://maps.app.goo.gl/..."
                  onChange={(e) => set("maps_school_url", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section title="G. Data Kost">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Kamar">
                <Select value={form.room_id} onValueChange={(value) => set("room_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kamar" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => {
                      const occupant = occupiedRoomIds[room.id];
                      const busy = Boolean(occupant) && occupant !== tenant?.id;
                      return (
                        <SelectItem key={room.id} value={room.id}>
                          Kamar {room.number}
                          {busy ? " — terisi" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status tenant">
                <Select value={form.status} onValueChange={(value) => set("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TENANT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tanggal masuk" htmlFor="t-checkin">
                <Input
                  id="t-checkin"
                  type="date"
                  value={form.check_in_date}
                  onChange={(e) => syncDue(e.target.value, form.rent_period)}
                />
              </Field>
              <Field label="Periode sewa">
                <Select
                  value={form.rent_period}
                  onValueChange={(value) => syncDue(form.check_in_date, value)}
                >
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
              </Field>
              <Field label="Jatuh tempo berikutnya" htmlFor="t-due">
                <Input
                  id="t-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => set("due_date", e.target.value)}
                />
              </Field>
              <Field label="Catatan" htmlFor="t-notes">
                <Textarea
                  id="t-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <Section title="Dokumen">
            <div className="grid gap-5">
              <ProofUploader
                folder="tenants/ktp"
                paths={form.ktp_files}
                onChange={(next) => handleIdUpload("ktp_files", next)}
                label="KTP"
                hint="Foto atau scan KTP. JPG, PNG, WEBP, HEIC, atau PDF."
              />
              <ProofUploader
                folder="tenants/kartu-identitas"
                paths={form.id_card_files}
                onChange={(next) => handleIdUpload("id_card_files", next)}
                label="Kartu Mahasiswa / Pelajar / SIM"
                hint="Salah satu kartu identitas pendukung. JPG, PNG, WEBP, HEIC, atau PDF."
              />
              <PhotoUploader
                folder="tenants/foto"
                label="Foto Tenant"
                hint="Terisi otomatis dari gambar KTP atau kartu identitas yang diunggah, bisa diganti manual."
                paths={form.photo_path ? [form.photo_path] : []}
                onChange={(next) => set("photo_path", next[0] ?? "")}
                deleteOnRemove={false}
              />
              <ProofUploader
                folder="tenants"
                paths={form.documents}
                onChange={(next) => set("documents", next)}
                label="Dokumen lain"
                hint="Surat perjanjian, kontrak, atau dokumen pendukung lainnya."
              />
            </div>
          </Section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
