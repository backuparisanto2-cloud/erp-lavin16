# Admin Akses, Impor/Ekspor CSV, Notifikasi, Audit, Filter Jurnal

Lima pekerjaan yang diminta, dibangun di atas struktur yang sudah ada (peran admin/owner/finance/employee, audit log tabel data, halaman Pengguna, dashboard).

## 1. Halaman admin: role & hak akses per modul

Halaman baru `/akses` (hanya untuk admin/owner), berisi matriks: baris = peran, kolom = modul (Dashboard, Kamar, Fasilitas, Tenant, Pendapatan, Pengeluaran, Jurnal, Laporan, Denah, Kelola, Pengguna, Audit, Notifikasi). Tiap sel punya centang: Lihat, Tambah, Ubah, Hapus.

- Izin disimpan di tabel baru `role_permissions`; peran tanpa baris memakai nilai bawaan saat ini (admin/owner/finance penuh, employee tanpa hapus).
- Menu di sidebar dan tombol aksi otomatis menyembunyikan modul yang tidak diizinkan; pemeriksaan sesungguhnya tetap di database lewat RLS/fungsi `can_delete` yang diperluas agar membaca tabel izin.
- Halaman Pengguna tetap untuk membuat akun dan menetapkan peran; halaman Akses hanya mengatur apa yang boleh dilakukan tiap peran.

## 2. Impor & ekspor CSV kamar dan unit barang

- Tombol "Ekspor CSV" dan "Impor CSV" di halaman Kamar dan Fasilitas (juga daftar barang per kamar).
- Ekspor memakai kolom yang sama dengan format impor, sehingga hasil ekspor bisa diedit lalu diunggah kembali.
- Impor menampilkan pratinjau: baris valid, baris bermasalah beserta alasan, dan pilihan "tambah baru" vs "perbarui bila kode/nomor sudah ada". Data hanya tersimpan setelah dikonfirmasi.
- Tersedia unduhan template CSV kosong.

## 3. Notifikasi dalam aplikasi + riwayat

- Tabel `notifications` (judul, pesan, jenis, tautan, penerima, status dibaca).
- Lonceng notifikasi di header dengan jumlah belum dibaca, daftar terbaru, tandai dibaca / tandai semua dibaca, dan halaman `/notifikasi` untuk riwayat lengkap dengan filter.
- Pemicu otomatis: perubahan status tenant (masuk/keluar/pindah kamar), jatuh tempo pembayaran, perubahan kondisi barang menjadi Rusak/Perbaikan, penugasan pengguna, dan pembuatan/penghapusan pengguna.
- Notifikasi masuk realtime tanpa perlu memuat ulang halaman.

## 4. Audit log: login dan aksi kamar/unit

Audit log data sudah berjalan untuk seluruh tabel. Tambahannya:

- Catat peristiwa login berhasil, login gagal, dan logout (waktu, email, peran).
- Catat aksi kamar/unit secara lebih ramah dibaca: ringkasan "Kamar 201 — kondisi Kasur diubah dari Baik ke Rusak" alih-alih hanya daftar nama kolom.
- Halaman Audit mendapat filter tambahan "Jenis peristiwa" (Data / Login / Sistem) dan tampilan detail per baris (nilai lama vs baru).

## 5. Periode jurnal di dashboard mengikuti pilihan tanggal

Kartu Jurnal Umum di dashboard saat ini selalu menghitung seluruh data. Akan ditambahkan pemilih periode di dashboard (Semua, Bulan ini, Bulan lalu, Tahun ini, Kustom — sama seperti halaman Jurnal), dan angka Pendapatan/Pengeluaran/Saldo mengikuti pilihan tersebut. Pilihan periode tersimpan di URL agar bisa dibagikan dan bertahan saat halaman dimuat ulang.

## Catatan teknis

- Migrasi database: `role_permissions` (peran + modul + izin), `notifications` (+ indeks penerima/dibaca), penambahan kolom kategori peristiwa pada `audit_logs`, trigger notifikasi untuk tenant/barang, RLS + GRANT untuk semua tabel baru.
- `can_delete()` dan pemeriksaan izin diarahkan ke fungsi `has_permission(user, modul, aksi)` bertipe security definer.
- Login/logout dicatat lewat server function yang dipanggil dari alur autentikasi, karena skema `auth` tidak boleh disentuh trigger.
- Impor CSV diproses di server function dengan validasi Zod dan penulisan massal; parsing di sisi klien untuk pratinjau.
- Realtime notifikasi memakai langganan Supabase pada tabel `notifications`.

## Urutan pengerjaan

1. Migrasi database (izin, notifikasi, audit, trigger).
2. Halaman Akses + penerapan izin di menu/aksi.
3. Notifikasi (lonceng, halaman riwayat, pemicu).
4. Audit login + tampilan audit yang lebih rinci.
5. Impor/ekspor CSV kamar dan unit barang.
6. Filter periode jurnal di dashboard.
