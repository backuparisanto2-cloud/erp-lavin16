import { useEffect, useState } from "react";

import { photoUrl } from "@/lib/inventory";

export function SignedImage({
  path,
  alt,
  className,
}: {
  path: string;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    photoUrl(path).then((next) => {
      if (active) setUrl(next);
    });
    return () => {
      active = false;
    };
  }, [path]);

  if (!url) {
    return <div className={`animate-pulse bg-muted ${className ?? ""}`} aria-hidden />;
  }

  return <img src={url} alt={alt} loading="lazy" className={className} />;
}
