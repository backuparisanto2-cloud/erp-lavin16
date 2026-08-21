import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, FileText, History, MapPin, Phone } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ExportButtons } from "@/components/ExportButtons";
import { SignedImage } from "@/components/SignedImage";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatRupiah, formatTanggal } from "@/lib/expenses";
import { exportTenantHistoryFor, exportTenantPayments } from "@/lib/history-export";
import { photoUrl } from "@/lib/inventory";
import { dueInfo, tenantProfilesQuery, totalPaid, type TenantProfile } from "@/lib/tenants";

export const Route = createFileRoute("/tenant/$id")({
  head: () => ({
    meta: [
      { title: "Detail Tenant — Kost Lavin Purwokerto" },
      {
        name: "description",
        content:
          "Halaman detail penghuni kost Lavin: foto tenant, seluruh dokumen yang diunggah, riwayat pembayaran, dan riwayat perubahan data.",
      },
      { property: "og:title", content: "Detail Tenant — Kost Lavin Purwokerto" },
      {
        property: "og:description",
        content: "Foto tenant, dokumen unggahan, dan riwayat perubahan data penghuni.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TenantDetailPage,
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-2 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words">{value || "—"}</span>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-lg border p-4">
      <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function FileTile({ path, label }: { path: string; label: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const isPdf = path.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    let active = true;
    photoUrl(path).then((next) => {
      if (active) setUrl(next);
    });
    return () => {
      active = false;
    };
  }, [path]);

  const name = path.split("/").pop() ?? path;

  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noreferrer"
      title={name}
      className="group block w-28 space-y-1"
    >
      {isPdf ? (
        <span className="flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-md border text-xs text-muted-foreground group-hover:border-primary">
          <FileText className="h-6 w-6" /> PDF
        </span>
      ) : (
        <SignedImage
          path={path}
          alt={label}
          className="h-28 w-28 rounded-md border object-cover group-hover:border-primary"
        />
      )}
      <span className="block truncate text-[11px] text-muted-foreground">{name}</span>
    </a>
  );
}

function FileGroup({ label, paths }: { label: string; paths: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {label} <span className="text-muted-foreground">({paths.length})</span>
      </p>
      {paths.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada berkas.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {paths.map((path) => (
            <FileTile key={path} path={path} label={label} />
          ))}
        </div>
      )}
    </div>
  );
}

function MapsRow({ label, url }: { label: string; url: string | null }) {
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
          <MapPin className="h-4 w-4" /> Buka di Google Maps <ExternalLink className="h-3 w-3" />
        </a>
      }
    />
  );
}

function changeLines(entry: TenantProfile["status_history"][number]): string[] {
  const lines: string[] = [];
  if (entry.old_status !== entry.new_status) {
    lines.push(`Status: ${entry.old_status ?? "—"} → ${entry.new_status}`);
  }
  if ((entry.old_room ?? null) !== (entry.new_room ?? null)) {
    lines.push(`Kamar: ${entry.old_room ?? "—"} → ${entry.new_room ?? "—"}`);
  }
  if (lines.length === 0) lines.push(`Status tetap ${entry.new_status}`);
  return lines;
}

function TenantDetailPage() {
  const { id } = Route.useParams();
  const tenants = useQuery(tenantProfilesQuery);
  const tenant = (tenants.data ?? []).find((t) => t.id === id) ?? null;

  const paymentFiles = (tenant?.payments ?? []).flatMap((p) => p.attachments);
  const totalFiles =
    (tenant?.ktp_files.length ?? 0) +
    (tenant?.id_card_files.length ?? 0) +
    (tenant?.documents.length ?? 0) +
    paymentFiles.length +
    (tenant?.photo_path ? 1 : 0);

  if (tenants.isLoading) {
    return (
      <AppShell title="Detail tenant">
        <p className="text-sm text-muted-foreground">Memuat data tenant…</p>
      </AppShell>
    );
  }

  if (!tenant) {
    return (
      <AppShell title="Detail tenant">
        <p className="text-sm text-muted-foreground">Tenant tidak ditemukan.</p>
        <Link to="/tenant" className="mt-3 inline-flex items-center gap-2 text-sm text-primary">
          <ArrowLeft className="h-4 w-4" /> Kembali ke daftar tenant
        </Link>
      </AppShell>
    );
  }

  const due = dueInfo(tenant.due_date);

  return (
    <AppShell
      title={tenant.name}
      breadcrumbLabel={tenant.name}
      subtitle={`Kamar ${tenant.room_number ?? "—"} · ${totalFiles} berkas terunggah`}
    >
      <div className="space-y-4">
        <Link
          to="/tenant"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke daftar tenant
        </Link>

        <div className="flex flex-wrap items-start gap-4 rounded-lg border p-4">
          {tenant.photo_path ? (
            <SignedImage
              path={tenant.photo_path}
              alt={`Foto ${tenant.name}`}
              className="h-32 w-32 rounded-lg border border-gold-line object-cover"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-lg border text-xs text-muted-foreground">
              Tanpa foto
            </div>
          )}
          <div className="min-w-[220px] flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{tenant.name}</h1>
              <Badge variant={tenant.status === "Aktif" ? "default" : "secondary"}>
                {tenant.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Jatuh tempo {formatTanggal(tenant.due_date ?? "")} · {due.label}
            </p>
            <p className="text-sm text-muted-foreground">
              Total bayar {formatRupiah(totalPaid(tenant))} · {tenant.payments.length} transaksi
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {tenant.phones.length
                ? tenant.phones.map((phone, index) => (
                    <a
                      key={index}
                      href={`https://wa.me/${phone.phone.replace(/\D/g, "").replace(/^0/, "62")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent"
                    >
                      <Phone className="h-3 w-3" /> {phone.phone}
                      {phone.is_primary ? " • utama" : ""}
                    </a>
                  ))
                : tenant.contact}
            </div>
          </div>
        </div>

        <Block title="Data pribadi & kost">
          <Row label="NIK" value={tenant.nik} />
          <Row label="Kartu pelajar" value={tenant.student_card} />
          <Row label="Email" value={tenant.email} />
          <Row label="Alamat asal" value={tenant.home_address} />
          <Row label="Alamat sekarang" value={tenant.current_address} />
          <Row label="Sekolah / kerja" value={tenant.school_work_address} />
          <MapsRow label="Maps rumah" url={tenant.maps_home_url} />
          <MapsRow label="Maps sekolah" url={tenant.maps_school_url} />
          <Separator className="my-2" />
          <Row label="Kamar" value={tenant.room_number} />
          <Row label="Tanggal masuk" value={formatTanggal(tenant.check_in_date ?? "")} />
          <Row label="Periode sewa" value={tenant.rent_period} />
          <Row
            label="Peraturan kost"
            value={
              tenant.rules_agreed
                ? `Disetujui${tenant.rules_agreed_at ? ` · ${formatTanggal(tenant.rules_agreed_at.slice(0, 10))}` : ""}`
                : "Belum disetujui"
            }
          />
          <Row label="Catatan" value={tenant.notes} />
        </Block>

        <Block title="Semua dokumen terunggah">
          <div className="space-y-4">
            <FileGroup label="Foto tenant" paths={tenant.photo_path ? [tenant.photo_path] : []} />
            <FileGroup label="KTP" paths={tenant.ktp_files} />
            <FileGroup
              label="Kartu mahasiswa / pelajar / SIM"
              paths={tenant.id_card_files}
            />
            <FileGroup label="Dokumen lain" paths={tenant.documents} />
            <FileGroup label="Bukti pembayaran" paths={paymentFiles} />
          </div>
        </Block>

        <Block title="Kontak darurat & kendaraan">
          {tenant.emergency_contacts.length === 0 ? (
            <Row label="Kontak darurat" value="Belum ada" />
          ) : (
            tenant.emergency_contacts.map((contact, index) => (
              <Row
                key={index}
                label={contact.relationship || "Kontak"}
                value={`${contact.name} — ${contact.phone}${contact.notes ? ` (${contact.notes})` : ""}`}
              />
            ))
          )}
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

        <Block title={`Riwayat pembayaran · total ${formatRupiah(totalPaid(tenant))}`}>
          <ExportButtons
            label="Riwayat pembayaran"
            disabled={tenant.payments.length === 0}
            onExport={(format) =>
              exportTenantPayments(tenant.name, tenant.room_number, tenant.payments, format)
            }
          />
          {tenant.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada pembayaran tercatat.</p>
          ) : (
            <ul className="space-y-2">
              {tenant.payments.map((payment) => (
                <li key={payment.id} className="rounded-md border p-3 text-sm">
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
                  {payment.attachments.length ? (
                    <div className="mt-2 flex flex-wrap gap-3">
                      {payment.attachments.map((path) => (
                        <FileTile key={path} path={path} label="Bukti pembayaran" />
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Block title="Riwayat perubahan data">
          <ExportButtons
            label="Riwayat perubahan"
            disabled={tenant.status_history.length === 0}
            onExport={(format) =>
              exportTenantHistoryFor(tenant.name, tenant.status_history, format)
            }
          />
          {tenant.status_history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada perubahan tercatat.</p>
          ) : (
            <ol className="space-y-3">
              {tenant.status_history.map((entry) => (
                <li key={entry.id} className="flex gap-3 rounded-md border p-3 text-sm">
                  <History className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.changed_at).toLocaleString("id-ID")}
                    </p>
                    {changeLines(entry).map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                    {entry.note ? (
                      <p className="mt-1 text-xs text-muted-foreground">{entry.note}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Block>
      </div>
    </AppShell>
  );
}
