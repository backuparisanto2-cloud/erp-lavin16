import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Bookmark, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deletePreset,
  loadPresets,
  savePreset,
  type ColumnPreset,
} from "@/lib/report-presets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ColumnConfig, ColumnKey } from "@/lib/report-columns";
import { COLUMN_MAP, defaultColumnConfig } from "@/lib/report-columns";

export function ReportColumnManager({
  columns,
  onChange,
}: {
  columns: ColumnConfig[];
  onChange: (next: ColumnConfig[]) => void;
}) {
  const visible = columns.filter((c) => c.visible);
  const hidden = columns.filter((c) => !c.visible);

  const [presets, setPresets] = useState<ColumnPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [activePreset, setActivePreset] = useState("");

  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  function handleSavePreset() {
    const name = presetName.trim();
    if (!name) {
      toast.error("Beri nama preset terlebih dahulu.");
      return;
    }
    const next = savePreset(name, columns);
    setPresets(next);
    const saved = next.find((p) => p.name.toLowerCase() === name.toLowerCase());
    setActivePreset(saved?.id ?? "");
    setPresetName("");
    toast.success(`Preset "${name}" tersimpan.`);
  }

  function handleLoadPreset(id: string) {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    setActivePreset(id);
    onChange(preset.columns.map((c) => ({ ...c })));
    toast.success(`Preset "${preset.name}" dimuat.`);
  }

  function handleDeletePreset() {
    const preset = presets.find((p) => p.id === activePreset);
    if (!preset) return;
    setPresets(deletePreset(preset.id));
    setActivePreset("");
    toast.success(`Preset "${preset.name}" dihapus.`);
  }

  function move(key: ColumnKey, delta: number) {
    const next = [...columns];
    const from = next.findIndex((c) => c.key === key);
    const order = visible.map((c) => c.key);
    const pos = order.indexOf(key);
    const targetKey = order[pos + delta];
    if (!targetKey) return;
    const to = next.findIndex((c) => c.key === targetKey);
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    onChange(next);
  }

  function update(key: ColumnKey, patch: Partial<ColumnConfig>) {
    onChange(columns.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  function add(key: string) {
    const target = columns.find((c) => c.key === key);
    if (!target) return;
    onChange([...columns.filter((c) => c.key !== key), { ...target, visible: true }]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Atur kolom sebelum ekspor: urutkan, ganti nama, hapus, atau tambah kembali.
        </p>
        <Button variant="outline" size="sm" onClick={() => onChange(defaultColumnConfig())}>
          <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      <div className="rounded-lg border border-gold-line/70 bg-background/40 p-3">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-medium">Preset kolom</h3>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="preset-load">Muat preset tersimpan</Label>
            <div className="flex gap-2">
              <Select value={activePreset} onValueChange={handleLoadPreset}>
                <SelectTrigger id="preset-load" className="h-9">
                  <SelectValue
                    placeholder={presets.length ? "Pilih preset…" : "Belum ada preset"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {presets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-destructive"
                disabled={!activePreset}
                onClick={handleDeletePreset}
                aria-label="Hapus preset"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="preset-name">Simpan susunan saat ini</Label>
            <div className="flex gap-2">
              <Input
                id="preset-name"
                value={presetName}
                placeholder="Nama preset, mis. Laporan Pajak"
                className="h-9"
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSavePreset();
                }}
              />
              <Button size="sm" className="h-9 shrink-0" onClick={handleSavePreset}>
                Simpan
              </Button>
            </div>
          </div>
        </div>
      </div>


      <ul className="space-y-2">
        {visible.map((col, index) => (
          <li
            key={col.key}
            className="flex items-center gap-2 rounded-lg border border-gold-line bg-card/60 p-2"
          >
            <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">{index + 1}</span>
            <Input
              value={col.label}
              onChange={(e) => update(col.key, { label: e.target.value })}
              aria-label={`Nama kolom ${col.label}`}
              className="h-9 min-w-0 flex-1"
            />
            <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
              {COLUMN_MAP.get(col.key)?.label}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={index === 0}
                onClick={() => move(col.key, -1)}
                aria-label="Naikkan kolom"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={index === visible.length - 1}
                onClick={() => move(col.key, 1)}
                aria-label="Turunkan kolom"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() =>
                  update(col.key, {
                    visible: false,
                    label: COLUMN_MAP.get(col.key)?.label ?? col.label,
                  })
                }
                aria-label="Hapus kolom"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {hidden.length > 0 ? (
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-muted-foreground" />
          <Select value="" onValueChange={add}>
            <SelectTrigger className="h-9 w-full sm:w-72">
              <SelectValue placeholder="Tambah kolom…" />
            </SelectTrigger>
            <SelectContent>
              {hidden.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {COLUMN_MAP.get(c.key)?.label ?? c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
