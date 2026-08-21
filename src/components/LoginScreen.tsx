import { useState } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const DEMO_PASSWORD = "123456";

const DEMO_ACCOUNTS = [
  { email: "admin@lavin.app", label: "Admin", desc: "Akses penuh" },
  { email: "owner@lavin.app", label: "Owner", desc: "Akses penuh" },
  { email: "finance@lavin.app", label: "Finance", desc: "Akses penuh" },
  { email: "employee@lavin.app", label: "Employee", desc: "Tanpa hapus" },
] as const;

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(mail: string, pass: string) {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: mail, password: pass });
    setBusy(false);
    if (error) {
      toast.error("Login gagal", { description: error.message });
      return;
    }
    toast.success("Berhasil masuk");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <img
            src="/app-icon-192.png"
            alt="Logo Lavin Kost"
            width={48}
            height={48}
            className="h-12 w-12 rounded-md border border-gold-line"
          />
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              Lavin Kost Purwokerto
            </h1>
            <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              Masuk untuk melanjutkan
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void signIn(email.trim(), password);
          }}
          className="space-y-4 rounded-lg border border-gold-line bg-card p-5"
        >
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@lavin.app"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Kata sandi</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            Masuk
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Tidak ada pendaftaran mandiri. Akun dibuat oleh admin, owner, atau finance.
          </p>
        </form>

        <div className="mt-6 rounded-lg border border-gold-line bg-card/60 p-5">
          <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            Akun demo — klik untuk langsung masuk
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={busy}
                onClick={() => {
                  setEmail(acc.email);
                  setPassword(DEMO_PASSWORD);
                  void signIn(acc.email, DEMO_PASSWORD);
                }}
                className="rounded-md border border-border px-3 py-3 text-left transition-colors hover:bg-accent disabled:opacity-60"
              >
                <span className="block text-sm font-medium">{acc.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{acc.email}</span>
                <span className="block text-[11px] text-muted-foreground">{acc.desc}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Semua akun demo memakai kata sandi <span className="font-mono">123456</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
