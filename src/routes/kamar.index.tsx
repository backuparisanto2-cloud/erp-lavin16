import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { FileDown, Search } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { allRoomItemsQuery, roomsQuery } from "@/lib/inventory";
import { downloadSimplePdf } from "@/lib/pdf-report";


type Search = { lantai: number };


export const Route = createFileRoute("/kamar/")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const raw = Number(search["lantai"]);
    return { lantai: raw === 0 || raw === 2 || raw === 3 ? raw : 1 };
  },
  head: () => ({
    meta: [
      { title: "Daftar Kamar — Inventaris Lavin Kost" },
      {
        name: "description",
        content:
          "Daftar 32 kamar Lavin Kost Purwokerto per lantai beserta jumlah inventaris tiap kamar, lengkap dengan pencarian dan filter kondisi.",
      },
      { property: "og:title", content: "Daftar Kamar — Inventaris Lavin Kost" },
      {
        property: "og:description",
        content: "Cari kamar atau barang, filter per lantai dan kondisi, lalu catat inventarisnya.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoomsPage,
});

type Status = "semua" | "masalah" | "baik" | "kosong";

const STATUS_LABEL: Record<Status, string> = {
  semua: "Semua kondisi",
  masalah: "Perlu perhatian",
  baik: "Semua baik",
  kosong: "Belum ada barang",
};

type SortKey =
  | "nomor-asc"
  | "nomor-desc"
  | "lantai-asc"
  | "lantai-desc"
  | "unit-desc"
  | "unit-asc";

const SORT_LABEL: Record<SortKey, string> = {
  "nomor-asc": "Nomor kamar A → Z",
  "nomor-desc": "Nomor kamar Z → A",
  "lantai-asc": "Lantai terendah",
  "lantai-desc": "Lantai tertinggi",
  "unit-desc": "Unit barang terbanyak",
  "unit-asc": "Unit barang tersedikit",
};

const PAGE_SIZES = [12, 24, 48, 96];

function RoomsPage() {
  const { lantai } = Route.useSearch();
  const rooms = useQuery(roomsQuery);
  const items = useQuery(allRoomItemsQuery);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<Status>("semua");
  const [sort, setSort] = useState<SortKey>("nomor-asc");
  const [pageSize, setPageSize] = useState(24);
  const [page, setPage] = useState(1);

  const perRoom = useMemo(() => {
    const map = new Map<string, { total: number; masalah: number; jenis: number; names: string }>();
    for (const item of items.data ?? []) {
      const entry = map.get(item.room_id) ?? { total: 0, masalah: 0, jenis: 0, names: "" };
      entry.total += item.quantity;
      entry.jenis += 1;
      if (item.condition !== "Baik") entry.masalah += 1;
      entry.names += ` ${item.name.toLowerCase()}`;
      map.set(item.room_id, entry);
    }
    return map;
  }, [items.data]);

  const q = keyword.trim().toLowerCase();
  const list = useMemo(() => {
    const collator = new Intl.Collator("id", { numeric: true, sensitivity: "base" });
    const filteredRooms = (rooms.data ?? []).filter((room) => {
      if (lantai !== 0 && room.floor !== lantai) return false;
      const stat = perRoom.get(room.id);
      if (status === "masalah" && !(stat && stat.masalah > 0)) return false;
      if (status === "baik" && !(stat && stat.jenis > 0 && stat.masalah === 0)) return false;
      if (status === "kosong" && stat && stat.jenis > 0) return false;
      if (!q) return true;
      return (
        room.number.toLowerCase().includes(q) ||
        (room.notes ?? "").toLowerCase().includes(q) ||
        (stat?.names ?? "").includes(q)
      );
    });

    return [...filteredRooms].sort((a, b) => {
      const unitA = perRoom.get(a.id)?.total ?? 0;
      const unitB = perRoom.get(b.id)?.total ?? 0;
      switch (sort) {
        case "nomor-desc":
          return collator.compare(b.number, a.number);
        case "lantai-asc":
          return a.floor - b.floor || collator.compare(a.number, b.number);
        case "lantai-desc":
          return b.floor - a.floor || collator.compare(a.number, b.number);
        case "unit-desc":
          return unitB - unitA || collator.compare(a.number, b.number);
        case "unit-asc":
          return unitA - unitB || collator.compare(a.number, b.number);
        default:
          return collator.compare(a.number, b.number);
      }
    });
  }, [rooms.data, perRoom, lantai, status, q, sort]);

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  useEffect(() => {
    setPage(1);
  }, [q, status, lantai, sort, pageSize]);
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  const pageRooms = list.slice(start, start + pageSize);


  return (
    <AppShell
      title="Inventaris Kamar"
      subtitle="Cari kamar atau barang, lalu ubah inventarisnya."
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari nomor kamar atau nama barang..."
            className="h-11 pl-9"
            aria-label="Cari kamar atau barang"
          />
        </div>
        <Button
          variant="outline"
          className="h-11"
          onClick={() =>
            downloadSimplePdf(
              {
                title: "Ringkasan Kamar",
                subtitle: "Daftar kamar Lavin Kost Purwokerto beserta jumlah unit barang.",
                summary: [
                  { label: "Jumlah kamar", value: String(list.length) },
                  {
                    label: "Total unit",
                    value: String(
                      list.reduce((sum, r) => sum + (perRoom.get(r.id)?.total ?? 0), 0),
                    ),
                  },
                ],
                head: ["Kamar", "Lantai", "Jenis barang", "Total unit", "Perlu perhatian"],
                body: list.map((room) => {
                  const stat = perRoom.get(room.id);
                  return [
                    room.number,
                    room.floor === 0 ? "Rooftop" : `Lantai ${room.floor}`,
                    stat?.jenis ?? 0,
                    stat?.total ?? 0,
                    stat?.masalah ?? 0,
                  ];
                }),
                numericColumns: [2, 3, 4],
              },
              "ringkasan-kamar.pdf",
            )
          }
        >
          <FileDown className="mr-2 h-4 w-4" /> Ekspor PDF
        </Button>
      </div>


      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {[0, 1, 2, 3].map((floor) => (
          <Link
            key={floor}
            to="/kamar"
            search={{ lantai: floor }}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
              floor === lantai
                ? "border-gold bg-gold text-primary-foreground"
                : "border-gold-line text-muted-foreground hover:bg-accent"
            }`}
          >
            {floor === 0 ? "Semua lantai" : `Lantai ${floor}`}
          </Link>
        ))}
      </div>

      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
              s === status
                ? "border-gold bg-gold text-primary-foreground"
                : "border-gold-line text-muted-foreground hover:bg-accent"
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-10 w-full sm:w-56" aria-label="Urutkan kamar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SORT_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="h-10 w-36" aria-label="Jumlah per halaman">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / halaman
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {list.length} kamar ditemukan
        {list.length > 0
          ? ` · menampilkan ${start + 1}–${Math.min(start + pageSize, list.length)}`
          : ""}
      </p>

      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {rooms.isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-gold-line" />
            ))
          : pageRooms.map((room) => {
              const stat = perRoom.get(room.id) ?? { total: 0, masalah: 0 };
              return (
                <Link
                  key={room.id}
                  to="/kamar/$nomor"
                  params={{ nomor: room.number }}
                  className="gold-card rounded-xl p-4 transition-colors hover:bg-accent"
                >
                  <p className="font-display text-2xl font-semibold tracking-tight">
                    {room.number}
                  </p>
                  <div className="mt-2 h-px w-8 bg-gold" />
                  <p className="mt-2 text-xs text-muted-foreground">{stat.total} unit barang</p>
                  {stat.masalah > 0 ? (
                    <p className="mt-1 text-xs text-destructive">{stat.masalah} perlu perhatian</p>
                  ) : null}
                </Link>
              );
            })}
      </div>

      {!rooms.isLoading && totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            className="h-10"
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
          >
            Sebelumnya
          </Button>
          <span className="text-xs text-muted-foreground">
            Halaman {current} dari {totalPages}
          </span>
          <Button
            variant="outline"
            className="h-10"
            disabled={current >= totalPages}
            onClick={() => setPage(current + 1)}
          >
            Berikutnya
          </Button>
        </div>
      ) : null}


      {!rooms.isLoading && list.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Tidak ada kamar yang cocok dengan pencarian atau filter.
        </p>
      ) : null}
    </AppShell>
  );
}
