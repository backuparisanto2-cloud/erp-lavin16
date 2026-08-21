import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  ImageUp,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ALL_JOURNAL_COLUMNS,
  JOURNAL_COLUMN_MAP,
  defaultJournalColumns,
  matchJournalColumn,
  type JournalColumnConfig,
  type JournalColumnKey,
} from "@/lib/journal-columns";
import {
  deleteJournalPreset,
  loadJournalPresets,
  saveJournalPreset,
  type JournalPresetItem,
} from "@/lib/journal-presets";
import { scanJournalFormat } from "@/lib/journal-format-ai.functions";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membaca gambar."));
    reader.readAsDataURL(file);
  });
}

export function JournalColumnEditor({
  columns,
  onChange,
  onTitleDetected,
  onTotalsDetected,
}: {
  columns: JournalColumnConfig[];
  onChange: (next: JournalColumnConfig[]) => void;
  onTitleDetected?: (title: string) => void;
  onTotalsDetected?: (includeTotals: boolean) => void;
}) {
  const visible = columns.filter((c) => c.visible);
  const hidden = columns.filter((c) => !c.visible);

  const [presets, setPresets] = useState<JournalPresetItem[]>([]);
  const [presetName, setPresetName] = useState("");
  const [activePreset, setActivePreset] = useState("");
  const [scanning, setScanning] = useState(false);
  const [unmapped, setUnmapped] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPresets(loadJournalPresets());
  }, []);

  function handleSavePreset() {
    const name = presetName.trim();
    if (!name) {
      toast.error("Beri nama preset terlebih dahulu.");
      return;
    }
    const next = saveJournalPreset(name, columns);
    setPresets(next);
    setActivePreset(next.find((p) => p.name.toLowerCase() === name.toLowerCase())?.id ?? "");
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
    setPresets(deleteJournalPreset(preset.id));
    setActivePreset("");
    toast.success(`Preset "${preset.name}" dihapus.`);
  }

  function move(key: JournalColumnKey, delta: number) {
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

  function update(key: JournalColumnKey, patch: Partial<JournalColumnConfig>) {
    onChange(columns.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  function add(key: string) {
    const target = columns.find((c) => c.key === key);
    if (!target) return;
    onChange([...columns.filter((c) => c.key !== key), { ...target, visible: true }]);
  }

  async function handleImage(file: File | undefined) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 8MB.");
      return;
    }
    setScanning(true);
    setUnmapped([]);
    try {
      const imageDataUrl = await readAsDataUrl(file);
      const result = await scanJournalFormat({
        data: {
          imageDataUrl,
          availableColumns: ALL_JOURNAL_COLUMNS.map((c) => ({ key: c.key, label: c.label })),
        },
      });

      const used = new Set<JournalColumnKey>();
      const next: JournalColumnConfig[] = [];
      const missed: string[] = [];

      for (const col of result.columns) {
        let key = (col.mapTo as JournalColumnKey | null) ?? null;
        if (key && used.has(key)) key = null;
        if (!key) {
          const guess = matchJournalColumn(col.header);
          key = guess && !used.has(guess) ? guess : null;
        }
        if (!key) {
          missed.push(col.header);
          continue;
        }
        used.add(key);
        next.push({ key, label: col.header, visible: true });
      }

      if (!next.length) {
        toast.error("Kolom pada gambar tidak dikenali. Susunan saat ini tetap dipakai.");
        return;
      }

      for (const def of ALL_JOURNAL_COLUMNS) {
        if (!used.has(def.key)) next.push({ key: def.key, label: def.label, visible: false });
      }

      onChange(next);
      setUnmapped(missed);
      if (result.title) onTitleDetected?.(result.title);
      onTotalsDetected?.(result.includeTotals);
      toast.success(`Format Excel ditiru: ${next.filter((c) => c.visible).length} kolom.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI gagal membaca gambar.");
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Atur kolom sebelum ekspor: urutkan, ganti nama, hapus, atau tambah kembali.
        </p>
        <Button variant="outline" size="sm" onClick={() => onChange(defaultJournalColumns())}>
          <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      <div className="rounded-lg border border-gold-line/70 bg-background/40 p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-medium">Tiru format Excel dari gambar</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Unggah tangkapan layar jurnal Excel Anda. AI akan menyalin nama dan urutan kolomnya ke
          susunan di bawah — masih bisa dikoreksi manual.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleImage(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={scanning}
          onClick={() => fileRef.current?.click()}
        >
          {scanning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ImageUp className="mr-2 h-4 w-4" />
          )}
          {scanning ? "Membaca gambar…" : "Unggah gambar format"}
        </Button>
        {unmapped.length > 0 ? (
          <p className="mt-2 text-xs text-destructive">
            Kolom belum bisa dipetakan: {unmapped.join(", ")}. Tambahkan manual dari daftar kolom di
            bawah.
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-gold-line/70 bg-background/40 p-3">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-medium">Preset kolom</h3>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="jurnal-preset-load">Muat preset tersimpan</Label>
            <div className="flex gap-2">
              <Select value={activePreset} onValueChange={handleLoadPreset}>
                <SelectTrigger id="jurnal-preset-load" className="h-9">
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
            <Label htmlFor="jurnal-preset-name">Simpan susunan saat ini</Label>
            <div className="flex gap-2">
              <Input
                id="jurnal-preset-name"
                value={presetName}
                placeholder="Nama preset, mis. Format Bank"
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
            <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">
              {index + 1}
            </span>
            <Input
              value={col.label}
              onChange={(e) => update(col.key, { label: e.target.value })}
              aria-label={`Nama kolom ${col.label}`}
              className="h-9 min-w-0 flex-1"
            />
            <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
              {JOURNAL_COLUMN_MAP.get(col.key)?.label}
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
                    label: JOURNAL_COLUMN_MAP.get(col.key)?.label ?? col.label,
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
                  {JOURNAL_COLUMN_MAP.get(c.key)?.label ?? c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
