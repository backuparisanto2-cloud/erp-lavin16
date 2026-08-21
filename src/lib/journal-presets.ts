import {
  ALL_JOURNAL_COLUMNS,
  type JournalColumnConfig,
  type JournalColumnKey,
} from "@/lib/journal-columns";

export type JournalPresetItem = {
  id: string;
  name: string;
  columns: JournalColumnConfig[];
  savedAt: string;
};

const STORAGE_KEY = "lavin.journal.column-presets.v1";

const VALID_KEYS = new Set<string>(ALL_JOURNAL_COLUMNS.map((c) => c.key));

function sanitize(columns: unknown): JournalColumnConfig[] | null {
  if (!Array.isArray(columns)) return null;
  const cleaned: JournalColumnConfig[] = [];
  for (const raw of columns) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const key = item['key'];
    if (typeof key !== "string" || !VALID_KEYS.has(key)) continue;
    if (cleaned.some((c) => c.key === key)) continue;
    const fallback = ALL_JOURNAL_COLUMNS.find((c) => c.key === key)?.label ?? key;
    cleaned.push({
      key: key as JournalColumnKey,
      label:
        typeof item['label'] === "string" && item['label'].trim() ? (item['label'] as string) : fallback,
      visible: item['visible'] !== false,
    });
  }
  if (!cleaned.length) return null;
  for (const col of ALL_JOURNAL_COLUMNS) {
    if (!cleaned.some((c) => c.key === col.key)) {
      cleaned.push({ key: col.key, label: col.label, visible: false });
    }
  }
  return cleaned;
}

export function loadJournalPresets(): JournalPresetItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry): JournalPresetItem | null => {
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
      .filter((p): p is JournalPresetItem => p !== null);
  } catch {
    return [];
  }
}

function persist(presets: JournalPresetItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function saveJournalPreset(name: string, columns: JournalColumnConfig[]): JournalPresetItem[] {
  const trimmed = name.trim();
  if (!trimmed) return loadJournalPresets();
  const presets = loadJournalPresets();
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

export function deleteJournalPreset(id: string): JournalPresetItem[] {
  const next = loadJournalPresets().filter((p) => p.id !== id);
  persist(next);
  return next;
}
