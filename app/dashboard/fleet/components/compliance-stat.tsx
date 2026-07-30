"use client";

import { differenceInCalendarDays } from "date-fns";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

import { formatDate } from "@/lib/format";
import { validityProgress } from "@/lib/vehicle-insurance";
import { cn } from "@/lib/utils";
import { ExpiryBadge, expiryWarning } from "@/components/expiry-badge";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";

const chartConfig = {
  remaining: { label: "Term remaining" }
} satisfies ChartConfig;

export function complianceDaysRemaining(
  expiry: Date | null | undefined,
  now = new Date()
): number | null {
  if (!expiry) return null;
  return Math.max(0, differenceInCalendarDays(expiry, now));
}

export function ComplianceStat({
  label,
  secondary,
  start,
  expiry,
  size = "sm"
}: {
  label: string;
  secondary?: string | null;
  start?: Date | null;
  expiry?: Date | null;
  size?: "sm" | "lg";
}) {
  const isLarge = size === "lg";
  const warning = expiryWarning(expiry);
  const elapsed = validityProgress(start, expiry);
  const remainingTerm = elapsed == null ? 0 : 100 - elapsed;
  const daysRemaining = complianceDaysRemaining(expiry);
  const fill =
    warning === "expired"
      ? "var(--destructive)"
      : warning === "soon"
        ? "var(--warning)"
        : "var(--primary)";

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex shrink-0 items-center justify-center">
        <ChartContainer
          config={chartConfig}
          className={cn("aspect-square", isLarge ? "size-[150px]" : "size-20")}>
          <RadialBarChart
            data={[{ remaining: remainingTerm }]}
            innerRadius={isLarge ? "82%" : 29}
            outerRadius={isLarge ? "97%" : 35}
            barSize={isLarge ? undefined : 6}
            startAngle={90}
            endAngle={-270}>
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
              axisLine={false}
            />
            <RadialBar
              dataKey="remaining"
              background
              cornerRadius={remainingTerm > 0 ? (isLarge ? 6 : 10) : 0}
              fill={fill}
              angleAxisId={0}
            />
          </RadialBarChart>
        </ChartContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span
            className={cn(
              "font-semibold",
              isLarge ? "text-lg" : "text-base",
              warning === "expired" && "text-destructive"
            )}>
            {daysRemaining ?? "—"}
          </span>
          {daysRemaining != null ? (
            <span className={cn("text-muted-foreground mt-1", isLarge ? "text-sm" : "text-[10px]")}>
              days
            </span>
          ) : null}
        </div>
      </div>

      <div className={cn("min-w-0", isLarge && "space-y-1")}>
        <p className={cn("truncate", isLarge ? "font-display text-xl" : "text-sm font-semibold")}>
          {label.trim() || "—"}
        </p>
        <p className="text-muted-foreground truncate text-sm">{secondary?.trim() || "—"}</p>
        <p
          className={cn(
            isLarge ? "text-sm" : "mt-1 text-xs",
            warning === "expired"
              ? "text-destructive"
              : warning === "soon"
                ? "text-warning"
                : "text-muted-foreground"
          )}>
          {expiry ? `Expires ${formatDate(expiry)}` : "No expiry set"}
        </p>
        {warning ? (
          <div className={isLarge ? "pt-1" : "mt-2"}>
            <ExpiryBadge level={warning} className="ms-0" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
