import { Badge } from "@/components/ui/badge";
import { visibilityStatusLabel } from "@/lib/chauffeur-badge-icons";
import { cn } from "@/lib/utils";

const visibilityListStyles = {
  active: "border-green-300 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  inactive: "border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400"
} as const;

const dispatchListStyles = {
  accepting: "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  paused: "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
} as const;

/** Colored outline badge for driver visibility in list tables (matches booking status style). */
export function DriverVisibilityListBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", active ? visibilityListStyles.active : visibilityListStyles.inactive)}>
      {visibilityStatusLabel(active)}
    </Badge>
  );
}

/** Colored outline badge for driver dispatch in list tables (matches booking status style). */
export function DriverDispatchListBadge({ accepting }: { accepting: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        accepting ? dispatchListStyles.accepting : dispatchListStyles.paused
      )}>
      {accepting ? "Accepting" : "Paused"}
    </Badge>
  );
}
