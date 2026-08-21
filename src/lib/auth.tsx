import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "owner" | "finance" | "employee";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  owner: "Owner",
  finance: "Finance",
  employee: "Employee",
};

type AuthState = {
  loading: boolean;
  session: Session | null;
  userId: string | null;
  email: string | null;
  fullName: string;
  role: AppRole | null;
  canDelete: boolean;
  canManageUsers: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next ?? null);
      setLoading(false);
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        void queryClient.invalidateQueries();
      }
      if (event === "SIGNED_OUT") {
        void queryClient.cancelQueries();
        queryClient.clear();
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setFullName("");
      return;
    }
    let active = true;
    void (async () => {
      const [{ data: roleRow }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      ]);
      if (!active) return;
      setRole((roleRow?.role as AppRole | undefined) ?? null);
      setFullName(profile?.full_name ?? "");
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const value = useMemo<AuthState>(() => {
    const privileged = role === "admin" || role === "owner" || role === "finance";
    return {
      loading,
      session,
      userId,
      email: session?.user.email ?? null,
      fullName,
      role,
      canDelete: privileged,
      canManageUsers: privileged,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    };
  }, [loading, session, userId, fullName, role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider");
  }
  return ctx;
}
