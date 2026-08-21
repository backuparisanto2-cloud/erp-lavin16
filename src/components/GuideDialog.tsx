import { useState, type ReactNode } from "react";
import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const sections: { title: string; steps: string[] }[] = [
  {
    title: "Kamar & Fasilitas",
    steps: [
      "Buka menu Kamar untuk melihat seluruh kamar, lalu pilih kamar untuk mengelola barangnya.",
      "Menu Fasilitas Utama berisi barang bersama seperti air, listrik, dan dapur.",
      "Setiap barang otomatis memperoleh kode inventaris begitu tanggal pembelian diisi.",
    ],
  },
  {
    title: "Kode inventaris",
    steps: [
      "Format kode: 3 huruf nama barang - tanggal beli (ddmmyy) - nomor urut, contoh KSR-210826-01.",
      "Kode dibuat otomatis dan unik; ubah nama atau tanggal beli maka kode ikut diperbarui.",
      "Kode tampil di kartu barang, form, laporan, serta hasil ekspor Excel dan PDF.",
    ],
  },
  {
    title: "Tenant & Akuntansi",
    steps: [
      "Menu Tenant & Pembayaran untuk data penghuni, kontak darurat, dan riwayat pembayaran.",
      "Menu Akuntansi memuat Pendapatan, Pengeluaran, dan Jurnal Umum.",
      "Laporan merangkum nilai inventaris dan bisa diekspor sesuai kolom yang dipilih.",
    ],
  },
];

export function GuideDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="icon" aria-label="Buka panduan" className="h-11 w-11">
            <HelpCircle className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[88dvh] max-w-lg overflow-y-auto border-gold-line">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-2xl">Panduan penggunaan</DialogTitle>
          <DialogDescription>
            Ringkasan cara memakai aplikasi inventaris Lavin Kost.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.title} className="space-y-2">
              <h2 className="text-sm font-semibold tracking-tight">{section.title}</h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {section.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
