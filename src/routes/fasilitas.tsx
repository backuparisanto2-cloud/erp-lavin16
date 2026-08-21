import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { FileDown, Plus, Pencil, Trash2, Search } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addSharedItem,
  deleteSharedItem,
  sharedItemsQuery,
  updateSharedItem,
} from "@/lib/inventory";
import { downloadSimplePdf } from "@/lib/pdf-report";

import { formInitial, itemPayload } from "@/lib/item-payload";
import { IfCanDelete } from "@/components/IfCanDelete";


export const Route = createFileRoute("/fasilitas")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search['q'] === "string" ? (search['q'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Fasilitas Utama Kost — Inventaris Lavin Kost" },
      {
        name: "description",
        content:
          "Catatan fasilitas bersama Lavin Kost Purwokerto: pompa air, torent, pagar, trafo listrik, dapur, lampu halaman, access point, dan IP camera, lengkap dengan vendor, harga, garansi, dan nota.",
      },
      { property: "og:title", content: "Fasilitas Utama Kost — Inventaris Lavin Kost" },
      {
        property: "og:description",
        content: "Tambah, edit, dan kurangi fasilitas bersama Lavin Kost Purwokerto.",
      },
    ],
  }),
  component: SharedFacilities,
});

type SortKey =
  | "nama-asc"
  | "nama-desc"
  | "kategori-asc"
  | "lokasi-asc"
  | "harga-desc"
  | "jumlah-desc";

const SORT_LABEL: Record<SortKey, string> = {
  "nama-asc": "Nama A → Z",
  "nama-desc": "Nama Z → A",
  "kategori-asc": "Kategori A → Z",
  "lokasi-asc": "Lokasi / lantai A → Z",
  "harga-desc": "Harga tertinggi",
  "jumlah-desc": "Jumlah terbanyak",
};

const PAGE_SIZES = [10, 25, 50, 100];

function SharedFacilities() {
  const { q: initialKeyword } = Route.useSearch();
  const [keyword, setKeyword] = useState(initialKeyword ?? "");
  const [category, setCategory] = useState<string>("Semua");
  const [condition, setCondition] = useState<string>("Semua");
  const [sort, setSort] = useState<SortKey>("nama-asc");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const shared = useQuery(sharedItemsQuery);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["shared_items"] });
  const mutate = useMutation({
    mutationFn: async (fn: () => Promise<void>) => fn(),
    onSuccess: () => refresh(),
    onError: (error: Error) => toast.error(error.message),
  });

  const all = shared.data ?? [];
  const categories = ["Semua", ...Array.from(new Set(all.map((i) => i.category))).sort()];
  const conditionOptions = [
    "Semua",
    ...Array.from(new Set(all.map((i) => i.condition))).sort(),
  ];
  const q = keyword.trim().toLowerCase();
  const list = useMemo(() => {
    const collator = new Intl.Collator("id", { numeric: true, sensitivity: "base" });
    const filtered = all.filter((i) => {
      if (category !== "Semua" && i.category !== category) return false;
      if (condition !== "Semua" && i.condition !== condition) return false;
      if (!q) return true;
      return [i.code, i.name, i.brand, i.serial_number, i.location, i.vendor, i.notes, i.category]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "nama-desc":
          return collator.compare(b.name, a.name);
        case "kategori-asc":
          return collator.compare(a.category, b.category) || collator.compare(a.name, b.name);
        case "lokasi-asc":
          return (
            collator.compare(a.location ?? "zzz", b.location ?? "zzz") ||
            collator.compare(a.name, b.name)
          );
        case "harga-desc":
          return (
            (b.purchase_price ?? -1) - (a.purchase_price ?? -1) || collator.compare(a.name, b.name)
          );
        case "jumlah-desc":
          return b.quantity - a.quantity || collator.compare(a.name, b.name);
        default:
          return collator.compare(a.name, b.name);
      }
    });
  }, [all, category, condition, q, sort]);

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  useEffect(() => {
    setPage(1);
  }, [q, category, condition, sort, pageSize]);
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  const pageItems = list.slice(start, start + pageSize);


  return (
    <AppShell
      title="Inventaris Fasilitas Utama"
      subtitle="Fasilitas yang dipakai bersama seluruh penghuni kost."
    >
      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
        <div className="grid gap-2 sm:flex sm:items-center sm:justify-between">
          <div className="relative min-w-0 sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Cari nama atau kode fasilitas..."
              className="h-11 pl-9"
              aria-label="Cari fasilitas"
            />
          </div>
          <Button
            variant="outline"
            className="h-11 w-full sm:w-auto"
            onClick={() =>
              downloadSimplePdf(
                {
                  title: "Ringkasan Fasilitas Utama",
                  subtitle: "Fasilitas bersama Lavin Kost Purwokerto.",
                  summary: [
                    { label: "Jenis fasilitas", value: String(list.length) },
                    {
                      label: "Total unit",
                      value: String(list.reduce((sum, i) => sum + i.quantity, 0)),
                    },
                  ],
                  head: ["Nama", "Kategori", "Lokasi", "Jumlah", "Kondisi", "Catatan"],
                  body: list.map((i) => [
                    i.name,
                    i.category,
                    i.location ?? "—",
                    i.quantity,
                    i.condition,
                    i.notes ?? "—",
                  ]),
                  numericColumns: [3],
                },
                "ringkasan-fasilitas.pdf",
              )
            }
          >
            <FileDown className="mr-2 h-4 w-4" /> Ekspor PDF
          </Button>
          <ItemFormDialog

            trigger={
              <Button className="h-11 w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Tambah fasilitas
              </Button>
            }
            title="Tambah fasilitas utama"
            withCategory
            folder="fasilitas"
            onSubmit={async (values) => {
              await addSharedItem({
                ...itemPayload(values),
                category: values.category ?? "Umum",
                location: values.location || null,
              });
              await refresh();
              toast.success("Fasilitas ditambahkan");
            }}
          />
        </div>

        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
                c === category
                  ? "border-gold bg-gold text-primary-foreground"
                  : "border-gold-line text-muted-foreground hover:bg-accent"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {conditionOptions.length > 2 ? (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {conditionOptions.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCondition(c)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  c === condition
                    ? "border-gold bg-accent text-foreground"
                    : "border-gold-line text-muted-foreground hover:bg-accent"
                }`}
              >
                {c === "Semua" ? "Semua kondisi" : c}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-10 w-full sm:w-56" aria-label="Urutkan fasilitas">
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

        <p className="mt-2 text-xs text-muted-foreground">
          {list.length} fasilitas ditemukan
          {list.length > 0
            ? ` · menampilkan ${start + 1}–${Math.min(start + pageSize, list.length)}`
            : ""}
        </p>
      </div>

      {shared.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
      ) : list.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Tidak ada fasilitas yang cocok.</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {pageItems.map((item) => (
            <InventoryItemCard
              key={item.id}

              name={item.name}
              code={item.code}
              condition={item.condition}
              quantity={item.quantity}
              notes={item.notes}
              meta={`${item.category}${item.location ? ` · ${item.location}` : ""}`}
              brand={item.brand}
              serialNumber={item.serial_number}
              vendor={item.vendor}
              purchasePrice={item.purchase_price}
              warrantyUntil={item.warranty_until}
              photos={item.photos}
              receipts={item.receipts}
              onQuantityChange={(next) =>
                mutate.mutate(() => updateSharedItem(item.id, { quantity: next }))
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
                    title="Edit fasilitas"
                    withCategory
                    folder="fasilitas"
                    initial={formInitial(item)}
                    onSubmit={async (values) => {
                      await updateSharedItem(item.id, {
                        ...itemPayload(values),
                        category: values.category ?? "Umum",
                        location: values.location || null,
                      });
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
                            Fasilitas ini akan dihapus permanen dari daftar.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              mutate.mutate(async () => {
                                await deleteSharedItem(item.id);
                                toast.success("Fasilitas dihapus");
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

      {!shared.isLoading && totalPages > 1 ? (
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

    </AppShell>
  );
}
