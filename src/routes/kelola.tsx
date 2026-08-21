import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ItemFormDialog } from "@/components/ItemFormDialog";
import { RoomFormDialog } from "@/components/RoomFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addRoom,
  addRoomItem,
  addSharedItem,
  allRoomItemsQuery,
  deleteRoom,
  deleteRoomItem,
  deleteSharedItem,
  roomsQuery,
  sharedItemsQuery,
  updateRoom,
  updateRoomItem,
  updateSharedItem,
} from "@/lib/inventory";
import { formInitial, itemPayload } from "@/lib/item-payload";
import { IfCanDelete } from "@/components/IfCanDelete";

export const Route = createFileRoute("/kelola")({
  head: () => ({
    meta: [
      { title: "Kelola Data Kamar & Barang — Lavin Kost Purwokerto" },
      {
        name: "description",
        content:
          "Tambah, ubah, dan hapus data kamar serta seluruh unit barang kamar dan fasilitas bersama dalam satu halaman.",
      },
      { property: "og:title", content: "Kelola Data Kamar & Barang — Lavin Kost" },
      {
        property: "og:description",
        content: "Manajemen data master kamar dan unit barang Lavin Kost Purwokerto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManagePage,
});

type UnifiedItem = {
  id: string;
  kind: "room" | "shared";
  name: string;
  quantity: number;
  condition: string;
  place: string;
  floor: number | null;
  roomId: string | null;
  raw: Parameters<typeof formInitial>[0];
};

function ManagePage() {
  return (
    <AppShell
      title="Kelola Data"
      subtitle="Tambah, ubah, dan hapus data kamar serta unit barang."
    >
      <Tabs defaultValue="kamar">
        <TabsList className="mb-5">
          <TabsTrigger value="kamar">Kamar</TabsTrigger>
          <TabsTrigger value="barang">Unit Barang</TabsTrigger>
        </TabsList>
        <TabsContent value="kamar">
          <RoomsTab />
        </TabsContent>
        <TabsContent value="barang">
          <ItemsTab />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function RoomsTab() {
  const qc = useQueryClient();
  const rooms = useQuery(roomsQuery);
  const items = useQuery(allRoomItemsQuery);
  const [keyword, setKeyword] = useState("");

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["rooms"] });
    void qc.invalidateQueries({ queryKey: ["room_items"] });
  };

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    (items.data ?? []).forEach((it) => {
      map.set(it.room_id, (map.get(it.room_id) ?? 0) + it.quantity);
    });
    return map;
  }, [items.data]);

  const list = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return (rooms.data ?? []).filter(
      (r) => !q || r.number.toLowerCase().includes(q) || String(r.floor).includes(q),
    );
  }, [rooms.data, keyword]);

  const remove = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => {
      toast.success("Kamar dihapus");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari nomor kamar atau lantai"
            className="pl-9"
          />
        </div>
        <RoomFormDialog
          trigger={
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Tambah kamar
            </Button>
          }
          title="Tambah kamar"
          description="Isi nomor kamar dan lantainya."
          onSubmit={async (payload) => {
            try {
              await addRoom(payload);
              toast.success("Kamar ditambahkan");
              refresh();
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-gold-line">
        <table className="w-full text-sm">
          <thead className="bg-accent/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2">Kamar</th>
              <th className="px-3 py-2">Lantai</th>
              <th className="px-3 py-2 text-right">Unit</th>
              <th className="px-3 py-2">Catatan</th>
              <th className="px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {list.map((room) => (
              <tr key={room.id} className="border-t border-border/60">
                <td className="px-3 py-2 font-medium">{room.number}</td>
                <td className="px-3 py-2">{room.floor === 0 ? "Rooftop" : `Lantai ${room.floor}`}</td>
                <td className="px-3 py-2 text-right">{counts.get(room.id) ?? 0}</td>
                <td className="max-w-[16rem] truncate px-3 py-2 text-muted-foreground">
                  {room.notes ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <RoomFormDialog
                      trigger={
                        <Button variant="outline" size="icon" aria-label={`Ubah kamar ${room.number}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                      title={`Ubah kamar ${room.number}`}
                      initial={{ number: room.number, floor: room.floor, notes: room.notes }}
                      onSubmit={async (payload) => {
                        try {
                          await updateRoom(room.id, payload);
                          toast.success("Kamar diperbarui");
                          refresh();
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    />
                    <IfCanDelete>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Hapus kamar ${room.number}`}
                        onClick={() => {
                          const n = counts.get(room.id) ?? 0;
                          const ok = window.confirm(
                            `Hapus kamar ${room.number}? ${n} unit barang di dalamnya ikut terhapus dan tidak bisa dikembalikan.`,
                          );
                          if (ok) remove.mutate(room.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </IfCanDelete>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  {rooms.isLoading ? "Memuat…" : "Belum ada kamar."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ItemsTab() {
  const qc = useQueryClient();
  const rooms = useQuery(roomsQuery);
  const roomItems = useQuery(allRoomItemsQuery);
  const shared = useQuery(sharedItemsQuery);
  const [keyword, setKeyword] = useState("");
  const [scope, setScope] = useState("semua");
  const [condition, setCondition] = useState("semua");

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["room_items"] });
    void qc.invalidateQueries({ queryKey: ["shared_items"] });
  };

  const roomMap = useMemo(
    () => new Map((rooms.data ?? []).map((r) => [r.id, r])),
    [rooms.data],
  );

  const unified = useMemo<UnifiedItem[]>(() => {
    const fromRooms = (roomItems.data ?? []).map((it) => {
      const room = roomMap.get(it.room_id);
      return {
        id: it.id,
        kind: "room" as const,
        name: it.name,
        quantity: it.quantity,
        condition: it.condition,
        place: room ? `Kamar ${room.number}` : "Kamar",
        floor: room?.floor ?? null,
        roomId: it.room_id,
        raw: it,
      };
    });
    const fromShared = (shared.data ?? []).map((it) => ({
      id: it.id,
      kind: "shared" as const,
      name: it.name,
      quantity: it.quantity,
      condition: it.condition,
      place: it.location ? `${it.category} · ${it.location}` : it.category,
      floor: null,
      roomId: null,
      raw: it,
    }));
    return [...fromRooms, ...fromShared];
  }, [roomItems.data, shared.data, roomMap]);

  const conditions = useMemo(
    () => Array.from(new Set(unified.map((u) => u.condition))).sort(),
    [unified],
  );

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return unified.filter((u) => {
      if (q && !`${u.name} ${u.place}`.toLowerCase().includes(q)) return false;
      if (condition !== "semua" && u.condition !== condition) return false;
      if (scope === "fasilitas") return u.kind === "shared";
      if (scope === "kamar") return u.kind === "room";
      if (scope.startsWith("lantai-")) {
        return u.kind === "room" && String(u.floor) === scope.replace("lantai-", "");
      }
      return true;
    });
  }, [unified, keyword, scope, condition]);

  const floors = useMemo(
    () => Array.from(new Set((rooms.data ?? []).map((r) => r.floor))).sort((a, b) => a - b),
    [rooms.data],
  );

  const [targetRoom, setTargetRoom] = useState("");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari barang"
            className="pl-9"
          />
        </div>
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger aria-label="Filter lingkup">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua lingkup</SelectItem>
            <SelectItem value="kamar">Barang kamar</SelectItem>
            <SelectItem value="fasilitas">Fasilitas bersama</SelectItem>
            {floors.map((f) => (
              <SelectItem key={f} value={`lantai-${f}`}>
                {f === 0 ? "Rooftop" : `Lantai ${f}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={condition} onValueChange={setCondition}>
          <SelectTrigger aria-label="Filter kondisi">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua kondisi</SelectItem>
            {conditions.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Select value={targetRoom} onValueChange={setTargetRoom}>
            <SelectTrigger aria-label="Kamar tujuan">
              <SelectValue placeholder="Kamar tujuan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__shared">Fasilitas bersama</SelectItem>
              {(rooms.data ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  Kamar {r.number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ItemFormDialog
            trigger={
              <Button className="gap-2" disabled={!targetRoom}>
                <Plus className="h-4 w-4" /> Tambah
              </Button>
            }
            title="Tambah unit barang"
            description={
              targetRoom === "__shared"
                ? "Barang akan masuk ke fasilitas bersama."
                : "Barang akan masuk ke kamar terpilih."
            }
            withCategory={targetRoom === "__shared"}
            folder="items"
            onSubmit={async (values) => {
              try {
                if (targetRoom === "__shared") {
                  await addSharedItem({
                    ...itemPayload(values),
                    category: values.category ?? "Umum",
                    location: values.location?.trim() || null,
                  });
                } else {
                  await addRoomItem({ ...itemPayload(values), room_id: targetRoom });
                }
                toast.success("Barang ditambahkan");
                refresh();
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} baris ditampilkan ·{" "}
        {filtered.reduce((sum, u) => sum + u.quantity, 0)} unit
      </p>

      <div className="overflow-hidden rounded-lg border border-gold-line">
        <table className="w-full text-sm">
          <thead className="bg-accent/50 text-left text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2">Barang</th>
              <th className="px-3 py-2">Lokasi</th>
              <th className="px-3 py-2 text-right">Jml</th>
              <th className="px-3 py-2">Kondisi</th>
              <th className="px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={`${item.kind}-${item.id}`} className="border-t border-border/60">
                <td className="px-3 py-2 font-medium">{item.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{item.place}</td>
                <td className="px-3 py-2 text-right">{item.quantity}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline">{item.condition}</Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <ItemFormDialog
                      trigger={
                        <Button variant="outline" size="icon" aria-label={`Ubah ${item.name}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                      title={`Ubah ${item.name}`}
                      initial={formInitial(item.raw)}
                      withCategory={item.kind === "shared"}
                      folder="items"
                      onSubmit={async (values) => {
                        try {
                          if (item.kind === "shared") {
                            await updateSharedItem(item.id, {
                              ...itemPayload(values),
                              category: values.category ?? "Umum",
                              location: values.location?.trim() || null,
                            });
                          } else {
                            await updateRoomItem(item.id, itemPayload(values));
                          }
                          toast.success("Barang diperbarui");
                          refresh();
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    />
                    <IfCanDelete>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Hapus ${item.name}`}
                        onClick={async () => {
                          if (!window.confirm(`Hapus ${item.name}?`)) return;
                          try {
                            if (item.kind === "shared") await deleteSharedItem(item.id);
                            else await deleteRoomItem(item.id);
                            toast.success("Barang dihapus");
                            refresh();
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </IfCanDelete>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  {roomItems.isLoading || shared.isLoading ? "Memuat…" : "Tidak ada barang."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
