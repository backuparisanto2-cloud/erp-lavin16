import { ExternalLink, FileText, MapPin, Phone, Plus, Trash2 } from "lucide-react";

import { SignedImage } from "@/components/SignedImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatRupiah, formatTanggal } from "@/lib/expenses";
import { dueInfo, totalPaid, type TenantProfile } from "@/lib/tenants";
import { IfCanDelete } from "@/components/IfCanDelete";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words">{value || "—"}</span>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
      <Separator />
    </section>
  );
}

function MapsLink({ label, url }: { label: string; url: string | null }) {
  if (!url) return <Row label={label} value="—" />;
  return (
    <Row
      label={label}
      value={
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
        >
          <MapPin className="h-4 w-4" /> Buka di Google Maps
          <ExternalLink className="h-3 w-3" />
        </a>
      }
    />
  );
}

function FileGroup({ label, paths }: { label: string; paths: string[] }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      {paths.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada berkas.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {paths.map((path) =>
            path.toLowerCase().endsWith(".pdf") ? (
              <span
                key={path}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
              >
                <FileText className="h-3 w-3" /> PDF
              </span>
            ) : (
              <SignedImage
                key={path}
                path={path}
                alt={label}
                className="h-20 w-20 rounded object-cover"
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

export function TenantDetailDialog({
  tenant,
  onOpenChange,
  onAddPayment,
  onDeletePayment,
}: {
  tenant: TenantProfile | null;
  onOpenChange: (open: boolean) => void;
  onAddPayment: (tenant: TenantProfile) => void;
  onDeletePayment: (paymentId: string) => void;
}) {
  if (!tenant) return null;
  const due = dueInfo(tenant.due_date);

  return (
    <Dialog open={Boolean(tenant)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {tenant.name}
            <Badge variant={tenant.status === "Aktif" ? "default" : "secondary"}>
              {tenant.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Kamar {tenant.room_number ?? "—"} · Jatuh tempo {formatTanggal(tenant.due_date ?? "")} (
            {due.label})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {tenant.photo_path ? (
            <SignedImage
              path={tenant.photo_path}
              alt={`Foto ${tenant.name}`}
              className="h-24 w-24 rounded-lg border border-gold-line object-cover"
            />
          ) : null}
          <Block title="A. Data Pribadi">
            <Row label="NIK" value={tenant.nik} />
            <Row label="Kartu pelajar" value={tenant.student_card} />
            <Row label="Email" value={tenant.email} />
            <Row label="Alamat asal" value={tenant.home_address} />
            <Row label="Alamat sekarang" value={tenant.current_address} />
            <Row label="Sekolah / kerja" value={tenant.school_work_address} />
            <Row
              label="Telepon"
              value={
                tenant.phones.length ? (
                  <span className="flex flex-wrap gap-2">
                    {tenant.phones.map((phone, index) => (
                      <a
                        key={index}
                        href={`https://wa.me/${phone.phone.replace(/\D/g, "").replace(/^0/, "62")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent"
                      >
                        <Phone className="h-3 w-3" />
                        {phone.phone}
                        {phone.is_primary ? " • utama" : ""}
                      </a>
                    ))}
                  </span>
                ) : (
                  tenant.contact
                )
              }
            />
          </Block>

          <Block title="B. Kontak Darurat">
            {tenant.emergency_contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada kontak darurat.</p>
            ) : (
              tenant.emergency_contacts.map((contact, index) => (
                <Row
                  key={index}
                  label={contact.relationship || "Kontak"}
                  value={`${contact.name} — ${contact.phone}${contact.notes ? ` (${contact.notes})` : ""}`}
                />
              ))
            )}
          </Block>

          <Block title="C. Kepatuhan & D. Kendaraan">
            <Row
              label="Peraturan kost"
              value={
                tenant.rules_agreed
                  ? `Disetujui${tenant.rules_agreed_at ? ` · ${formatTanggal(tenant.rules_agreed_at.slice(0, 10))}` : ""}`
                  : "Belum disetujui"
              }
            />
            {tenant.vehicles.length === 0 ? (
              <Row label="Kendaraan" value="Tidak ada" />
            ) : (
              tenant.vehicles.map((vehicle, index) => (
                <Row
                  key={index}
                  label={vehicle.vehicle_type}
                  value={`${vehicle.brand_model ?? "—"} · ${vehicle.plate_number ?? "—"}`}
                />
              ))
            )}
          </Block>

          <Block title="F. Lokasi">
            <MapsLink label="Rumah asal" url={tenant.maps_home_url} />
            <MapsLink label="Sekolah / kerja" url={tenant.maps_school_url} />
          </Block>

          <Block title="G. Data Kost">
            <Row label="Kamar" value={tenant.room_number} />
            <Row label="Tanggal masuk" value={formatTanggal(tenant.check_in_date ?? "")} />
            <Row label="Periode sewa" value={tenant.rent_period} />
            <Row label="Jatuh tempo" value={formatTanggal(tenant.due_date ?? "")} />
            <Row label="Catatan" value={tenant.notes} />
          </Block>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                E. Riwayat Pembayaran · total {formatRupiah(totalPaid(tenant))}
              </h3>
              <Button size="sm" onClick={() => onAddPayment(tenant)}>
                <Plus className="mr-1 h-4 w-4" /> Bayar
              </Button>
            </div>
            {tenant.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada pembayaran tercatat.</p>
            ) : (
              <ul className="space-y-2">
                {tenant.payments.map((payment) => (
                  <li key={payment.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{formatRupiah(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTanggal(payment.payment_date)} · {payment.payment_method} ·{" "}
                          {payment.period_type}
                          {payment.period_start
                            ? ` (${formatTanggal(payment.period_start)} – ${formatTanggal(payment.period_end ?? "")})`
                            : ""}
                        </p>
                        {payment.notes ? (
                          <p className="mt-1 text-xs text-muted-foreground">{payment.notes}</p>
                        ) : null}
                      </div>
                      <IfCanDelete>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Hapus pembayaran"
                          onClick={() => onDeletePayment(payment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </IfCanDelete>
                    </div>
                    {payment.attachments.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {payment.attachments.map((path) => (
                          <SignedImage
                            key={path}
                            path={path}
                            alt="Bukti pembayaran"
                            className="h-16 w-16 rounded object-cover"
                          />
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <Separator />
          </section>

          <Block title="Dokumen">
            <FileGroup label="KTP" paths={tenant.ktp_files} />
            <FileGroup label="Kartu Mahasiswa / Pelajar / SIM" paths={tenant.id_card_files} />
            <FileGroup label="Dokumen lain" paths={tenant.documents} />
          </Block>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Riwayat Status
            </h3>
            {tenant.status_history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada perubahan status.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {tenant.status_history.map((log) => (
                  <li key={log.id} className="text-muted-foreground">
                    {formatTanggal(log.changed_at.slice(0, 10))} ·{" "}
                    {log.old_status ? `${log.old_status} → ` : "Dibuat sebagai "}
                    <span className="text-foreground">{log.new_status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
