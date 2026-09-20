"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { MapPin, Power, Ticket, Users } from "lucide-react";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSheetDisplayItem } from "@/hooks/use-sheet-display-item";
import { formatDate } from "@/lib/format";
import { TRIP_TYPES, type Branch, type Promotion } from "@/lib/models";
import { cn } from "@/lib/utils";
import { validityProgress } from "@/lib/vehicle-insurance";

const DEFAULT_COUPON_BANNER = "/images/promotions/coupon-default-banner.png";

const radialChartConfig = {
  capacity: { label: "Capacity", color: "hsl(var(--primary))" }
} satisfies ChartConfig;

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
  detail,
  fill = "var(--primary)",
  destructive
}: {
  name: string;
  capacity: number;
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
              {capacity}%
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

function usageStat(used: number, max: number | null | undefined) {
  const hasLimit = max != null && max > 0;
  const capacity = hasLimit ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const detail = hasLimit ? `${used} of ${max} used` : used > 0 ? `${used} used` : "Uncapped";
  const fill =
    hasLimit && capacity >= 100
      ? "var(--destructive)"
      : hasLimit && capacity >= 80
        ? "var(--warning)"
        : "var(--primary)";
  return { capacity, detail, fill, destructive: hasLimit && capacity >= 100 };
}

function validityStat(startsAt: Date | null | undefined, endsAt: Date | null | undefined) {
  const now = new Date();
  const expired = endsAt != null && endsAt < now;
  const elapsed = validityProgress(startsAt, endsAt);
  const capacity = elapsed != null ? Math.max(0, 100 - elapsed) : 100;

  let detail = "Always valid";
  if (startsAt && endsAt) {
    detail = `Valid ${formatDate(startsAt)} to ${formatDate(endsAt)}`;
  } else if (endsAt) {
    detail = `Expires ${formatDate(endsAt)}`;
  } else if (startsAt) {
    detail = `From ${formatDate(startsAt)}`;
  }

  const fill = expired ? "var(--destructive)" : "var(--primary)";

  return { capacity, detail, fill, destructive: expired };
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
    TRIP_TYPES.length,
    "All trips",
    "Trips"
  );

  const description = display.description?.trim() || null;
  const heroTitle = display.title.trim() || display.code.trim() || "Coupon";
  const endsAt = display.conditions.endsAt;
  const startsAt = display.conditions.startsAt;
  const usage = usageStat(display.redemptionCount, display.conditions.maxRedemptions);
  const validity = validityStat(startsAt, endsAt);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showCloseButton={false}
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetTitle className="sr-only">{heroTitle}</SheetTitle>

        <div className="relative aspect-video w-full overflow-hidden">
          <Image
            src={DEFAULT_COUPON_BANNER}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 512px) 100vw, 512px"
            priority
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

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PromoRadialStat
              name="Usage"
              capacity={usage.capacity}
              detail={usage.detail}
              fill={usage.fill}
              destructive={usage.destructive}
            />
            <PromoRadialStat
              name="Validity"
              capacity={validity.capacity}
              detail={validity.detail}
              fill={validity.fill}
              destructive={validity.destructive}
            />
          </dl>
        </div>
      </SheetContent>
    </Sheet>
  );
}
