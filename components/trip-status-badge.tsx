import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { tripStatusTitle, type TripStatus } from "@/lib/models";

const statusStyles: Record<TripStatus, string> = {
  requested: "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  accepted: "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  en_route_pickup:
    "border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  in_progress:
    "border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  completed:
    "border-green-300 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  cancelled: "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
};

export function TripStatusBadge({ status }: { status: TripStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", statusStyles[status])}>
      {tripStatusTitle[status]}
    </Badge>
  );
}
