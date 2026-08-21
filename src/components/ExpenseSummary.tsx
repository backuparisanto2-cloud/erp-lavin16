import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Receipt } from "lucide-react";

import { EXPENSE_CATEGORIES, expensesQuery, type Expense } from "@/lib/expenses";
import { formatRupiah } from "@/lib/inventory";

type Periode = "bulan" | "tahun" | "semua";

const PERIODE_LABEL: Record<Periode, string> = {
  bulan: "Bulan ini",
  tahun: "Tahun ini",
  semua: "Semua",
};

const BULAN_SINGKAT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function rupiah(value: number) {
  return formatRupiah(value) ?? "Rp 0";
}

export function ExpenseSummary() {
  const [periode, setPeriode] = useState<Periode>("bulan");
  const expenses = useQuery(expensesQuery);
  const rows = useMemo<Expense[]>(() => expenses.data ?? [], [expenses.data]);

  const now = new Date();
  const kunciBulanIni = monthKey(now);
  const tahunIni = String(now.getFullYear());

  const { totalBulanIni, totalTahunIni, totalSemua } = useMemo(() => {
    let bulan = 0;
    let tahun = 0;
    let semua = 0;
    for (const row of rows) {
      const key = row.expense_date.slice(0, 7);
      semua += row.amount;
      if (key.startsWith(tahunIni)) tahun += row.amount;
      if (key === kunciBulanIni) bulan += row.amount;
    }
    return { totalBulanIni: bulan, totalTahunIni: tahun, totalSemua: semua };
  }, [rows, kunciBulanIni, tahunIni]);

  const perBulan = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of rows) {
      const key = row.expense_date.slice(0, 7);
      totals.set(key, (totals.get(key) ?? 0) + row.amount);
    }
    const list: { key: string; label: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      list.push({
        key,
        label: `${BULAN_SINGKAT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
        total: totals.get(key) ?? 0,
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, kunciBulanIni]);

  const maksBulan = Math.max(1, ...perBulan.map((m) => m.total));

  const perKategori = useMemo(() => {
    const filtered = rows.filter((row) => {
      const key = row.expense_date.slice(0, 7);
      if (periode === "bulan") return key === kunciBulanIni;
      if (periode === "tahun") return key.startsWith(tahunIni);
      return true;
    });
    const total = filtered.reduce((a, r) => a + r.amount, 0);
    const data = EXPENSE_CATEGORIES.map((category) => {
      const items = filtered.filter((r) => r.category === category);
      return {
        category,
        total: items.reduce((a, r) => a + r.amount, 0),
        count: items.length,
      };
    });
    const lain = filtered.filter(
      (r) => !(EXPENSE_CATEGORIES as readonly string[]).includes(r.category),
    );
    if (lain.length) {
      const idx = data.findIndex((d) => d.category === "Lain-lain");
      if (idx >= 0) {
        data[idx]!.total += lain.reduce((a, r) => a + r.amount, 0);
        data[idx]!.count += lain.length;
      }
    }
    return { total, data: data.sort((a, b) => b.total - a.total) };
  }, [rows, periode, kunciBulanIni, tahunIni]);

  return (
    <div className="gold-card mt-4 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 font-display text-xl font-semibold">
          <Receipt className="h-5 w-5 text-gold" />
          Ringkasan Pengeluaran
        </h2>
        <Link
          to="/pengeluaran"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Lihat semua <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Bulan ini", value: totalBulanIni },
          { label: "Tahun ini", value: totalTahunIni },
          { label: "Total tercatat", value: totalSemua },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-gold-line p-4">
            <p className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
              {card.label}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
              {rupiah(card.value)}
            </p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Belum ada pengeluaran tercatat.{" "}
          <Link to="/pengeluaran" className="text-primary hover:underline">
            Tambah pengeluaran
          </Link>
          .
        </p>
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">12 bulan terakhir</h3>
            <ul className="mt-3 space-y-2">
              {perBulan.map((month) => (
                <li key={month.key} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {month.label}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent">
                    <div
                      className={`h-full rounded-full ${
                        month.key === kunciBulanIni ? "bg-gold" : "bg-primary"
                      }`}
                      style={{ width: `${(month.total / maksBulan) * 100}%` }}
                    />
                  </div>
                  <span className="w-28 text-right text-xs tabular-nums">
                    {rupiah(month.total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Per kategori</h3>
              <div className="inline-flex rounded-lg border border-gold-line p-0.5">
                {(Object.keys(PERIODE_LABEL) as Periode[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPeriode(key)}
                    className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                      periode === key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {PERIODE_LABEL[key]}
                  </button>
                ))}
              </div>
            </div>

            <ul className="mt-3 space-y-2">
              {perKategori.data.map((item) => {
                const persen = perKategori.total
                  ? Math.round((item.total / perKategori.total) * 100)
                  : 0;
                return (
                  <li
                    key={item.category}
                    className="rounded-lg border border-gold-line px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span>{item.category}</span>
                      <span className="tabular-nums">{rupiah(item.total)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-accent">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${persen}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {persen}% · {item.count} transaksi
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Total {PERIODE_LABEL[periode].toLowerCase()}: {rupiah(perKategori.total)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
