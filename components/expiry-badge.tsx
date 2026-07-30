import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";

export function expiryWarning(date: Date | null | undefined): "expired" | "soon" | null {
  if (!date) return null;
  const now = new Date();
  if (date < now) return "expired";
  const days = (date.getTime() - now.getTime()) / 86400000;
  if (days <= 60) return "soon";
  return null;
}

export function ExpiryBadge({ level }: { level: "expired" | "soon" }) {
  return (
    <Badge variant={level === "expired" ? "destructive" : "outline"} className="ms-2">
      {level === "expired" ? "Expired" : "Expiring soon"}
    </Badge>
  );
}

export function remainingTimeLabel(expiry: Date | null | undefined): string | null {
  if (!expiry) return null;
  return formatDistanceToNow(expiry, { addSuffix: true });
}

export function isStartAfterExpiry(
  start: Date | null | undefined,
  expiry: Date | null | undefined
): boolean {
  if (!start || !expiry) return false;
  return start.getTime() > expiry.getTime();
}
