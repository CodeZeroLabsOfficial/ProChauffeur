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

/** True when the record has any non-blank string or non-null date. */
export function hasComplianceDetails(record: unknown): boolean {
  if (!record || typeof record !== "object") return false;
  return Object.values(record as Record<string, unknown>).some((value) =>
    value instanceof Date ? true : typeof value === "string" && value.trim() !== ""
  );
}

export function ComplianceStat({
  label,
  secondary,
  start,
  expiry
}: {
  label: string;
  secondary?: string | null;
  start?: Date | null;
  expiry?: Date | null;
}) {
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
    <div className="flex items-center gap-3">
      <div className="relative flex shrink-0 items-center justify-center">
        <ChartContainer config={chartConfig} className="aspect-square size-[100px]">
          <RadialBarChart
            data={[{ remaining: remainingTerm }]}
            innerRadius="82%"
            outerRadius="97%"
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
              cornerRadius={remainingTerm > 0 ? 6 : 0}
              fill={fill}
              angleAxisId={0}
            />
          </RadialBarChart>
        </ChartContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span
            className={cn("text-base font-semibold", warning === "expired" && "text-destructive")}>
            {daysRemaining ?? "—"}
          </span>
          {daysRemaining != null ? (
            <span className="text-muted-foreground mt-0.5 text-xs">days</span>
          ) : null}
        </div>
      </div>

      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-medium">{label.trim() || "—"}</p>
        <p className="text-muted-foreground truncate text-xs">{secondary?.trim() || "—"}</p>
        <p
          className={cn(
            "text-xs",
            warning === "expired"
              ? "text-destructive"
              : warning === "soon"
                ? "text-warning"
                : "text-muted-foreground"
          )}>
          {expiry ? `Expires ${formatDate(expiry)}` : "No expiry set"}
        </p>
        {warning ? (
          <div className="pt-0.5">
            <ExpiryBadge level={warning} className="ms-0" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
