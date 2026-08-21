import { FileDown, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ExportButtons({
  onExport,
  disabled,
  label,
}: {
  onExport: (format: "pdf" | "excel") => Promise<void>;
  disabled?: boolean;
  label?: string;
}) {
  const [busy, setBusy] = useState<"pdf" | "excel" | null>(null);

  const run = async (format: "pdf" | "excel") => {
    setBusy(format);
    try {
      await onExport(format);
      toast.success(`${label ?? "Riwayat"} diekspor ke ${format === "pdf" ? "PDF" : "Excel"}.`);
    } catch (error) {
      toast.error((error as Error).message || "Gagal mengekspor data.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || busy !== null}
        onClick={() => void run("pdf")}
      >
        <FileDown className="mr-1 h-4 w-4" /> {busy === "pdf" ? "Menyiapkan…" : "Ekspor PDF"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || busy !== null}
        onClick={() => void run("excel")}
      >
        <FileSpreadsheet className="mr-1 h-4 w-4" />
        {busy === "excel" ? "Menyiapkan…" : "Ekspor Excel"}
      </Button>
    </div>
  );
}
