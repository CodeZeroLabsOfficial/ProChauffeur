import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  dispatchBadgeIcon,
  visibilityBadgeIcon,
  visibilityStatusLabel
} from "@/lib/chauffeur-badge-icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const activeListStyle =
  "border-green-300 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300";
const pausedListStyle =
  "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";

function DriverListStatusBadge({
  icon: Icon,
  className,
  children
}: {
  icon: LucideIcon;
  className: string;
  children: ReactNode;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", className)}>
      <Icon aria-hidden="true" className="-ms-0.5 opacity-60" size={12} />
      {children}
    </Badge>
  );
}

/** Colored outline badge for driver visibility in list tables (matches booking status style). */
export function DriverVisibilityListBadge({ active }: { active: boolean }) {
  return (
    <DriverListStatusBadge
      icon={visibilityBadgeIcon(active)}
      className={active ? activeListStyle : pausedListStyle}>
      {visibilityStatusLabel(active)}
    </DriverListStatusBadge>
  );
}

/** Colored outline badge for driver dispatch in list tables (matches booking status style). */
export function DriverDispatchListBadge({ accepting }: { accepting: boolean }) {
  return (
    <DriverListStatusBadge
      icon={dispatchBadgeIcon(accepting)}
      className={accepting ? activeListStyle : pausedListStyle}>
      {accepting ? "Accepting" : "Paused"}
    </DriverListStatusBadge>
  );
}
