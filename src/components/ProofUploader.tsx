import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FilePlus2, Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SignedImage } from "@/components/SignedImage";
import { uploadAttachment } from "@/lib/expenses";
import { removePhoto } from "@/lib/inventory";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];

type Status = "menunggu" | "mengunggah" | "berhasil" | "gagal";
type Entry = { id: string; name: string; status: Status; message?: string; file: File };

function isAllowed(file: File) {
  const name = file.name.toLowerCase();
  if (ALLOWED.includes(file.type)) return true;
  return /\.(jpe?g|png|webp|heic|heif|pdf)$/.test(name);
}

export function ProofUploader({
  folder,
  paths,
  onChange,
  label = "Bukti transfer",
  hint = "JPG, PNG, WEBP, HEIC, atau PDF — maksimum 10MB per file.",
}: {
  folder: string;
  paths: string[];
  onChange: (next: string[]) => void;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);

  function patch(id: string, next: Partial<Entry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...next } : e)));
  }

  async function uploadOne(entry: Entry, current: string[]): Promise<string[]> {
    patch(entry.id, { status: "mengunggah" });
    try {
      const added = await uploadAttachment(entry.file, folder);
      patch(entry.id, { status: "berhasil" });
      return [...current, ...added];
    } catch (error) {
      patch(entry.id, { status: "gagal", message: (error as Error).message });
      return current;
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const accepted: Entry[] = [];
    for (const file of Array.from(files)) {
      if (!isAllowed(file)) {
        toast.error(`${file.name} ditolak: hanya gambar (JPG/PNG/WEBP/HEIC) atau PDF`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(
          `${file.name} ditolak: ${(file.size / 1024 / 1024).toFixed(1)}MB melebihi batas 10MB`,
        );
        continue;
      }
      accepted.push({
        id: `${file.name}-${file.size}-${Date.now()}-${accepted.length}`,
        name: file.name,
        status: "menunggu",
        file,
      });
    }
    if (inputRef.current) inputRef.current.value = "";
    if (!accepted.length) return;

    setEntries((prev) => [...prev, ...accepted]);
    setBusy(true);
    let next = paths;
    for (const entry of accepted) next = await uploadOne(entry, next);
    setBusy(false);
    if (next.length !== paths.length) {
      onChange(next);
      toast.success(`${next.length - paths.length} bukti diunggah`);
    }
  }

  async function retry(entry: Entry) {
    setBusy(true);
    const next = await uploadOne(entry, paths);
    setBusy(false);
    if (next.length !== paths.length) onChange(next);
  }

  const isPdfPage = (path: string) => /pdf/i.test(path) || /-p\d+\./i.test(path);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
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

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {entries.length > 0 ? (
        <ul className="space-y-1">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-2 rounded-md border border-gold-line bg-card/60 px-2 py-1 text-[11px]"
            >
              <span className="flex min-w-0 items-center gap-2">
                {entry.status === "mengunggah" ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                ) : entry.status === "berhasil" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : entry.status === "gagal" ? (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
                )}
                <span className="truncate">{entry.name}</span>
              </span>
              <span className="flex items-center gap-2">
                <span
                  className={
                    entry.status === "gagal" ? "text-destructive" : "text-muted-foreground"
                  }
                >
                  {entry.status === "gagal" ? (entry.message ?? "gagal") : entry.status}
                </span>
                {entry.status === "gagal" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    disabled={busy}
                    onClick={() => void retry(entry)}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" /> Coba lagi
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {paths.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {paths.map((path) => (
            <li key={path} className="relative">
              {isPdfPage(path) ? (
                <div className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-gold-line bg-card/60 p-1 text-center text-[10px] text-muted-foreground">
                  <SignedImage
                    path={path}
                    alt="Pratinjau dokumen"
                    className="h-12 w-full rounded object-cover"
                  />
                  <span className="mt-1">Halaman dokumen</span>
                </div>
              ) : (
                <SignedImage
                  path={path}
                  alt={label}
                  className="h-20 w-20 rounded-lg border border-gold-line object-cover"
                />
              )}
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
