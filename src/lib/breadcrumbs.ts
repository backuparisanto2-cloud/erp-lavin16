export type Crumb = { label: string; to?: string; search?: Record<string, unknown> };

const ROOT: Crumb = { label: "Ringkasan", to: "/" };

const STATIC: Record<string, Crumb[]> = {
  "/denah": [{ label: "Denah" }],
  "/tenant": [{ label: "Tenant & Pembayaran" }],
  "/kelola": [{ label: "Kelola Data" }],
  "/laporan": [{ label: "Laporan" }],
  "/pendapatan": [{ label: "Akuntansi" }, { label: "Pendapatan" }],
  "/pengeluaran": [{ label: "Akuntansi" }, { label: "Pengeluaran" }],
  "/jurnal": [{ label: "Akuntansi" }, { label: "Jurnal Umum" }],
  "/kamar": [{ label: "Barang Inventaris" }, { label: "Inventaris Kamar" }],
  "/fasilitas": [{ label: "Barang Inventaris" }, { label: "Inventaris Fasilitas Utama" }],
};

/**
 * Jejak halaman dari pathname aktif. `leafLabel` menimpa label bagian terakhir
 * untuk halaman dinamis (nomor kamar, nama tenant).
 */
export function buildCrumbs(pathname: string, leafLabel?: string): Crumb[] {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return [{ label: "Ringkasan" }];

  const segments = path.split("/").filter(Boolean);
  const base = `/${segments[0]}`;
  const trail: Crumb[] = [ROOT, ...(STATIC[base] ?? [{ label: segments[0]! }])];

  if (segments.length > 1) {
    const parent = trail[trail.length - 1];
    if (parent && !parent.to) {
      parent.to = base;
      if (base === "/kamar") parent.search = { lantai: 1 };
      if (base === "/fasilitas") parent.search = { q: undefined };
    }
    const fallback = base === "/kamar" ? `Kamar ${segments[1]}` : "Detail";
    trail.push({ label: leafLabel ?? fallback });
  } else if (leafLabel) {
    trail[trail.length - 1] = { label: leafLabel };
  }

  return trail.map((crumb, index) =>
    index === trail.length - 1 ? { label: crumb.label } : crumb,
  );
}
