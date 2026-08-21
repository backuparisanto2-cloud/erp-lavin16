import { ALL_COLUMNS, type ColumnConfig, type ColumnKey } from "@/lib/report-columns";

export type ColumnPreset = {
  id: string;
  name: string;
  columns: ColumnConfig[];
  savedAt: string;
};

const STORAGE_KEY = "lavin.report.column-presets.v1";

const VALID_KEYS = new Set<string>(ALL_COLUMNS.map((c) => c.key));

function sanitize(columns: unknown): ColumnConfig[] | null {
  if (!Array.isArray(columns)) return null;
  const cleaned: ColumnConfig[] = [];
  for (const raw of columns) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    if (typeof item['key'] !== "string" || !VALID_KEYS.has(item['key'])) continue;
    if (cleaned.some((c) => c.key === item['key'])) continue;
    cleaned.push({
      key: item['key'] as ColumnKey,
      label:
        typeof item['label'] === "string" && item['label'].trim()
          ? item['label']
          : (ALL_COLUMNS.find((c) => c.key === item['key'])?.label ?? item['key']),
      visible: item['visible'] !== false,
    });
  }
  if (!cleaned.length) return null;
  // pastikan semua kolom yang dikenal tetap ada (tersembunyi) agar bisa ditambah lagi
  for (const col of ALL_COLUMNS) {
    if (!cleaned.some((c) => c.key === col.key)) {
      cleaned.push({ key: col.key, label: col.label, visible: false });
    }
  }
  return cleaned;
}

export function loadPresets(): ColumnPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry): ColumnPreset | null => {
        if (!entry || typeof entry !== "object") return null;
        const item = entry as Record<string, unknown>;
        const columns = sanitize(item['columns']);
        if (!columns || typeof item['name'] !== "string") return null;
        return {
          id: typeof item['id'] === "string" ? item['id'] : crypto.randomUUID(),
          name: item['name'],
          columns,
          savedAt: typeof item['savedAt'] === "string" ? item['savedAt'] : new Date().toISOString(),
        };
      })
      .filter((p): p is ColumnPreset => p !== null);
  } catch {
    return [];
  }
}

function persist(presets: ColumnPreset[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function savePreset(name: string, columns: ColumnConfig[]): ColumnPreset[] {
  const trimmed = name.trim();
  if (!trimmed) return loadPresets();
  const presets = loadPresets();
  const existing = presets.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
  const snapshot = columns.map((c) => ({ ...c }));
  if (existing) {
    existing.columns = snapshot;
    existing.savedAt = new Date().toISOString();
  } else {
    presets.push({
      id: crypto.randomUUID(),
      name: trimmed,
      columns: snapshot,
      savedAt: new Date().toISOString(),
    });
  }
  persist(presets);
  return presets;
}

export function deletePreset(id: string): ColumnPreset[] {
  const next = loadPresets().filter((p) => p.id !== id);
  persist(next);
  return next;
}
