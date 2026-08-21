import type { Expense } from "@/lib/expenses";
import type { Income, OtherIncome } from "@/lib/income";

export type JournalKind = "Pendapatan" | "Pengeluaran";

export type JournalEntry = {
  id: string;
  refId: string;
  date: string;
  description: string;
  kind: JournalKind;
  category: string;
  source: string;
  method: string | null;
  notes: string | null;
  attachments: string[];
  amount: number;
};

export function buildJournal(
  incomes: Income[],
  others: OtherIncome[],
  expenses: Expense[],
): JournalEntry[] {
  const entries: JournalEntry[] = [];

  for (const income of incomes) {
    entries.push({
      id: `income-${income.id}`,
      refId: income.id,
      date: income.payment_date,
      description: `Sewa kamar ${income.room_number ?? "-"} — ${income.tenant_name}`,
      kind: "Pendapatan",
      category: "Sewa Kamar",
      source: "Pendapatan Kost",
      method: income.payment_method,
      notes: income.notes,
      attachments: income.attachments ?? [],
      amount: income.amount || 0,
    });
  }

  for (const other of others) {
    entries.push({
      id: `other-${other.id}`,
      refId: other.id,
      date: other.income_date,
      description: other.name,
      kind: "Pendapatan",
      category: "Pendapatan Lain",
      source: "Pendapatan Lain-lain",
      method: other.payment_method,
      notes: other.description ?? other.payer,
      attachments: other.attachments ?? [],
      amount: other.amount || 0,
    });
  }

  for (const expense of expenses) {
    entries.push({
      id: `expense-${expense.id}`,
      refId: expense.id,
      date: expense.expense_date,
      description: expense.name,
      kind: "Pengeluaran",
      category: expense.category,
      source: "Pengeluaran",
      method: expense.location ?? expense.vendor,
      notes: expense.notes,
      attachments: expense.attachments ?? [],
      amount: expense.amount || 0,
    });
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date) || a.description.localeCompare(b.description, "id"));
}

export function journalTotals(entries: JournalEntry[]) {
  let pendapatan = 0;
  let pengeluaran = 0;
  for (const entry of entries) {
    if (entry.kind === "Pendapatan") pendapatan += entry.amount;
    else pengeluaran += entry.amount;
  }
  return { pendapatan, pengeluaran, saldo: pendapatan - pengeluaran };
}

export type JournalMonth = {
  month: string;
  pendapatan: number;
  pengeluaran: number;
  saldo: number;
  count: number;
};

export function journalByMonth(entries: JournalEntry[]): JournalMonth[] {
  const map = new Map<string, JournalMonth>();
  for (const entry of entries) {
    const month = entry.date.slice(0, 7);
    let row = map.get(month);
    if (!row) {
      row = { month, pendapatan: 0, pengeluaran: 0, saldo: 0, count: 0 };
      map.set(month, row);
    }
    if (entry.kind === "Pendapatan") row.pendapatan += entry.amount;
    else row.pengeluaran += entry.amount;
    row.saldo = row.pendapatan - row.pengeluaran;
    row.count += 1;
  }
  return [...map.values()].sort((a, b) => b.month.localeCompare(a.month));
}

export type JournalRange = { from: string; to: string };

function iso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const JOURNAL_PRESETS = [
  { key: "semua", label: "Semua" },
  { key: "bulan-ini", label: "Bulan ini" },
  { key: "bulan-lalu", label: "Bulan lalu" },
  { key: "tahun-ini", label: "Tahun ini" },
  { key: "kustom", label: "Kustom" },
] as const;

export type JournalPreset = (typeof JOURNAL_PRESETS)[number]["key"];

export function presetRange(preset: JournalPreset, now = new Date()): JournalRange {
  if (preset === "bulan-ini") {
    return {
      from: iso(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }
  if (preset === "bulan-lalu") {
    return {
      from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: iso(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (preset === "tahun-ini") {
    return {
      from: iso(new Date(now.getFullYear(), 0, 1)),
      to: iso(new Date(now.getFullYear(), 11, 31)),
    };
  }
  return { from: "", to: "" };
}
