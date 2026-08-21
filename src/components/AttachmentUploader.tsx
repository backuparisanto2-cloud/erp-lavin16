import { useRef, useState } from "react";
import { FilePlus2, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SignedImage } from "@/components/SignedImage";
import { uploadAttachment } from "@/lib/expenses";
import { removePhoto } from "@/lib/inventory";

export function AttachmentUploader({
  folder,
  paths,
  onChange,
  onScan,
  scanning = false,
}: {
  folder: string;
  paths: string[];
  onChange: (next: string[]) => void;
  onScan?: (file: File) => void;
  scanning?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const added: string[] = [];
    try {
      for (const file of Array.from(files)) {
        added.push(...(await uploadAttachment(file, folder)));
        setLastFile(file);
      }
      if (added.length) {
        onChange([...paths, ...added]);
        toast.success(`${added.length} bukti diunggah (WebP, maks 300KB)`);
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Invoice / Kuitansi</p>
          <p className="text-[11px] text-muted-foreground">
            Foto atau PDF — otomatis jadi WebP maks 300KB.
          </p>
        </div>
        <div className="flex gap-2">
          {onScan ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={scanning || busy || !lastFile}
              onClick={() => lastFile && onScan(lastFile)}
            >
              {scanning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Isi form dengan AI
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FilePlus2 className="mr-2 h-4 w-4" />
            )}
            Unggah
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {paths.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {paths.map((path) => (
            <li key={path} className="relative">
              <SignedImage
                path={path}
                alt="Bukti pengeluaran"
                className="h-20 w-20 rounded-lg border border-gold-line object-cover"
              />
              <button
                type="button"
                aria-label="Hapus bukti"
                className="absolute -top-2 -right-2 rounded-full border border-gold-line bg-card p-1 text-destructive shadow-sm"
                onClick={async () => {
                  onChange(paths.filter((p) => p !== path));
                  await removePhoto(path);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Belum ada bukti.</p>
      )}
    </div>
  );
}
