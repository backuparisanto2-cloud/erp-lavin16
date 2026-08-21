import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlarmClock, MessageCircle, ReceiptText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupiah, formatTanggal } from "@/lib/expenses";
import { tenantProfilesQuery, type TenantProfile } from "@/lib/tenants";

const STORAGE_KEY = "lavin.reminder-days";
const OPTIONS = [3, 7, 14, 30] as const;

function daysUntil(date: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${date}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function whatsappHref(tenant: TenantProfile): string | null {
  const raw = tenant.phones.find((p) => p.is_primary)?.phone ?? tenant.phones[0]?.phone ?? tenant.contact;
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const normalized = digits.startsWith("62")
    ? digits
    : digits.startsWith("0")
      ? `62${digits.slice(1)}`
      : digits;
  const text = encodeURIComponent(
    `Halo ${tenant.name}, mengingatkan pembayaran kamar ${
      tenant.room_number ?? ""
    } dengan jatuh tempo ${formatTanggal(tenant.due_date ?? "")}. Mohon kirim bukti pembayaran ya. Terima kasih.`,
  );
  return `https://wa.me/${normalized}?text=${text}`;
}

type Reminder = {
  tenant: TenantProfile;
  days: number;
  tone: "late" | "today" | "soon";
  unverifiedProofs: number;
};

export function DueReminders({
  onRecordPayment,
  className,
}: {
  onRecordPayment?: (tenant: TenantProfile) => void;
  className?: string;
}) {
  const tenants = useQuery(tenantProfilesQuery);
  const [threshold, setThreshold] = useState<number>(7);

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(STORAGE_KEY));
    if (OPTIONS.includes(saved as (typeof OPTIONS)[number])) setThreshold(saved);
  }, []);

  const setDays = (value: number) => {
    setThreshold(value);
    window.localStorage.setItem(STORAGE_KEY, String(value));
  };

  const reminders = useMemo<Reminder[]>(() => {
    const list = tenants.data ?? [];
    return list
      .filter((t) => t.status === "Aktif" && t.due_date)
      .map((tenant) => {
        const days = daysUntil(tenant.due_date!);
        const tone: Reminder["tone"] = days < 0 ? "late" : days === 0 ? "today" : "soon";
        return {
          tenant,
          days,
          tone,
          unverifiedProofs: tenant.payments.filter((p) => p.attachments.length === 0).length,
        };
      })
      .filter((item) => item.days <= threshold)
      .sort((a, b) => a.days - b.days);
  }, [tenants.data, threshold]);

  const lateCount = reminders.filter((r) => r.tone === "late").length;

  return (
    <section className={`rounded-lg border p-4 ${className ?? ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlarmClock className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div>
            <h2 className="font-display text-base font-semibold">Pengingat Tagihan</h2>
            <p className="text-xs text-muted-foreground">
              {reminders.length} tenant perlu ditagih atau diperiksa
              {lateCount ? ` · ${lateCount} sudah terlambat` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs text-muted-foreground">Ingatkan</span>
          {OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDays(value)}
              aria-pressed={value === threshold}
              className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                value === threshold
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {value}h
            </button>
          ))}
        </div>
      </div>

      {tenants.isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Memuat data tenant…</p>
      ) : null}

      {!tenants.isLoading && reminders.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Tidak ada tagihan yang jatuh tempo dalam {threshold} hari ke depan.
        </p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {reminders.map(({ tenant, days, tone, unverifiedProofs }) => {
          const wa = whatsappHref(tenant);
          return (
            <li key={tenant.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {tenant.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      · Kamar {tenant.room_number ?? "—"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Jatuh tempo {formatTanggal(tenant.due_date ?? "")} ·{" "}
                    {tone === "late"
                      ? `terlambat ${Math.abs(days)} hari`
                      : tone === "today"
                        ? "hari ini"
                        : `${days} hari lagi`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total bayar{" "}
                    {formatRupiah(tenant.payments.reduce((s, p) => s + (p.amount || 0), 0))} ·{" "}
                    {tenant.payments.length} transaksi
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={tone === "late" ? "destructive" : "secondary"}>
                    {tone === "late" ? "Tagih sekarang" : tone === "today" ? "Hari ini" : "Segera"}
                  </Badge>
                  {unverifiedProofs ? (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400">
                      {unverifiedProofs} pembayaran tanpa bukti
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  to="/tenant/$id"
                  params={{ id: tenant.id }}
                  className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-accent"
                >
                  Periksa bukti
                </Link>
                {onRecordPayment ? (
                  <Button size="sm" variant="outline" onClick={() => onRecordPayment(tenant)}>
                    <ReceiptText className="mr-1 h-3.5 w-3.5" /> Catat bayar
                  </Button>
                ) : null}
                {wa ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-accent"
                  >
                    <MessageCircle className="mr-1 h-3.5 w-3.5" /> Tagih via WhatsApp
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
