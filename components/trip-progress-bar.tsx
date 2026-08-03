"use client";

import { cn } from "@/lib/utils";
import type { TripProgress } from "@/lib/trip-progress";
import { Progress } from "@/components/ui/progress";

export function TripProgressBar({
  progress,
  waitingForGps = false,
  className
}: {
  progress: TripProgress;
  waitingForGps?: boolean;
  className?: string;
}) {
  if (progress.kind === "idle") return null;

  const showWaiting = waitingForGps && progress.etaLabel == null;
  const value = progress.percent ?? (progress.kind === "completed" ? 100 : 0);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Progress value={showWaiting ? 0 : value} className="h-1.5" />
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
        <span className="truncate">
          {showWaiting ? "Waiting for GPS" : progress.phaseLabel}
        </span>
        <span className="shrink-0 tabular-nums">{showWaiting ? null : progress.etaLabel}</span>
      </div>
    </div>
  );
}
