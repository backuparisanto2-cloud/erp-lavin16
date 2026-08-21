import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, Sparkles, Search, Map } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { InventoryItemCard } from "@/components/InventoryItemCard";
import { ItemFormDialog } from "@/components/ItemFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  addRoomItem,
  allRoomItemsQuery,
  deleteRoomItem,
  roomsQuery,
  seedRoomItems,
  updateRoomItem,
} from "@/lib/inventory";
import { formInitial, itemPayload } from "@/lib/item-payload";
import { floorKeyForRoom } from "@/lib/floorplan";
import { IfCanDelete } from "@/components/IfCanDelete";

export const Route = createFileRoute("/kamar/$nomor")({
  head: ({ params }) => ({
    meta: [
      { title: `Kamar ${params.nomor} — Inventaris Lavin Kost` },
      {
        name: "description",
        content: `Inventaris fasilitas kamar ${params.nomor} Lavin Kost Purwokerto: vendor, harga, garansi, foto barang, dan nota.`,
      },
      { property: "og:title", content: `Kamar ${params.nomor} — Inventaris Lavin Kost` },
      {
        property: "og:description",
        content: `Catatan fasilitas kamar ${params.nomor} Lavin Kost Purwokerto.`,
      },
    ],
  }),
  component: RoomDetail,
});

function RoomDetail() {
  const { nomor } = Route.useParams();
  const [keyword, setKeyword] = useState("");
  const queryClient = useQueryClient();
  const rooms = useQuery(roomsQuery);
  const items = useQuery(allRoomItemsQuery);

  const room = (rooms.data ?? []).find((r) => r.number === nomor);
  const roomItems = (items.data ?? []).filter((i) => i.room_id === room?.id);
  const kw = keyword.trim().toLowerCase();
  const list = roomItems.filter((i) =>
    [i.code, i.name, i.brand, i.serial_number]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(kw)),
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["room_items"] });

  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
    onSuccess: () => refresh(),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell
      title={room ? `Kamar ${room.number}` : `Kamar ${nomor}`}
      subtitle={room ? `Lantai ${room.floor} · ${roomItems.length} jenis barang` : undefined}
    >
      <Link
        to="/kamar"
        search={{ lantai: room?.floor ?? 1 }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar kamar
      </Link>

      <Link
        to="/denah"
        search={{ lantai: floorKeyForRoom(room?.floor ?? 1), kamar: nomor }}
        className="ml-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <Map className="h-4 w-4" /> Lihat di denah
      </Link>

      {room ? (
        <div className="sticky top-0 z-10 -mx-4 mt-3 bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
          <div className="grid gap-2 sm:flex sm:items-center sm:justify-between">
            <div className="relative min-w-0 sm:max-w-xs sm:flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari nama atau kode barang..."
                className="h-11 pl-9"
                aria-label="Cari barang"
              />
            </div>
            <div className="flex gap-2">
              {roomItems.length === 0 ? (
                <Button
                  variant="outline"
                  onClick={() => mutate.mutate(() => seedRoomItems(room.id))}
                  className="h-11 flex-1 border-gold-line sm:flex-none"
                >
                  <Sparkles className="mr-2 h-4 w-4" /> Item standar
                </Button>
              ) : null}
              <ItemFormDialog
                trigger={
                  <Button className="h-11 flex-1 sm:flex-none">
                    <Plus className="mr-2 h-4 w-4" /> Tambah barang
                  </Button>
                }
                title="Tambah barang kamar"
                description={`Barang baru untuk kamar ${room.number}.`}
                folder={`kamar/${room.number}`}
                onSubmit={async (values) => {
                  await addRoomItem({ ...itemPayload(values), room_id: room.id });
                  await refresh();
                  toast.success("Barang ditambahkan");
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {rooms.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
      ) : !room ? (
        <p className="mt-4 text-sm text-muted-foreground">Kamar {nomor} tidak ditemukan.</p>
      ) : roomItems.length === 0 ? (
        <div className="gold-card mt-4 rounded-xl p-8 text-center">
          <p className="font-display text-xl">Belum ada barang tercatat</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Tambahkan barang satu per satu atau isi dengan daftar item standar.
          </p>
        </div>
      ) : list.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Tidak ada barang yang cocok.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {list.map((item) => (
            <InventoryItemCard
              key={item.id}
              name={item.name}
              code={item.code}
              condition={item.condition}
              quantity={item.quantity}
              notes={item.notes}
              brand={item.brand}
              serialNumber={item.serial_number}
              vendor={item.vendor}
              purchasePrice={item.purchase_price}
              warrantyUntil={item.warranty_until}
              photos={item.photos}
              receipts={item.receipts}
              onQuantityChange={(next) =>
                mutate.mutate(() => updateRoomItem(item.id, { quantity: next }))
              }
              actions={
                <>
                  <ItemFormDialog
                    trigger={
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${item.name}`}
                        className="h-11 w-11"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                    title="Edit barang"
                    folder={`kamar/${room.number}`}
                    initial={formInitial(item)}
                    onSubmit={async (values) => {
                      await updateRoomItem(item.id, itemPayload(values));
                      await refresh();
                      toast.success("Perubahan disimpan");
                    }}
                  />

                  <IfCanDelete>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Hapus ${item.name}`}
                          className="h-11 w-11 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-gold-line">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-display text-2xl">
                            Hapus {item.name}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Data barang ini akan dihapus permanen dari kamar {room.number}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              mutate.mutate(async () => {
                                await deleteRoomItem(item.id);
                                toast.success("Barang dihapus");
                              })
                            }
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </IfCanDelete>
                </>
              }
            />
          ))}
        </ul>
      )}
    </AppShell>
  );
}
