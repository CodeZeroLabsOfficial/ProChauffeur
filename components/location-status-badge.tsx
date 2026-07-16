import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const activeStyle =
  "border-green-300 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300";
const inactiveStyle =
  "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";

export function LocationStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", isActive ? activeStyle : inactiveStyle)}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}
