"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { useNotifications } from "@/hooks/use-collections";
import type { ActivityNotification } from "@/lib/models";
import { notificationCategoryIcon, notificationCategoryLabel } from "@/lib/notifications/display";
import { markNotificationRead } from "@/lib/services/firebase-service";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";
import { timeAgo } from "@/app/dashboard/lib/dashboard-metrics";

function ActivityIcon({ notification }: { notification: ActivityNotification }) {
  const Icon = notificationCategoryIcon(notification.category);
  return (
    <Avatar>
      <AvatarFallback>
        <Icon className="size-4" />
      </AvatarFallback>
    </Avatar>
  );
}

export function RecentActivities() {
  const { notifications } = useNotifications(8);
  const [selected, setSelected] = useState<ActivityNotification | null>(null);

  const items = useMemo(() => notifications.slice(0, 8), [notifications]);
  const viewAllHref = items[0]?.href ?? "/dashboard";

  async function openActivity(notification: ActivityNotification) {
    setSelected(notification);
    if (!notification.readAt) {
      try {
        await markNotificationRead(notification.id);
      } catch {
        // Non-blocking for the detail dialog.
      }
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Recent activities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {items.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">No recent activity.</p>
          ) : (
            items.map((notification) => (
              <div
                key={notification.id}
                className="hover:bg-muted -mx-2 flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors"
                onClick={() => void openActivity(notification)}>
                <ActivityIcon notification={notification} />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate font-semibold">{notification.title}</p>
                  <p className="text-muted-foreground truncate text-sm">{notification.message}</p>
                </div>
                <span className="text-muted-foreground text-sm whitespace-nowrap">
                  {timeAgo(notification.createdAt)}
                </span>
              </div>
            ))
          )}

          <div className="mt-4">
            <Button variant="outline" className="w-full" size="sm" asChild>
              <Link href={viewAllHref}>
                View all <ChevronRight />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activity details</DialogTitle>
            <DialogDescription>{selected ? notificationCategoryLabel(selected.category) : ""}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <ActivityIcon notification={selected} />
                <div>
                  <p className="text-lg font-semibold">{selected.title}</p>
                  <p className="text-muted-foreground text-sm">{selected.message}</p>
                </div>
              </div>
              {selected.actorName ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Changed by</p>
                  <p className="text-muted-foreground text-sm">{selected.actorName}</p>
                </div>
              ) : null}
              <div className="space-y-1">
                <p className="text-sm font-medium">When</p>
                <p className="text-muted-foreground text-sm">
                  {formatDateTime(selected.createdAt)} ({timeAgo(selected.createdAt)} ago)
                </p>
              </div>
              {selected.href ? (
                <Button asChild className="w-full">
                  <Link href={selected.href}>Open {notificationCategoryLabel(selected.category).toLowerCase()}</Link>
                </Button>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
