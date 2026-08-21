import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SignedImage } from "@/components/SignedImage";
import { removePhoto, uploadPhoto } from "@/lib/inventory";

export function PhotoUploader({
  label,
  hint,
  folder,
  paths,
  onChange,
  deleteOnRemove = true,
}: {
  label: string;
  hint?: string;
  folder: string;
  paths: string[];
  onChange: (next: string[]) => void;
  deleteOnRemove?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const added: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} bukan gambar`);
          continue;
        }
        added.push(await uploadPhoto(file, folder));
      }
      if (added.length) {
        onChange([...paths, ...added]);
        toast.success(`${added.length} foto diunggah (WebP, maks 300KB)`);
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
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-gold-line"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="mr-2 h-4 w-4" />
          )}
          Unggah
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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
                alt={label}
                className="h-20 w-20 rounded-lg border border-gold-line object-cover"
              />
              <button
                type="button"
                aria-label="Hapus foto"
                className="absolute -top-2 -right-2 rounded-full border border-gold-line bg-card p-1 text-destructive shadow-sm"
                onClick={async () => {
                  onChange(paths.filter((p) => p !== path));
                  if (deleteOnRemove) await removePhoto(path);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Belum ada foto.</p>
      )}
    </div>
  );
}
