"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Calendar, MapPin, Power, Ticket, Users } from "lucide-react";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

import { ComplianceStat } from "@/components/compliance";
import { DetailLabel, SectionHeading } from "@/components/detail-sheet-fields";
import { Card, CardContent } from "@/components/ui/card";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSheetDisplayItem } from "@/hooks/use-sheet-display-item";
import { formatDate } from "@/lib/format";
import { TRIP_TYPES, type Branch, type Promotion } from "@/lib/models";
import { cn } from "@/lib/utils";

const DEFAULT_COUPON_BANNER = "/images/promotions/coupon-default-banner.png";

const usageChartConfig = {
  used: { label: "Used" }
} satisfies ChartConfig;

function formatDiscountOffer(promo: Promotion): string {
  if (promo.type === "percent") {
    const pct = Math.round(promo.value * 10000) / 100;
    return `${pct}% OFF`;
  }
  return `${promo.value.toFixed(2)} OFF`;
}

function formatScopeCount(selected: number, total: number, allLabel: string, noun: string): string {
  if (selected === 0 || (total > 0 && selected >= total)) {
    return allLabel;
  }
  return `${selected}/${total} ${noun}`;
}

function SummaryField({
  icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <DetailLabel icon={icon}>{label}</DetailLabel>
      <p className="text-foreground text-sm tabular-nums">{value}</p>
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
        <p className="text-muted-foreground truncate text-xs tabular-nums">
          {hasLimit ? `${used} / ${max}` : `${used} redemptions`}
        </p>
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
    "All vehicle classes",
    "Vehicle Classes"
  );

  const tripTypeIds = display.conditions.tripTypes?.filter(Boolean) ?? [];
  const tripTypeSummary = formatScopeCount(
    tripTypeIds.length,
    TRIP_TYPES.length,
    "All trip types",
    "Trip Types"
  );

  const description = display.description?.trim() || null;
  const heroTitle = display.title.trim() || display.code.trim() || "Coupon";
  const endsAt = display.conditions.endsAt;
  const startsAt = display.conditions.startsAt;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Coupon details</SheetTitle>
        </SheetHeader>

        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <Image
            src={DEFAULT_COUPON_BANNER}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 512px) 100vw, 512px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/55 via-black/20 to-transparent" />
          <div className="absolute start-4 top-4 flex items-center gap-2">
            <Ticket className="size-10 shrink-0 text-white/30" aria-hidden />
            <p className="text-3xl font-semibold tracking-tight text-white tabular-nums drop-shadow-sm">
              {formatDiscountOffer(display)}
            </p>
          </div>
          <div className="absolute end-3 top-3">
            <DetailSheetIconBadge icon={Power}>
              {display.isEnabled ? "Active" : "Inactive"}
            </DetailSheetIconBadge>
          </div>
        </div>

        <div className="space-y-6 px-4 pt-6 pb-4">
          <div className="space-y-2">
            <p className="text-lg font-semibold">{heroTitle}</p>
            {description ? (
              <p className="text-muted-foreground text-sm">{description}</p>
            ) : null}
            {endsAt ? (
              <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <Calendar className="size-3.5 shrink-0 opacity-80" aria-hidden />
                Valid till {formatDate(endsAt)}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <SummaryField icon={MapPin} label="Locations" value={locationSummary} />
            <SummaryField icon={Ticket} label="Trip Types" value={tripTypeSummary} />
            <SummaryField icon={Users} label="Vehicle Classes" value={classSummary} />
          </div>

          <div className="space-y-4">
            <SectionHeading>Metrics</SectionHeading>
            <div className="grid gap-3 sm:grid-cols-2">
              <PromoMetricCard>
                <PromoUsageStat
                  used={display.redemptionCount}
                  max={display.conditions.maxRedemptions}
                />
              </PromoMetricCard>
              <PromoMetricCard>
                <ComplianceStat
                  label="Validity"
                  secondary={
                    startsAt && endsAt
                      ? `${formatDate(startsAt)} – ${formatDate(endsAt)}`
                      : startsAt
                        ? `From ${formatDate(startsAt)}`
                        : endsAt
                          ? `Until ${formatDate(endsAt)}`
                          : "Always valid"
                  }
                  start={startsAt}
                  expiry={endsAt}
                />
              </PromoMetricCard>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
