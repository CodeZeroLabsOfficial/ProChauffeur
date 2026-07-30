import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function expiryWarning(date: Date | null | undefined): "expired" | "soon" | null {
  if (!date) return null;
  const now = new Date();
  if (date < now) return "expired";
  const days = (date.getTime() - now.getTime()) / 86400000;
  if (days <= 60) return "soon";
  return null;
}

export function ExpiryBadge({
  level,
  className
}: {
  level: "expired" | "soon";
  className?: string;
}) {
  return (
    <Badge
      variant={level === "expired" ? "destructive" : "outline"}
      className={cn("ms-2", level === "soon" && "border-warning text-warning", className)}>
      {level === "expired" ? "Expired" : "Expiring soon"}
    </Badge>
  );
}

export function isStartAfterExpiry(
  start: Date | null | undefined,
  expiry: Date | null | undefined
): boolean {
  if (!start || !expiry) return false;
  return start.getTime() > expiry.getTime();
}
