"use client";

import { PencilIcon } from "lucide-react";

import { formatDate } from "@/lib/format";
import { validityProgress } from "@/lib/vehicle-insurance";
import { cn } from "@/lib/utils";
import { ExpiryBadge, expiryWarning, remainingTimeLabel } from "@/components/expiry-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function ValidityTermFooter({
  start,
  expiry
}: {
  start?: Date | null;
  expiry?: Date | null;
}) {
  const warning = expiryWarning(expiry);
  const remaining = remainingTimeLabel(expiry);
  const progress = validityProgress(start, expiry);

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">
          Expiry {formatDate(expiry)}
          {warning ? <ExpiryBadge level={warning} /> : null}
        </span>
        <span
          className={cn(
            warning === "expired"
              ? "text-destructive"
              : warning === "soon"
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
          )}>
          {remaining ?? "—"}
        </span>
      </div>
      {progress != null ? (
        <Progress
          value={progress}
          indicatorColor={
            warning === "expired"
              ? "bg-destructive"
              : warning === "soon"
                ? "bg-amber-500"
                : undefined
          }
        />
      ) : null}
    </div>
  );
}

export function ComplianceEditButton({
  label,
  onClick,
  className
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("absolute top-3 right-3 z-10", className)}
      onClick={onClick}
      aria-label={label}>
      <PencilIcon />
    </Button>
  );
}
