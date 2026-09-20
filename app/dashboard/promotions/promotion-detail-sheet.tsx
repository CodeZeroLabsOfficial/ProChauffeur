"use client";

import { useState } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { MapPin, Power, Ticket, Users } from "lucide-react";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

import { complianceDaysRemaining } from "@/components/compliance";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSheetDisplayItem } from "@/hooks/use-sheet-display-item";
import { formatDate } from "@/lib/format";
import {
  PROMOTION_TRIP_TYPES,
  TRIP_TYPES,
  tripTypeTitle,
  type Branch,
  type Promotion,
  type TripType
} from "@/lib/models";
import { cn } from "@/lib/utils";
import { validityProgress } from "@/lib/vehicle-insurance";

const DEFAULT_COUPON_BANNER = "/images/promotions/coupon-default-banner.png";

const CHART_COLORS = [
  "bg-[var(--chart-1)]",
  "bg-[var(--chart-2)]",
  "bg-[var(--chart-3)]",
  "bg-[var(--chart-4)]",
  "bg-[var(--chart-5)]"
] as const;

const BREAKDOWN_AXES = [
  { value: "location", label: "Location" },
  { value: "trip", label: "Trip" },
  { value: "class", label: "Class" }
] as const;

type BreakdownAxis = (typeof BREAKDOWN_AXES)[number]["value"];

const radialChartConfig = {
  capacity: { label: "Capacity", color: "hsl(var(--primary))" }
} satisfies ChartConfig;

type BreakdownRow = {
  id: string;
  name: string;
  count: number;
  color: string;
};

function formatDiscountOffer(promo: Promotion): string {
  if (promo.type === "percent") {
    const pct = Math.round(promo.value * 10000) / 100;
    return `${pct}% off`;
  }
  return `$${promo.value.toFixed(2)} off`;
}

function formatScopeCount(selected: number, total: number, allLabel: string, noun: string): string {
  if (selected === 0 || (total > 0 && selected >= total)) {
    return allLabel;
  }
  return `${selected}/${total} ${noun}`;
}

function countRecordRows(
  counts: Record<string, number>,
  labelFor: (id: string) => string
): BreakdownRow[] {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, count], index) => ({
      id,
      name: labelFor(id),
      count,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));
}

function ScopeStat({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="text-muted-foreground mt-0.5 size-8 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p className="whitespace-nowrap text-sm font-medium tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function DiscountRibbon({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute end-0 top-0 z-10 size-36 overflow-hidden">
      <div className="bg-black/45 absolute top-6 -right-12 flex w-48 rotate-45 items-center justify-center py-2 shadow-sm backdrop-blur-[2px]">
        <span className="text-sm font-semibold tracking-wide text-white/95 tabular-nums">
          {label}
        </span>
      </div>
    </div>
  );
}

function PromoRadialStat({
  name,
  capacity,
  valueLabel,
  detail,
  fill = "var(--primary)",
  destructive
}: {
  name: string;
  capacity: number;
  /** Center label — e.g. `42%` or uncapped use count `12`. */
  valueLabel: string;
  detail: string;
  fill?: string;
  destructive?: boolean;
}) {
  return (
    <Card className="p-4 shadow-none">
      <CardContent className="flex items-center space-x-4 p-0">
        <div className="relative flex items-center justify-center">
          <ChartContainer config={radialChartConfig} className="h-[80px] w-[80px]">
            <RadialBarChart
              data={[{ capacity }]}
              innerRadius={29}
              outerRadius={35}
              barSize={6}
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
                dataKey="capacity"
                background
                cornerRadius={10}
                fill={fill}
                angleAxisId={0}
              />
            </RadialBarChart>
          </ChartContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={cn(
                "text-foreground text-base font-medium tabular-nums",
                destructive && "text-destructive"
              )}>
              {valueLabel}
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <dt className="text-foreground text-sm font-medium">{name}</dt>
          <dd className="text-muted-foreground text-sm">{detail}</dd>
        </div>
      </CardContent>
    </Card>
  );
}

function RedemptionBreakdownCard({
  byLocation,
  byTrip,
  byClass
}: {
  byLocation: BreakdownRow[];
  byTrip: BreakdownRow[];
  byClass: BreakdownRow[];
}) {
  const [axis, setAxis] = useState<BreakdownAxis>("location");
  const rows =
    axis === "location" ? byLocation : axis === "trip" ? byTrip : byClass;
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <Card className="gap-3 py-4 shadow-none">
      <CardHeader className="px-4">
        <CardTitle className="text-sm font-medium">Redemptions</CardTitle>
        <CardAction>
          <Tabs
            value={axis}
            onValueChange={(value) => setAxis(value as BreakdownAxis)}>
            <TabsList className="h-8">
              {BREAKDOWN_AXES.map((option) => (
                <TabsTrigger key={option.value} value={option.value} className="px-2 text-xs">
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        {total > 0 ? (
          <>
            <p className="text-muted-foreground text-xs">
              {total} booking{total === 1 ? "" : "s"}
            </p>
            <TooltipProvider>
              <div className="flex h-2 w-full overflow-hidden rounded-full">
                {rows.map((row) => (
                  <Tooltip key={row.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`${row.color} h-full`}
                        style={{ width: `${(row.count / total) * 100}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {row.count} booking{row.count === 1 ? "" : "s"}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>

            <div className="space-y-2">
              {rows.map((row) => {
                const pct = Math.round((row.count / total) * 100);
                return (
                  <div key={row.id} className="flex items-center gap-3">
                    <div className={`size-2 shrink-0 rounded-full ${row.color}`} />
                    <p className="min-w-0 flex-1 truncate text-sm">
                      <span className="font-medium">{row.name}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {row.count}
                      </span>
                    </p>
                    <div className="flex w-24 shrink-0 items-center gap-2">
                      <Progress value={pct} className="h-1.5" indicatorColor={row.color} />
                      <span className="text-muted-foreground w-8 text-right text-xs tabular-nums">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">No redemptions yet</p>
        )}
      </CardContent>
    </Card>
  );
}

function usageStat(used: number, max: number | null | undefined) {
  const hasLimit = max != null && max > 0;
  const capacity = hasLimit ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const valueLabel = hasLimit ? `${capacity}%` : String(used);
  const detail = hasLimit ? `${used} of ${max} used` : "Uncapped";
  const fill =
    hasLimit && capacity >= 100
      ? "var(--destructive)"
      : hasLimit && capacity >= 80
        ? "var(--warning)"
        : "var(--primary)";
  return { capacity, valueLabel, detail, fill, destructive: hasLimit && capacity >= 100 };
}

function validityStat(startsAt: Date | null | undefined, endsAt: Date | null | undefined) {
  const now = new Date();
  const expired = endsAt != null && endsAt < now;
  const fill = expired ? "var(--destructive)" : "var(--primary)";

  if (startsAt && endsAt) {
    const elapsed = validityProgress(startsAt, endsAt, now);
    const capacity = elapsed != null ? Math.max(0, 100 - elapsed) : 0;
    return {
      capacity,
      valueLabel: `${capacity}%`,
      detail: `Expires ${formatDate(endsAt)}`,
      fill,
      destructive: expired
    };
  }

  if (endsAt) {
    const days = complianceDaysRemaining(endsAt, now) ?? 0;
    return {
      capacity: 0,
      valueLabel: String(days),
      detail: `Expires ${formatDate(endsAt)}`,
      fill,
      destructive: expired
    };
  }

  if (startsAt) {
    return {
      capacity: 0,
      valueLabel: "—",
      detail: `From ${formatDate(startsAt)}`,
      fill: "var(--primary)",
      destructive: false
    };
  }

  return {
    capacity: 0,
    valueLabel: "—",
    detail: "Always valid",
    fill: "var(--primary)",
    destructive: false
  };
}

function tripTypeLabel(id: string): string {
  if ((TRIP_TYPES as readonly string[]).includes(id)) {
    return tripTypeTitle[id as TripType];
  }
  return id;
}

export function PromotionDetailSheet({
  promotion,
  branches,
  vehicleClasses,
  open,
  onOpenChange
}: {
  promotion: Promotion | null;
  branches: Branch[];
  vehicleClasses: { id: string; displayName: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const display = useSheetDisplayItem(promotion, open);
  if (!display) return null;

  const branchIds = display.conditions.branchIds?.filter(Boolean) ?? [];
  const locationSummary = formatScopeCount(
    branchIds.length,
    branches.length,
    "All Locations",
    "Locations"
  );

  const classIds = display.conditions.vehicleClassIds?.filter(Boolean) ?? [];
  const classSummary = formatScopeCount(
    classIds.length,
    vehicleClasses.length,
    "All classes",
    "Classes"
  );

  const tripTypeIds = display.conditions.tripTypes?.filter(Boolean) ?? [];
  const tripTypeSummary = formatScopeCount(
    tripTypeIds.length,
    PROMOTION_TRIP_TYPES.length,
    "All trips",
    "Trips"
  );

  const description = display.description?.trim() || null;
  const heroTitle = display.title.trim() || display.code.trim() || "Coupon";
  const endsAt = display.conditions.endsAt;
  const startsAt = display.conditions.startsAt;
  const usage = usageStat(display.redemptionCount, display.conditions.maxRedemptions);
  const validity = validityStat(startsAt, endsAt);

  const branchNameById = new Map(branches.map((b) => [b.id, b.name]));
  const classNameById = new Map(vehicleClasses.map((c) => [c.id, c.displayName]));

  const byLocation = countRecordRows(
    display.redemptionsByBranchId,
    (id) => branchNameById.get(id) ?? id
  );
  const byTripType = countRecordRows(display.redemptionsByTripType, tripTypeLabel);
  const byVehicleClass = countRecordRows(
    display.redemptionsByVehicleClassId,
    (id) => classNameById.get(id) ?? id
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showCloseButton={false}
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetTitle className="sr-only">{heroTitle}</SheetTitle>

        <div className="relative aspect-video w-full shrink-0 overflow-hidden">
          <Image
            src={display.bannerUrl?.trim() || DEFAULT_COUPON_BANNER}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 512px) 100vw, 512px"
            priority
            unoptimized={Boolean(display.bannerUrl?.startsWith("blob:"))}
          />
          <DiscountRibbon label={formatDiscountOffer(display)} />
        </div>

        <div className="p-4">
          <div className="mb-10 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-lg font-bold sm:text-xl">{heroTitle}</h4>
              {description ? (
                <p className="text-muted-foreground mt-1 text-sm">{description}</p>
              ) : null}
            </div>
            <DetailSheetIconBadge icon={Power} className="shrink-0">
              {display.isEnabled ? "Active" : "Inactive"}
            </DetailSheetIconBadge>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-3">
            <ScopeStat icon={MapPin} label="Locations" value={locationSummary} />
            <ScopeStat icon={Ticket} label="Trip Types" value={tripTypeSummary} />
            <ScopeStat icon={Users} label="Vehicle Classes" value={classSummary} />
          </div>

          <dl className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PromoRadialStat
              name="Usage"
              capacity={usage.capacity}
              valueLabel={usage.valueLabel}
              detail={usage.detail}
              fill={usage.fill}
              destructive={usage.destructive}
            />
            <PromoRadialStat
              name="Validity"
              capacity={validity.capacity}
              valueLabel={validity.valueLabel}
              detail={validity.detail}
              fill={validity.fill}
              destructive={validity.destructive}
            />
          </dl>

          <RedemptionBreakdownCard
            byLocation={byLocation}
            byTrip={byTripType}
            byClass={byVehicleClass}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
