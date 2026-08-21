import type { ReactNode } from "react";
import { Minus, Plus, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConditionBadge } from "@/components/ConditionBadge";
import { SignedImage } from "@/components/SignedImage";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { formatRupiah, warrantyStatus } from "@/lib/inventory";

export function InventoryItemCard({
  name,
  code,
  condition,
  quantity,
  notes,
  meta,
  brand,
  serialNumber,
  vendor,
  purchasePrice,
  warrantyUntil,
  photos,
  receipts,
  onQuantityChange,
  actions,
}: {
  name: string;
  code?: string | null;
  condition: string;
  quantity: number;
  notes?: string | null;
  meta?: string | null;
  brand?: string | null;
  serialNumber?: string | null;
  vendor?: string | null;
  purchasePrice?: number | null;
  warrantyUntil?: string | null;
  photos: string[];
  receipts: string[];
  onQuantityChange: (next: number) => void;
  actions: ReactNode;
}) {
  const warranty = warrantyStatus(warrantyUntil);
  const price = formatRupiah(purchasePrice);
  const cover = photos[0];

  return (
    <li className="gold-card rounded-xl p-3 sm:p-4">
      <div className="flex gap-3">
        {cover ? (
          <PhotoLightbox
            paths={photos}
            title={name}
            trigger={
              <button type="button" className="shrink-0" aria-label={`Lihat foto ${name}`}>
                <SignedImage
                  path={cover}
                  alt={name}
                  className="h-16 w-16 rounded-lg border border-gold-line object-cover"
                />
              </button>
            }
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 truncate font-medium">{name}</p>
            <ConditionBadge condition={condition} />
          </div>

          {code ? (
            <p className="mt-1 font-mono text-[11px] tracking-wide text-gold">{code}</p>
          ) : null}

          {meta ? <p className="mt-1 text-xs text-muted-foreground">{meta}</p> : null}

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {brand ? <span className="truncate">Merk: {brand}</span> : null}
            {serialNumber ? <span className="truncate">SN: {serialNumber}</span> : null}
            {vendor ? <span className="truncate">Vendor: {vendor}</span> : null}
            {price ? <span className="text-foreground">{price}</span> : null}
            {warranty ? (
              <span
                className={
                  warranty.tone === "expired"
                    ? "text-destructive"
                    : warranty.tone === "soon"
                      ? "text-warning"
                      : "text-success"
                }
              >
                {warranty.label}
              </span>
            ) : null}
          </div>

          {notes ? <p className="mt-1 text-xs text-muted-foreground">{notes}</p> : null}

          {receipts.length > 0 ? (
            <PhotoLightbox
              paths={receipts}
              title={`Nota ${name}`}
              trigger={
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-gold hover:underline"
                >
                  <Receipt className="h-3.5 w-3.5" /> {receipts.length} nota/kuitansi
                </button>
              }
            />
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-gold-line pt-3">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            aria-label={`Kurangi ${name}`}
            className="h-11 w-11 border-gold-line"
            disabled={quantity <= 0}
            onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-10 text-center text-base font-semibold tabular-nums">{quantity}</span>
          <Button
            size="icon"
            variant="outline"
            aria-label={`Tambah ${name}`}
            className="h-11 w-11 border-gold-line"
            onClick={() => onQuantityChange(quantity + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">{actions}</div>
      </div>
    </li>
  );
}
