# Impor ERP Lavin dari GitHub

Repo `backuparisanto2-cloud/erp-lavin-15` publik dan memakai stack yang sama persis dengan project ini (TanStack Start + Tailwind + shadcn + Supabase), jadi isinya bisa disalin utuh ke sini.

## Apa yang akan dibangun

Aplikasi ERP kos/properti dengan halaman:
- Beranda, Kamar (daftar + detail per nomor), Tenant (daftar + detail)
- Pendapatan, Pengeluaran, Jurnal, Laporan
- Denah, Fasilitas, Kelola, Pengguna, Audit
- Login, splash screen, upload foto/lampiran, ekspor data

## Langkah

1. Unduh isi repo (branch `main`) ke project ini.
2. Salin seluruh `src/` (routes, components, hooks, lib, integrations, styles), `public/`, dan file konfigurasi (`components.json`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`) — menimpa placeholder index dan template bawaan.
3. Samakan dependency di `package.json` lalu install.
4. Aktifkan Lovable Cloud (backend project ini sendiri), lalu jalankan ulang 5 file migrasi SQL dari repo agar tabel, RLS, grant, storage bucket, dan data awal terbentuk di backend baru.
5. Regenerasi kredensial/klien backend milik project ini (file `.env` dan `src/integrations/supabase/*` dari repo lama tidak dipakai — kunci lama tidak berlaku di sini).
6. Cek build, buka preview, perbaiki error impor/tipe yang muncul.

## Catatan teknis

- Data isi database repo lama TIDAK ikut (hanya skema + seed yang ada di migrasi). Jika butuh data produksi lama, perlu ekspor terpisah.
- Akun login lama tidak ikut; perlu daftar user baru di backend project ini.
- Jika ada secret khusus (API pihak ketiga) di `.env` repo lama, perlu dimasukkan ulang secara manual.
- Metadata head per halaman akan dicek agar judul/deskripsi sesuai aplikasi ini.
