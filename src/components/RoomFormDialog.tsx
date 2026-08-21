import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RoomPayload } from "@/lib/inventory";

export function RoomFormDialog({
  trigger,
  title,
  description,
  initial,
  onSubmit,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  initial?: Partial<RoomPayload>;
  onSubmit: (payload: RoomPayload) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [number, setNumber] = useState(initial?.number ?? "");
  const [floor, setFloor] = useState(String(initial?.floor ?? 1));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  async function submit() {
    if (!number.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        number: number.trim(),
        floor: Number(floor) || 0,
        notes: notes.trim() || null,
      });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-number">Nomor kamar</Label>
            <Input
              id="room-number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Misal: 101"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="room-floor">Lantai</Label>
            <Input
              id="room-floor"
              type="number"
              inputMode="numeric"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Gunakan 0 untuk rooftop / area khusus.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="room-notes">Catatan</Label>
            <Textarea
              id="room-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={submit} disabled={saving || !number.trim()}>
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
