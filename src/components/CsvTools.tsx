import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { dateOrNull, downloadCsv, num, parseCsvTable, toCsv } from "@/lib/csv";
import type { Room, RoomItem, SharedItem } from "@/lib/inventory";
import { allRoomItemsQuery, roomsQuery, sharedItemsQuery } from "@/lib/inventory";

const ROOM_HEADERS = ["number", "floor", "notes"];
const ITEM_HEADERS = [
  "tipe",
  "kamar",
  "name",
  "category",
  "quantity",
  "condition",
  "location",
  "brand",
  "serial_number",
  "vendor",
  "purchase_price",
  "purchase_date",
  "warranty_until",
  "notes",
];

export function exportRoomsCsv(rooms: Room[]) {
  downloadCsv(
    "master-kamar.csv",
    toCsv(
      ROOM_HEADERS,
      rooms.map((r) => [r.number, r.floor, r.notes ?? ""]),
    ),
  );
}

export function exportItemsCsv(rooms: Room[], roomItems: RoomItem[], sharedItems: SharedItem[]) {
  const roomById = new Map(rooms.map((r) => [r.id, r.number]));
  const rows = [
    ...roomItems.map((i) => [
      "kamar",
      roomById.get(i.room_id) ?? "",
      i.name,
      "",
      i.quantity,
      i.condition,
      "",
      i.brand ?? "",
      i.serial_number ?? "",
      i.vendor ?? "",
      i.purchase_price ?? "",
      i.purchase_date ?? "",
      i.warranty_until ?? "",
      i.notes ?? "",
    ]),
    ...sharedItems.map((i) => [
      "fasilitas",
      "",
      i.name,
      i.category,
      i.quantity,
      i.condition,
      i.location ?? "",
      i.brand ?? "",
      i.serial_number ?? "",
      i.vendor ?? "",
      i.purchase_price ?? "",
      i.purchase_date ?? "",
      i.warranty_until ?? "",
      i.notes ?? "",
    ]),
  ];
  downloadCsv("master-unit-barang.csv", toCsv(ITEM_HEADERS, rows));
}

type ImportReport = { dibuat: number; diperbarui: number; dilewati: string[] };

async function importRooms(rows: Record<string, string>[]): Promise<ImportReport> {
  const { data: existing } = await supabase.from("rooms").select("id, number");
  const byNumber = new Map((existing ?? []).map((r) => [r.number.trim(), r.id]));
  const report: ImportReport = { dibuat: 0, diperbarui: 0, dilewati: [] };

  for (const [index, row] of rows.entries()) {
    const number = (row["number"] ?? row["nomor"] ?? "").trim();
    const floor = num(row["floor"] ?? row["lantai"]);
    if (!number || floor === null) {
      report.dilewati.push(`Baris ${index + 2}: nomor atau lantai kosong`);
      continue;
    }
    const payload = { number, floor: Math.trunc(floor), notes: row["notes"] || null };
    const id = byNumber.get(number);
    const { error } = id
      ? await supabase.from("rooms").update(payload).eq("id", id)
      : await supabase.from("rooms").insert(payload);
    if (error) report.dilewati.push(`Baris ${index + 2}: ${error.message}`);
    else if (id) report.diperbarui += 1;
    else report.dibuat += 1;
  }
  return report;
}

async function importItems(rows: Record<string, string>[]): Promise<ImportReport> {
  const [{ data: rooms }, { data: roomItems }, { data: sharedItems }] = await Promise.all([
    supabase.from("rooms").select("id, number"),
    supabase.from("room_items").select("id, room_id, name"),
    supabase.from("shared_items").select("id, name, category"),
  ]);
  const roomIdByNumber = new Map((rooms ?? []).map((r) => [r.number.trim(), r.id]));
  const roomItemKey = new Map(
    (roomItems ?? []).map((i) => [`${i.room_id}::${i.name.toLowerCase()}`, i.id]),
  );
  const sharedKey = new Map((sharedItems ?? []).map((i) => [i.name.toLowerCase(), i.id]));
  const report: ImportReport = { dibuat: 0, diperbarui: 0, dilewati: [] };

  for (const [index, row] of rows.entries()) {
    const line = index + 2;
    const name = (row["name"] ?? row["nama"] ?? "").trim();
    const tipe = (row["tipe"] ?? row["type"] ?? "kamar").trim().toLowerCase();
    if (!name) {
      report.dilewati.push(`Baris ${line}: nama barang kosong`);
      continue;
    }
    const common = {
      name,
      quantity: Math.max(1, Math.trunc(num(row["quantity"] ?? row["jumlah"]) ?? 1)),
      condition: row["condition"] || row["kondisi"] || "Baik",
      brand: row["brand"] || null,
      serial_number: row["serial_number"] || null,
      vendor: row["vendor"] || null,
      purchase_price: num(row["purchase_price"] ?? row["harga"]),
      purchase_date: dateOrNull(row["purchase_date"]),
      warranty_until: dateOrNull(row["warranty_until"]),
      notes: row["notes"] || null,
    };

    if (tipe.startsWith("fasilitas") || tipe === "shared") {
      const payload = {
        ...common,
        category: row["category"] || row["kategori"] || "Umum",
        location: row["location"] || row["lokasi"] || null,
      };
      const id = sharedKey.get(name.toLowerCase());
      const { error } = id
        ? await supabase.from("shared_items").update(payload).eq("id", id)
        : await supabase.from("shared_items").insert(payload);
      if (error) report.dilewati.push(`Baris ${line}: ${error.message}`);
      else if (id) report.diperbarui += 1;
      else report.dibuat += 1;
      continue;
    }

    const roomNumber = (row["kamar"] ?? row["room"] ?? row["room_number"] ?? "").trim();
    const roomId = roomIdByNumber.get(roomNumber);
    if (!roomId) {
      report.dilewati.push(`Baris ${line}: kamar "${roomNumber}" tidak ditemukan`);
      continue;
    }
    const id = roomItemKey.get(`${roomId}::${name.toLowerCase()}`);
    const { error } = id
      ? await supabase.from("room_items").update(common).eq("id", id)
      : await supabase.from("room_items").insert({ ...common, room_id: roomId });
    if (error) report.dilewati.push(`Baris ${line}: ${error.message}`);
    else if (id) report.diperbarui += 1;
    else report.dibuat += 1;
  }
  return report;
}

export function CsvImportButton({ mode }: { mode: "rooms" | "items" }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  const run = useMutation({
    mutationFn: () => (mode === "rooms" ? importRooms(rows) : importItems(rows)),
    onSuccess: (result) => {
      setReport(result);
      void queryClient.invalidateQueries({ queryKey: roomsQuery.queryKey });
      void queryClient.invalidateQueries({ queryKey: allRoomItemsQuery.queryKey });
      void queryClient.invalidateQueries({ queryKey: sharedItemsQuery.queryKey });
      toast.success(`${result.dibuat} data baru, ${result.diperbarui} diperbarui`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function onFile(file: File) {
    const text = await file.text();
    const table = parseCsvTable(text);
    if (table.rows.length === 0) {
      toast.error("File CSV kosong atau tidak terbaca");
      return;
    }
    setRows(table.rows);
    setReport(null);
    setOpen(true);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void onFile(file);
        }}
      />
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Upload className="mr-2 h-4 w-4" /> Impor CSV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pratinjau impor {mode === "rooms" ? "kamar" : "unit barang"}</DialogTitle>
            <DialogDescription>
              {rows.length} baris terbaca. Data yang sudah ada akan diperbarui, sisanya ditambahkan.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 overflow-auto rounded-md border border-border text-xs">
            <table className="w-full">
              <thead className="bg-muted/50 text-left">
                <tr>
                  {Object.keys(rows[0] ?? {}).map((h) => (
                    <th key={h} className="px-2 py-1 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.slice(0, 20).map((row, i) => (
                  <tr key={i}>
                    {Object.keys(rows[0] ?? {}).map((h) => (
                      <td key={h} className="px-2 py-1 whitespace-nowrap">
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {report ? (
            <div className="rounded-md border border-gold-line bg-card p-3 text-sm">
              <p>
                {report.dibuat} ditambahkan, {report.diperbarui} diperbarui,{" "}
                {report.dilewati.length} dilewati.
              </p>
              {report.dilewati.length > 0 ? (
                <ul className="mt-2 max-h-32 list-disc space-y-1 overflow-auto pl-5 text-xs text-muted-foreground">
                  {report.dilewati.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Tutup
            </Button>
            <Button onClick={() => run.mutate()} disabled={run.isPending}>
              {run.isPending ? "Mengimpor…" : "Impor sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CsvExportButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <Download className="mr-2 h-4 w-4" /> {label}
    </Button>
  );
}
