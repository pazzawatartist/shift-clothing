"use client";

import Link from "next/link";
import { Bell, PackageX, PackageMinus, ShoppingBag, CreditCard, Undo2 } from "lucide-react";
import { useNotifications, useMarkNotificationRead } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { NotificationType } from "@/types/database.types";

const ICONS: Record<NotificationType, typeof Bell> = {
  low_stock: PackageMinus,
  out_of_stock: PackageX,
  new_order: ShoppingBag,
  pending_payment: CreditCard,
  return_request: Undo2,
};

export function NotificationBell() {
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-destructive" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">Notifications</div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">You&apos;re all caught up.</p>
          )}
          {notifications.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <Link
                key={n.id}
                href={n.link ?? "#"}
                onClick={() => !n.is_read && markRead.mutate(n.id)}
                className={cn(
                  "flex gap-3 border-b px-4 py-3 text-sm last:border-b-0 hover:bg-accent",
                  !n.is_read && "bg-accent/50"
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{n.title}</p>
                  <p className="truncate text-muted-foreground">{n.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
