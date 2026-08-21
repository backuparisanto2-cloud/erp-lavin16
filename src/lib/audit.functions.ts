import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AuthEvent = { action: "LOGIN" | "LOGOUT"; email?: string | undefined };

export const logAuthEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AuthEvent) => {
    const action = input?.action === "LOGOUT" ? "LOGOUT" : "LOGIN";
    return { action, email: String(input?.email ?? "").slice(0, 200) } as AuthEvent;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email || context.claims?.email || null;
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      user_email: typeof email === "string" ? email : null,
      table_name: "auth",
      record_id: context.userId,
      action: data.action,
      event_type: "auth",
      summary: data.action === "LOGIN" ? "Pengguna masuk ke aplikasi" : "Pengguna keluar dari aplikasi",
      changed_fields: [],
    });
    return { ok: true };
  });
