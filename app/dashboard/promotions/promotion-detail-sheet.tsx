"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { MapPin, Power, Ticket, Users } from "lucide-react";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

import { ComplianceStat } from "@/components/compliance";
import { Card, CardContent } from "@/components/ui/card";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSheetDisplayItem } from "@/hooks/use-sheet-display-item";
import { TRIP_TYPES, type Branch, type Promotion } from "@/lib/models";
import { cn } from "@/lib/utils";

const DEFAULT_COUPON_BANNER = "/images/promotions/coupon-default-banner.png";

const usageChartConfig = {
  used: { label: "Used" }
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
    <div className="pointer-events-none absolute end-0 top-0 z-10 size-28 overflow-hidden">
      <div className="bg-black/45 absolute top-5 -right-10 flex w-40 rotate-45 items-center justify-center py-1.5 shadow-sm backdrop-blur-[2px]">
        <span className="text-[11px] font-semibold tracking-wide text-white/95 tabular-nums">
          {label}
        </span>
      </div>
    </div>
  );
}

function PromoUsageStat({
  used,
  max
}: {
  used: number;
  max: number | null | undefined;
}) {
  const hasLimit = max != null && max > 0;
  const pct = hasLimit ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const fill =
    hasLimit && pct >= 100
      ? "var(--destructive)"
      : hasLimit && pct >= 80
        ? "var(--warning)"
        : "var(--primary)";

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex shrink-0 items-center justify-center">
        <ChartContainer config={usageChartConfig} className="aspect-square size-[100px]">
          <RadialBarChart
            data={[{ used: hasLimit ? pct : Math.min(100, used > 0 ? 12 : 0) }]}
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
              dataKey="used"
              background
              cornerRadius={pct > 0 || used > 0 ? 6 : 0}
              fill={fill}
              angleAxisId={0}
            />
          </RadialBarChart>
        </ChartContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span
            className={cn(
              "text-base font-semibold tabular-nums",
              hasLimit && pct >= 100 && "text-destructive"
            )}>
            {hasLimit ? `${pct}%` : used}
          </span>
          <span className="text-muted-foreground mt-0.5 text-xs">
            {hasLimit ? "used" : "uses"}
          </span>
        </div>
      </div>

      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-medium">Usage</p>
        <p className="text-muted-foreground text-xs">
          {hasLimit ? `Limit ${max}` : "No redemption cap"}
        </p>
      </div>
    </div>
  );
}

function PromoMetricCard({ children }: { children: ReactNode }) {
  return (
    <Card className="gap-3 py-3 shadow-none">
      <CardContent>{children}</CardContent>
    </Card>
  );
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

          <div className="grid grid-cols-2 gap-3">
            <PromoMetricCard>
              <PromoUsageStat
                used={display.redemptionCount}
                max={display.conditions.maxRedemptions}
              />
            </PromoMetricCard>
            <PromoMetricCard>
              <ComplianceStat label="Validity" start={startsAt} expiry={endsAt} />
            </PromoMetricCard>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
