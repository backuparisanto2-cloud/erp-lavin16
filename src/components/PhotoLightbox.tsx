import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SignedImage } from "@/components/SignedImage";

export function PhotoLightbox({
  paths,
  title,
  trigger,
}: {
  paths: string[];
  title: string;
  trigger: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto border-gold-line">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {paths.map((path) => (
            <SignedImage
              key={path}
              path={path}
              alt={title}
              className="w-full rounded-lg border border-gold-line object-contain"
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
