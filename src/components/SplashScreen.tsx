import { useEffect, useState } from "react";

const STORAGE_KEY = "lavin-splash-shown";

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(STORAGE_KEY) === "1") return;
    window.sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(true);
    const fade = window.setTimeout(() => setLeaving(true), 1800);
    const hide = window.setTimeout(() => setVisible(false), 2400);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label="Memuat aplikasi inventaris Lavin Kost Purwokerto"
      onClick={() => setLeaving(true)}
      className={`fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-background transition-opacity duration-700 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,color-mix(in_oklab,var(--color-primary)_10%,transparent)_0%,transparent_65%)]" />

      <div className="relative flex flex-col items-center px-8 text-center">
        <img
          src="/app-icon-192.png"
          alt=""
          width={72}
          height={72}
          className="h-16 w-16 rounded-2xl border border-gold-line bg-card p-1.5 shadow-sm sm:h-[4.5rem] sm:w-[4.5rem]"
        />
        <h1 className="mt-6 font-display text-2xl leading-tight font-light tracking-[0.05em] text-foreground text-balance sm:text-3xl">
          Lavin Kost Purwokerto
        </h1>
        <div className="mt-5 flex items-center gap-3">
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-primary sm:w-16" />
          <span className="h-1.5 w-1.5 rotate-45 bg-primary" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-primary sm:w-16" />
        </div>
        <p className="mt-5 text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
          Sistem Inventaris &amp; Manajemen Hunian
        </p>
        <div className="mt-9 h-0.5 w-32 overflow-hidden rounded-full bg-muted sm:w-40">
          <div className="h-full w-1/3 animate-[splash-bar_1.6s_ease-in-out_infinite] bg-primary" />
        </div>
      </div>
    </div>
  );
}
