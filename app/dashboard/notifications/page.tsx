"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Check, Settings } from "lucide-react";
import { toast } from "sonner";

import { useNotifications } from "@/hooks/use-collections";
import { markAllNotificationsRead } from "@/lib/services/firebase-service";
import { Button } from "@/components/ui/button";
import { NotificationsDataTable } from "@/app/dashboard/notifications/data-table";

export default function NotificationsPage() {
  const { notifications } = useNotifications(200);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadIds = useMemo(
    () => notifications.filter((n) => !n.readAt).map((n) => n.id),
    [notifications]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!unreadIds.length) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(unreadIds);
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Could not mark notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  }, [unreadIds]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 xl:mt-8">
      <div className="flex items-start justify-between">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Notifications</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => void handleMarkAllRead()} disabled={markingAll || unreadIds.length === 0}>
            <Check />
            Mark All as Read
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings">
              <Settings />
            </Link>
          </Button>
        </div>
      </div>
      <NotificationsDataTable />
    </div>
  );
}
