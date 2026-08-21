import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth";

/** Menyembunyikan kontrol hapus untuk level Employee. */
export function IfCanDelete({ children }: { children: ReactNode }) {
  const { canDelete } = useAuth();
  if (!canDelete) return null;
  return <>{children}</>;
}
