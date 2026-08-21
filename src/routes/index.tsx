import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DoorClosed, Wrench, AlertTriangle, Boxes, Wallet } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { DueReminders } from "@/components/DueReminders";
import { ExpenseSummary } from "@/components/ExpenseSummary";
import { ConditionBadge } from "@/components/ConditionBadge";
import {
  allRoomItemsQuery,
  conditionsQuery,
  formatRupiah,
  roomsQuery,
  sharedItemsQuery,
} from "@/lib/inventory";
import { expensesQuery } from "@/lib/expenses";
import { incomesQuery, otherIncomesQuery } from "@/lib/income";
import {
  buildJournal,
  journalTotals,
  presetRange,
  JOURNAL_PRESETS,
  type JournalPreset,
} from "@/lib/journal";
import { tenantProfilesQuery } from "@/lib/tenants";




export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inventaris Lavin Kost Purwokerto" },
      {
        name: "description",
        content:
          "Pencatatan inventaris fasilitas utama dan fasilitas per kamar Lavin Kost Purwokerto: tambah, edit, dan kurangi barang dengan mudah.",
      },
      { property: "og:title", content: "Inventaris Lavin Kost Purwokerto" },
      {
        property: "og:description",
        content: "Kelola inventaris 32 kamar dan fasilitas bersama Lavin Kost Purwokerto.",
      },
    ],
  }),
  component: Dashboard,
});

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: typeof Boxes;
  tone?: "gold" | "danger";
}) {
  return (
    <div className="gold-card rounded-xl p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{label}</p>
        <Icon className={`h-4 w-4 ${tone === "danger" ? "text-destructive" : "text-gold"}`} />
      </div>
      <p
        className={`mt-2 font-display text-3xl font-semibold ${
          tone === "danger" ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Dashboard() {
  const rooms = useQuery(roomsQuery);
  const items = useQuery(allRoomItemsQuery);
  const shared = useQuery(sharedItemsQuery);
  const conditions = useQuery(conditionsQuery);
  const incomes = useQuery(incomesQuery);
  const otherIncomes = useQuery(otherIncomesQuery);
  const expenses = useQuery(expensesQuery);
  const tenants = useQuery(tenantProfilesQuery);

  const [preset, setPreset] = useState<JournalPreset>("bulan-ini");
  const initial = presetRange("bulan-ini");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  const jurnalEntries = useMemo(() => {
    const all = buildJournal(incomes.data ?? [], otherIncomes.data ?? [], expenses.data ?? []);
    return all.filter((entry) => {
      if (from && entry.date < from) return false;
      if (to && entry.date > to) return false;
      return true;
    });
  }, [incomes.data, otherIncomes.data, expenses.data, from, to]);

  const jurnal = journalTotals(jurnalEntries);



  const roomItems = items.data ?? [];
  const sharedItems = shared.data ?? [];
  const semua = [...roomItems, ...sharedItems];
  const totalUnit =
    roomItems.reduce((a, i) => a + i.quantity, 0) + sharedItems.reduce((a, i) => a + i.quantity, 0);
  const perluPerhatian = semua.filter((i) => i.condition !== "Baik");
  const totalNilai = semua.reduce((a, i) => a + (i.purchase_price ?? 0), 0);

  const perKondisi = new Map<string, number>();
  for (const item of semua) {
    perKondisi.set(item.condition, (perKondisi.get(item.condition) ?? 0) + 1);
  }
  const daftarKondisi = [
    ...(conditions.data ?? []),
    ...[...perKondisi.keys()].filter((c) => !(conditions.data ?? []).includes(c)),
  ];

  const maksKondisi = Math.max(1, ...[...perKondisi.values()]);

  const rusakPerKamar = new Map<string, number>();
  for (const item of roomItems) {
    if (item.condition !== "Baik") {
      rusakPerKamar.set(item.room_id, (rusakPerKamar.get(item.room_id) ?? 0) + 1);
    }
  }
  const kamarBermasalah = (rooms.data ?? [])
    .filter((r) => rusakPerKamar.has(r.id))
    .slice(0, 8);

  const occupiedRoomIds = new Set(
    (tenants.data ?? [])
      .filter((t) => t.status === "Aktif" && t.room_id)
      .map((t) => t.room_id as string),
  );
  const occupiedRoomNumbers = new Set(
    (tenants.data ?? [])
      .filter((t) => t.status === "Aktif" && t.room_number)
      .map((t) => t.room_number as string),
  );
  const isOccupied = (room: { id: string; number: string }) =>
    occupiedRoomIds.has(room.id) || occupiedRoomNumbers.has(room.number);
  const floors = [...new Set((rooms.data ?? []).map((r) => r.floor))].sort((a, b) => a - b);
  const kosongPerLantai = floors.map((floor) => {
    const list = (rooms.data ?? []).filter((r) => r.floor === floor);
    return { floor, total: list.length, kosong: list.filter((r) => !isOccupied(r)).length };
  });
  const totalKosong = kosongPerLantai.reduce((a, f) => a + f.kosong, 0);

  return (
    <AppShell
      title="Ringkasan Inventaris"
      subtitle="Catatan fasilitas utama dan fasilitas per kamar Lavin Kost Purwokerto."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total Kamar" value={rooms.data?.length ?? "—"} icon={DoorClosed} />
        <Stat label="Fasilitas Utama" value={sharedItems.length || "—"} icon={Wrench} />
        <Stat label="Total Unit Barang" value={totalUnit || "—"} icon={Boxes} />
        <Stat
          label="Perlu Perhatian"
          value={perluPerhatian.length}
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      <DueReminders className="mt-4" />


      <div className="gold-card mt-4 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Kondisi Barang</h2>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4 text-gold" />
            Nilai pembelian tercatat: {formatRupiah(totalNilai) ?? "—"}
          </span>
        </div>
        {semua.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Belum ada barang tercatat.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {daftarKondisi.map((name) => {
              const jumlah = perKondisi.get(name) ?? 0;
              return (
                <li key={name} className="flex items-center gap-3">
                  <div className="w-32 shrink-0 sm:w-40">
                    <ConditionBadge condition={name} />
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent">
                    <div
                      className={`h-full rounded-full ${
                        name === "Baik"
                          ? "bg-success"
                          : name === "Rusak"
                            ? "bg-destructive"
                            : "bg-warning"
                      }`}
                      style={{ width: `${(jumlah / maksKondisi) * 100}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-sm tabular-nums">
                    {jumlah} <span className="text-muted-foreground">item</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="gold-card mt-4 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Kamar Belum Terisi</h2>
          <span className="text-sm text-muted-foreground">
            Total {totalKosong} kamar kosong dari {(rooms.data ?? []).length} kamar
          </span>
        </div>
        {kosongPerLantai.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Belum ada data kamar.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {kosongPerLantai.map((f) => (
              <Link
                key={f.floor}
                to="/kamar"
                search={{ lantai: f.floor }}
                className="rounded-lg border border-gold-line px-4 py-3 transition-colors hover:bg-accent"
              >
                <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                  Lantai {f.floor}
                </p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  {f.kosong}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    / {f.total} kamar
                  </span>
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ExpenseSummary />

      <div className="gold-card mt-6 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">Jurnal Umum</h2>
          <Link to="/jurnal" className="text-sm text-gold hover:underline">
            Lihat jurnal lengkap
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          {JOURNAL_PRESETS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setPreset(item.key);
                if (item.key !== "kustom") {
                  const next = presetRange(item.key);
                  setFrom(next.from);
                  setTo(next.to);
                }
              }}
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                preset === item.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {item.label}
            </button>
          ))}
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Dari
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setPreset("kustom");
                setFrom(e.target.value);
              }}
              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Sampai
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setPreset("kustom");
                setTo(e.target.value);
              }}
              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
            />
          </label>
          <span className="text-xs text-muted-foreground">{jurnalEntries.length} transaksi</span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-gold-line px-4 py-3">
            <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              Pendapatan
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-success">
              {formatRupiah(jurnal.pendapatan)}
            </p>
          </div>
          <div className="rounded-lg border border-gold-line px-4 py-3">
            <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              Pengeluaran
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-destructive">
              {formatRupiah(jurnal.pengeluaran)}
            </p>
          </div>
          <div className="rounded-lg border border-gold-line px-4 py-3">
            <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Saldo</p>
            <p
              className={`mt-1 font-display text-xl font-semibold ${
                jurnal.saldo < 0 ? "text-destructive" : "text-foreground"
              }`}
            >
              {formatRupiah(jurnal.saldo)}
            </p>
          </div>
        </div>
      </div>


      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="gold-card rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold">Akses Cepat</h2>
          <div className="mt-4 space-y-2">
            {[1, 2, 3].map((floor) => (
              <Link
                key={floor}
                to="/kamar"
                search={{ lantai: floor }}
                className="flex items-center justify-between rounded-lg border border-gold-line px-4 py-3 text-sm transition-colors hover:bg-accent"
              >
                <span>Lantai {floor}</span>
                <span className="text-muted-foreground">
                  {(rooms.data ?? []).filter((r) => r.floor === floor).length} kamar
                </span>
              </Link>
            ))}
            <Link
              to="/fasilitas"
              search={{ q: undefined }}

              className="flex items-center justify-between rounded-lg border border-gold-line px-4 py-3 text-sm transition-colors hover:bg-accent"
            >
              <span>Fasilitas Utama Kost</span>
              <span className="text-muted-foreground">{sharedItems.length} item</span>
            </Link>
          </div>
        </div>

        <div className="gold-card rounded-xl p-5">
          <h2 className="font-display text-xl font-semibold">Kamar Perlu Perhatian</h2>
          {kamarBermasalah.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Semua barang kamar tercatat dalam kondisi baik.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {kamarBermasalah.map((room) => (
                <li key={room.id}>
                  <Link
                    to="/kamar/$nomor"
                    params={{ nomor: room.number }}
                    className="flex items-center justify-between rounded-lg border border-gold-line px-4 py-3 text-sm transition-colors hover:bg-accent"
                  >
                    <span>
                      Kamar {room.number}{" "}
                      <span className="text-muted-foreground">· Lantai {room.floor}</span>
                    </span>
                    <span className="text-destructive">{rusakPerKamar.get(room.id)} item</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
