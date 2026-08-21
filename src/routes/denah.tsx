import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, DoorClosed, MapPin } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { ConditionBadge } from "@/components/ConditionBadge";
import { FloorPlanMap, type HotspotStatus } from "@/components/FloorPlanMap";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  FLOOR_PLANS,
  MAPPED_ROOM_NUMBERS,
  floorPlan,
  matchesLocation,
  type FloorKey,
  type Hotspot,
} from "@/lib/floorplan";
import { allRoomItemsQuery, roomsQuery, sharedItemsQuery, warrantyStatus } from "@/lib/inventory";
import { tenantsQuery } from "@/lib/income";
import { formatRupiah } from "@/lib/inventory";

const FLOOR_KEYS: FloorKey[] = ["1", "2", "3", "rooftop"];

function parseFloor(value: unknown): FloorKey {
  const raw = typeof value === "number" ? String(value) : value;
  return FLOOR_KEYS.includes(raw as FloorKey) ? (raw as FloorKey) : "1";
}


export const Route = createFileRoute("/denah")({
  validateSearch: (search: Record<string, unknown>) => ({
    lantai: parseFloor(search['lantai']),
    kamar: typeof search['kamar'] === "string" ? (search['kamar'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Denah Interaktif Kost — Inventaris Lavin Kost" },
      {
        name: "description",
        content:
          "Denah lantai 1, 2, 3, dan rooftop Lavin Kost Purwokerto. Klik area kamar untuk melihat penyewa aktif, jumlah barang, dan kondisi inventaris.",
      },
      { property: "og:title", content: "Denah Interaktif Kost — Inventaris Lavin Kost" },
      {
        property: "og:description",
        content: "Peta kamar dan fasilitas Lavin Kost Purwokerto dengan status hunian dan kondisi barang.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FloorPlanPage,
});

const BAD_CONDITIONS = ["Rusak", "Perlu Perbaikan"];

function FloorPlanPage() {
  const { lantai, kamar } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const plan = floorPlan(lantai);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const rooms = useQuery(roomsQuery);
  const tenants = useQuery(tenantsQuery);
  const roomItems = useQuery(allRoomItemsQuery);
  const shared = useQuery(sharedItemsQuery);

  const roomsByNumber = useMemo(
    () => new Map((rooms.data ?? []).map((r) => [r.number, r])),
    [rooms.data],
  );

  const activeTenantByRoom = useMemo(() => {
    const map = new Map<string, { name: string; contact: string | null }>();
    for (const tenant of tenants.data ?? []) {
      if (tenant.status !== "Aktif" || !tenant.room_number) continue;
      map.set(tenant.room_number, { name: tenant.name, contact: tenant.contact });
    }
    return map;
  }, [tenants.data]);

  const roomStats = useMemo(() => {
    const map = new Map<
      string,
      { total: number; bad: number; warranty: number; items: typeof items }
    >();
    const items = roomItems.data ?? [];
    for (const room of rooms.data ?? []) {
      const list = items.filter((i) => i.room_id === room.id);
      map.set(room.number, {
        total: list.length,
        bad: list.filter((i) => BAD_CONDITIONS.includes(i.condition)).length,
        warranty: list.filter((i) => {
          const w = warrantyStatus(i.warranty_until);
          return w?.tone === "soon" || w?.tone === "expired";
        }).length,
        items: list,
      });
    }
    return map;
  }, [rooms.data, roomItems.data]);

  const sharedByHotspot = useMemo(() => {
    const map = new Map<string, typeof list>();
    const list = shared.data ?? [];
    for (const hotspot of plan.hotspots) {
      if (hotspot.type !== "umum") continue;
      map.set(
        hotspot.id,
        list.filter((item) => matchesLocation(item.location, hotspot.locationMatch)),
      );
    }
    return map;
  }, [plan.hotspots, shared.data]);

  const highlight = kamar ?? null;
  const selected = plan.hotspots.find((h) => h.id === selectedId) ?? null;

  const statusFor = (hotspot: Hotspot): HotspotStatus => {
    if (hotspot.type === "umum") {
      const items = sharedByHotspot.get(hotspot.id) ?? [];
      return {
        tone: "common",
        alert: items.some((i) => BAD_CONDITIONS.includes(i.condition)),
        warranty: items.some((i) => {
          const w = warrantyStatus(i.warranty_until);
          return w?.tone === "soon" || w?.tone === "expired";
        }),
      };
    }
    const stats = hotspot.roomNumber ? roomStats.get(hotspot.roomNumber) : undefined;
    return {
      tone: hotspot.roomNumber && activeTenantByRoom.has(hotspot.roomNumber) ? "occupied" : "vacant",
      alert: (stats?.bad ?? 0) > 0,
      warranty: (stats?.warranty ?? 0) > 0,
    };
  };

  const unmapped = (rooms.data ?? []).filter((r) => !MAPPED_ROOM_NUMBERS.has(r.number));

  const detail = selected ? (
    <FloorPlanDetail
      hotspot={selected}
      tenant={selected.roomNumber ? activeTenantByRoom.get(selected.roomNumber) : undefined}
      roomStats={selected.roomNumber ? roomStats.get(selected.roomNumber) : undefined}
      sharedItems={sharedByHotspot.get(selected.id) ?? []}
      hasRoom={selected.roomNumber ? roomsByNumber.has(selected.roomNumber) : false}
    />
  ) : (
    <p className="text-sm text-muted-foreground">
      Pilih area pada denah untuk melihat penyewa, barang, dan kondisinya.
    </p>
  );

  return (
    <AppShell
      title="Denah Interaktif"
      subtitle="Peta lantai 1-3 dan rooftop. Warna area menunjukkan status hunian, titik merah menandai barang rusak."
    >
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FLOOR_PLANS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setSelectedId(null);
              void navigate({ search: { lantai: item.key, kamar: undefined } });
            }}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
              item.key === plan.key
                ? "border-gold bg-gold text-primary-foreground"
                : "border-gold-line text-muted-foreground hover:bg-accent"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <FloorPlanMap
            plan={plan}
            statusFor={statusFor}
            selectedId={selectedId}
            onSelect={(hotspot) => setSelectedId(hotspot.id)}
          />

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <Legend className="bg-primary/25 border-primary/70" label="Kamar terisi" />
            <Legend className="bg-muted/40 border-muted-foreground/50" label="Kamar kosong" />
            <Legend className="bg-success/15 border-success/50" label="Area umum" />
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-destructive" /> Ada barang rusak
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-warning" /> Garansi habis / hampir habis
            </span>
          </div>

          {highlight ? (
            <p className="mt-3 rounded-md border border-gold-line bg-card px-3 py-2 text-sm">
              Kamar yang dibuka dari halaman detail: <strong>{highlight}</strong>
            </p>
          ) : null}

          {unmapped.length ? (
            <div className="mt-4 rounded-md border border-dashed border-gold-line px-3 py-3 text-sm">
              <p className="font-medium">Kamar belum dipetakan di denah</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Kamar ini ada di data tetapi belum punya area pada gambar denah.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {unmapped.map((room) => (
                  <Link
                    key={room.id}
                    to="/kamar/$nomor"
                    params={{ nomor: room.number }}
                    className="rounded-full border border-gold-line px-3 py-1 text-xs hover:bg-accent"
                  >
                    Kamar {room.number}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="hidden rounded-lg border border-gold-line bg-card p-4 lg:block">
          <p className="mb-3 flex items-center gap-2 text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
            <MapPin className="h-3.5 w-3.5" /> Detail area
          </p>
          {detail}
        </aside>
      </div>

      <Sheet
        open={Boolean(selected) && !isDesktop}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto lg:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>{selected?.label}</SheetTitle>
          </SheetHeader>

          <div className="pb-4">{detail}</div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-3 w-4 rounded-[3px] border ${className}`} /> {label}
    </span>
  );
}

type RoomStats = {
  total: number;
  bad: number;
  warranty: number;
  items: { id: string; name: string; condition: string; purchase_price: number | null }[];
};

function FloorPlanDetail({
  hotspot,
  tenant,
  roomStats,
  sharedItems,
  hasRoom,
}: {
  hotspot: Hotspot;
  tenant?: { name: string; contact: string | null } | undefined;
  roomStats?: RoomStats | undefined;
  sharedItems: {
    id: string;
    name: string;
    condition: string;
    location: string | null;
    purchase_price: number | null;
  }[];
  hasRoom: boolean;
}) {
  if (hotspot.type === "kamar") {
    return (
      <div className="space-y-3">
        <div>
          <p className="font-display text-base font-semibold">{hotspot.label}</p>
          <p className="text-sm text-muted-foreground">
            {tenant ? `Penyewa aktif: ${tenant.name}` : "Belum ada penyewa aktif"}
            {tenant?.contact ? ` · ${tenant.contact}` : ""}
          </p>
        </div>
        <ul className="space-y-1 text-sm">
          <li>Jumlah jenis barang: {roomStats?.total ?? 0}</li>
          <li>Barang rusak / perlu perbaikan: {roomStats?.bad ?? 0}</li>
          <li>Garansi perlu dicek: {roomStats?.warranty ?? 0}</li>
        </ul>
        {roomStats?.items.length ? (
          <div className="space-y-1">
            {roomStats.items.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{item.name}</span>
                <ConditionBadge condition={item.condition} />
              </div>
            ))}
            {roomStats.items.length > 6 ? (
              <p className="text-xs text-muted-foreground">
                +{roomStats.items.length - 6} barang lainnya
              </p>
            ) : null}
          </div>
        ) : null}
        {hasRoom && hotspot.roomNumber ? (
          <Button asChild className="w-full">
            <Link to="/kamar/$nomor" params={{ nomor: hotspot.roomNumber }}>
              <DoorClosed className="mr-2 h-4 w-4" /> Buka detail kamar
            </Link>
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Kamar ini belum ada di data kamar.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="font-display text-base font-semibold">{hotspot.label}</p>
        <p className="text-sm text-muted-foreground">Area bersama · {sharedItems.length} barang tercatat</p>
      </div>
      {sharedItems.length ? (
        <div className="space-y-1">
          {sharedItems.slice(0, 8).map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                {item.name}
                {item.purchase_price ? (
                  <span className="text-muted-foreground"> · {formatRupiah(item.purchase_price)}</span>
                ) : null}
              </span>
              <ConditionBadge condition={item.condition} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Belum ada barang fasilitas untuk area ini.</p>
      )}
      <Button asChild variant="outline" className="w-full">
        <Link to="/fasilitas" search={{ q: hotspot.locationMatch?.[0] ?? hotspot.label }}>
          Buka daftar fasilitas <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
