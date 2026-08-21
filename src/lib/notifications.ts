import { supabase } from "@/integrations/supabase/client";

export type AppNotification = {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  link: string | null;
  created_at: string;
  read: boolean;
};

export const notificationsQuery = {
  queryKey: ["notifications"] as const,
  queryFn: async (): Promise<AppNotification[]> => {
    const [{ data: rows, error }, { data: reads }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, user_id, title, message, type, link, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("notification_reads").select("notification_id"),
    ]);
    if (error) throw new Error(error.message);
    const readSet = new Set((reads ?? []).map((r) => r.notification_id));
    return (rows ?? []).map((row) => ({ ...row, read: readSet.has(row.id) }) as AppNotification);
  },
  refetchInterval: 60_000,
};

export async function markRead(ids: string[], userId: string) {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("notification_reads")
    .upsert(ids.map((notification_id) => ({ notification_id, user_id: userId })));
  if (error) throw new Error(error.message);
}

export async function markUnread(id: string, userId: string) {
  const { error } = await supabase
    .from("notification_reads")
    .delete()
    .eq("notification_id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function createNotification(input: {
  title: string;
  message?: string;
  type?: string;
  link?: string | null;
  userId?: string | null;
}) {
  const { error } = await supabase.from("notifications").insert({
    title: input.title,
    message: input.message ?? "",
    type: input.type ?? "info",
    link: input.link ?? null,
    user_id: input.userId ?? null,
  });
  if (error) throw new Error(error.message);
}

export function formatNotifTime(value: string) {
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}
