import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["admin", "owner", "finance", "employee"] as const;
type Role = (typeof ROLES)[number];

type CreateUserInput = {
  email: string;
  password: string;
  fullName: string;
  role: Role;
};

function validate(input: CreateUserInput): CreateUserInput {
  const email = String(input?.email ?? "").trim().toLowerCase();
  const password = String(input?.password ?? "");
  const fullName = String(input?.fullName ?? "").trim();
  const role = input?.role;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Email tidak valid");
  if (password.length < 6) throw new Error("Kata sandi minimal 6 karakter");
  if (!ROLES.includes(role)) throw new Error("Level pengguna tidak valid");
  return { email, password, fullName: fullName || email, role };
}

export const createAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    const { data: rows, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleError) throw new Error(roleError.message);
    const privileged = (rows ?? []).some((r) =>
      ["admin", "owner", "finance"].includes(r.role as string),
    );
    if (!privileged) throw new Error("Anda tidak berhak membuat pengguna baru");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Gagal membuat pengguna");

    const userId = created.user.id;
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, full_name: data.fullName, email: data.email });
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });

    return { id: userId, email: data.email, role: data.role };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: Role }) => {
    if (!input?.userId) throw new Error("Pengguna tidak valid");
    if (!ROLES.includes(input.role)) throw new Error("Level pengguna tidak valid");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const privileged = (rows ?? []).some((r) =>
      ["admin", "owner", "finance"].includes(r.role as string),
    );
    if (!privileged) throw new Error("Anda tidak berhak mengubah level pengguna");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input?.userId) throw new Error("Pengguna tidak valid");
    return input;
  })
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("Tidak bisa menghapus akun sendiri");

    const { data: rows } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const privileged = (rows ?? []).some((r) =>
      ["admin", "owner", "finance"].includes(r.role as string),
    );
    if (!privileged) throw new Error("Anda tidak berhak menghapus pengguna");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    // Abaikan galat "user tidak ditemukan" agar sisa data profil tetap dibersihkan.
    if (error && !/not found/i.test(error.message)) throw new Error(error.message);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    return { ok: true };
  });
