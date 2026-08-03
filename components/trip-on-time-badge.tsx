"use client";

import type { ReactNode } from "react";
import { CheckCircle2Icon, AlertCircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TripProgressOnTime } from "@/lib/trip-progress";
import { Badge } from "@/components/ui/badge";

const onTimeCopy: Record<TripProgressOnTime, string> = {
  early: "Early",
  on_time: "On time",
  late: "Late"
};

const onTimeStyles: Record<TripProgressOnTime, string> = {
  early:
    "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  on_time:
    "border-green-300 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  late: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
};

const onTimeIcon: Record<TripProgressOnTime, ReactNode> = {
  early: <CheckCircle2Icon className="size-3" />,
  on_time: <CheckCircle2Icon className="size-3" />,
  late: <AlertCircleIcon className="size-3" />
};

export function TripOnTimeBadge({
  onTime,
  className
}: {
  onTime: TripProgressOnTime | null;
  className?: string;
}) {
  if (!onTime) return null;

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium", onTimeStyles[onTime], className)}>
      {onTimeIcon[onTime]}
      {onTimeCopy[onTime]}
    </Badge>
  );
}
