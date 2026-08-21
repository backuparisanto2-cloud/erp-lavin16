import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { formatNotifTime, markRead, notificationsQuery } from "@/lib/notifications";

export function NotificationBell() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const notifications = useQuery(notificationsQuery);
  const rows = (notifications.data ?? []).slice(0, 8);
  const unread = (notifications.data ?? []).filter((n) => !n.read).length;

  const read = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) return;
      await markRead([id], userId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsQuery.queryKey }),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-11 w-11" aria-label="Notifikasi">
          <Bell className="h-5 w-5" />
          {unread > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-destructive px-1 text-[10px] leading-5 font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70vh] w-80 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">Belum ada notifikasi.</p>
        ) : (
          rows.map((row) => (
            <DropdownMenuItem
              key={row.id}
              onSelect={() => read.mutate(row.id)}
              className="flex flex-col items-start gap-0.5"
            >
              <span className={`text-sm ${row.read ? "" : "font-semibold"}`}>{row.title}</span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{row.message}</span>
              <span className="text-[10px] text-muted-foreground">{formatNotifTime(row.created_at)}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/notifikasi">Lihat semua notifikasi</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
