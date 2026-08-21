import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  LayoutDashboard,
  DoorClosed,
  Boxes,
  Wrench,
  FileBarChart,
  Wallet,
  Coins,
  Map,
  Users,
  Settings,


  Menu,
  Type,
  Calculator,
  ChevronDown,
  ChevronRight,
  ScrollText,
  ExternalLink,
  LogOut,
  UserCog,
  History,
  Bell,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { GuideDialog } from "@/components/GuideDialog";
import { buildCrumbs } from "@/lib/breadcrumbs";
import { TEXT_SIZES, useTextSize } from "@/lib/text-size";
import { LoginScreen } from "@/components/LoginScreen";
import { ROLE_LABELS, useAuth } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";
import { usePermissions, type ModuleKey } from "@/lib/permissions";

const nav = [
  { to: "/", label: "Ringkasan", icon: LayoutDashboard, module: "dashboard" },
  { to: "/denah", label: "Denah", icon: Map, module: "denah" },
  { to: "/tenant", label: "Tenant & Pembayaran", icon: Users, module: "tenant" },
  { to: "/kelola", label: "Kelola Data", icon: Settings, module: "kelola" },
  { to: "/laporan", label: "Laporan", icon: FileBarChart, module: "laporan" },
] as const satisfies readonly { to: string; label: string; icon: typeof Map; module: ModuleKey }[];


const accounting = [
  { to: "/pendapatan", label: "Pendapatan", icon: Coins, module: "pendapatan" },
  { to: "/pengeluaran", label: "Pengeluaran", icon: Wallet, module: "pengeluaran" },
  { to: "/jurnal", label: "Jurnal Umum", icon: BookOpen, module: "jurnal" },
] as const satisfies readonly { to: string; label: string; icon: typeof Coins; module: ModuleKey }[];

const SOP_BASE = "https://lavin-rules-simplified.lovable.app/";

const sopSections = [
  { hash: "", label: "Buka Semua SOP" },
  { hash: "penerimaan", label: "1. Penerimaan Tenant" },
  { hash: "internet", label: "2. Penggunaan Internet (Wi-Fi)" },
  { hash: "penyimpanan", label: "3. Penyimpanan Barang & Kendaraan" },
  { hash: "fasilitas", label: "4. Fasilitas Bersama" },
  { hash: "air-listrik", label: "5. Penggunaan Air & Listrik" },
  { hash: "komplain", label: "6. Komplain Fasilitas" },
  { hash: "paket", label: "7. Penerimaan Barang & Paket" },
  { hash: "darurat", label: "8. Keadaan Darurat" },
  { hash: "apar", label: "9. Penggunaan APAR" },
  { hash: "kunjungan", label: "10. Kunjungan Tamu" },
  { hash: "ketertiban", label: "11. Ketertiban & Ketenangan" },
  { hash: "ketentuan", label: "12. Ketentuan Umum" },
  { hash: "pernyataan", label: "Pernyataan Kepatuhan" },
  { hash: "pendaftaran", label: "Pendaftaran Calon Penghuni" },
] as const;

const sopUrl = (hash: string) => (hash ? `${SOP_BASE}#${hash}` : SOP_BASE);

function TextSizeControl({ compact = false }: { compact?: boolean }) {
  const { size, setSize } = useTextSize();
  return (
    <div className={compact ? "flex gap-1" : "space-y-2"}>
      {compact ? null : (
        <p className="flex items-center gap-2 text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
          <Type className="h-3.5 w-3.5" /> Ukuran teks
        </p>
      )}
      <div className="flex gap-2">
        {TEXT_SIZES.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setSize(option.key)}
            aria-pressed={option.key === size}
            title={option.title}
            className={`min-w-11 rounded-md border px-3 py-2 text-sm transition-colors ${
              option.key === size
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Breadcrumbs({ leafLabel }: { leafLabel?: string | undefined }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const crumbs = buildCrumbs(pathname, leafLabel);
  if (crumbs.length < 2) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const hideOnMobile = index < crumbs.length - 2;
          return (
            <li
              key={`${crumb.label}-${index}`}
              className={`flex items-center gap-1 ${hideOnMobile ? "hidden sm:flex" : "flex"}`}
            >
              {index > 0 ? <ChevronRight className="h-3 w-3 shrink-0 opacity-60" /> : null}
              {isLast || !crumb.to ? (
                <span className={isLast ? "font-medium text-foreground" : undefined}>
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.to}
                  {...(crumb.search ? { search: crumb.search as never } : {})}
                  className="transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function AppShell({
  title,
  subtitle,
  breadcrumbLabel,
  children,
}: {
  title: string;
  subtitle?: string | undefined;
  /** Label bagian terakhir breadcrumb untuk halaman dinamis. */
  breadcrumbLabel?: string | undefined;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { loading, session, email, fullName, role, signOut } = useAuth();
  const { can } = usePermissions();
  const navItems = nav.filter((item) => can(item.module));
  const accountingItems = accounting.filter((item) => can(item.module));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="border-b border-gold-line bg-card/90 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:gap-6">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/app-icon-192.png"
              alt="Logo Lavin Kost"
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-md border border-gold-line"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-base leading-tight font-semibold tracking-tight sm:text-lg">
                Lavin Kost Purwokerto
              </p>
              <p className="truncate text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                Inventaris
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Barang Inventaris <ChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/kamar" search={{ lantai: 1 }} className="flex items-center gap-2">
                      <DoorClosed className="h-4 w-4" /> Inventaris Kamar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/fasilitas" search={{ q: undefined }} className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" /> Inventaris Fasilitas Utama
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Akuntansi <ChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {accountingItems.map((item) => (
                    <DropdownMenuItem key={item.to} asChild>
                      <Link to={item.to} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" /> {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  SOP <ChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-[70vh] w-72 overflow-y-auto">
                  {sopSections.map((item) => (
                    <DropdownMenuItem key={item.label} asChild>
                      <a
                        href={sopUrl(item.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </a>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden items-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:flex">
                {role ? ROLE_LABELS[role] : "Akun"} <ChevronDown className="h-3.5 w-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <div className="px-2 py-2">
                  <p className="truncate text-sm font-medium">{fullName || email}</p>
                  <p className="truncate text-xs text-muted-foreground">{email}</p>
                </div>
                <DropdownMenuItem asChild>
                  <Link to="/notifikasi" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" /> Notifikasi
                  </Link>
                </DropdownMenuItem>
                {can("pengguna") ? (
                  <DropdownMenuItem asChild>
                    <Link to="/pengguna" className="flex items-center gap-2">
                      <UserCog className="h-4 w-4" /> Pengguna
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {can("akses") ? (
                  <DropdownMenuItem asChild>
                    <Link to="/akses" className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Hak Akses
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {can("audit") ? (
                  <DropdownMenuItem asChild>
                    <Link to="/audit" className="flex items-center gap-2">
                      <History className="h-4 w-4" /> Audit Log
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={() => void signOut()} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="hidden md:block">
              <TextSizeControl compact />
            </div>
            <NotificationBell />
            <GuideDialog />

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Buka menu"
                  className="h-11 w-11 md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex h-full w-[17rem] flex-col p-0">
                <SheetHeader className="shrink-0 border-b border-gold-line px-5 py-4 text-left">
                  <SheetTitle className="font-display text-lg">Menu</SheetTitle>
                  <SheetDescription className="text-xs">
                    Inventaris Lavin Kost Purwokerto
                  </SheetDescription>
                </SheetHeader>
                <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2 py-3">
                  {navItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      activeOptions={{ exact: item.to === "/" }}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                  <Collapsible defaultOpen={false} className="mt-2">
                    <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent [&[data-state=open]>svg:last-child]:rotate-180">
                      <Boxes className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left">Barang Inventaris</span>
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4">
                      <Link
                        to="/kamar"
                        search={{ lantai: 1 }}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
                      >
                        <DoorClosed className="h-4 w-4 shrink-0" />
                        <span className="truncate">Inventaris Kamar</span>
                      </Link>
                      <Link
                        to="/fasilitas"
                        search={{ q: undefined }}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
                      >
                        <Wrench className="h-4 w-4 shrink-0" />
                        <span className="truncate">Inventaris Fasilitas Utama</span>
                      </Link>
                    </CollapsibleContent>
                  </Collapsible>
                  <Collapsible defaultOpen={false} className="mt-1">
                    <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent [&[data-state=open]>svg:last-child]:rotate-180">
                      <Calculator className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left">Akuntansi</span>
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4">
                      {accountingItems.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                  <Collapsible defaultOpen={false} className="mt-1">
                    <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent [&[data-state=open]>svg:last-child]:rotate-180">
                      <ScrollText className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-left">SOP</span>
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4">
                      {sopSections.map((item) => (
                        <a
                          key={item.label}
                          href={sopUrl(item.hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-3 rounded-md px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent"
                        >
                          <ExternalLink className="h-4 w-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </a>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </nav>
                <div className="shrink-0 space-y-3 border-t border-gold-line px-5 py-4">
                  <div className="flex flex-col">
                    <Link
                      to="/notifikasi"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-md px-1 py-2 text-sm text-muted-foreground hover:bg-accent"
                    >
                      <Bell className="h-4 w-4" /> Notifikasi
                    </Link>
                    {can("pengguna") ? (
                      <Link
                        to="/pengguna"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-md px-1 py-2 text-sm text-muted-foreground hover:bg-accent"
                      >
                        <UserCog className="h-4 w-4" /> Pengguna
                      </Link>
                    ) : null}
                    {can("akses") ? (
                      <Link
                        to="/akses"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-md px-1 py-2 text-sm text-muted-foreground hover:bg-accent"
                      >
                        <ShieldCheck className="h-4 w-4" /> Hak Akses
                      </Link>
                    ) : null}
                    {can("audit") ? (
                      <Link
                        to="/audit"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-md px-1 py-2 text-sm text-muted-foreground hover:bg-accent"
                      >
                        <History className="h-4 w-4" /> Audit Log
                      </Link>
                    ) : null}
                  </div>
                  <TextSizeControl />
                  <div className="border-t border-gold-line pt-3">
                    <p className="truncate text-sm font-medium">{fullName || email}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {email} · {role ? ROLE_LABELS[role] : "-"}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => void signOut()}
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Keluar
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Breadcrumbs leafLabel={breadcrumbLabel} />
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <div className="mt-3 h-px w-24 bg-primary" />
          {subtitle ? <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
