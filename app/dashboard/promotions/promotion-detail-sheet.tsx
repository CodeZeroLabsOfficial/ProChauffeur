"use client";

import type { ReactNode } from "react";
import { BadgePercent, Hash, MapPin, Power, Ticket, Type, Users } from "lucide-react";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

import { ComplianceStat } from "@/components/compliance";
import { DetailLabel, SectionHeading } from "@/components/detail-sheet-fields";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSheetDisplayItem } from "@/hooks/use-sheet-display-item";
import { formatDate } from "@/lib/format";
import { tripTypeTitle, type Branch, type Promotion, type TripType } from "@/lib/models";
import { cn } from "@/lib/utils";

const usageChartConfig = {
  used: { label: "Used" }
} satisfies ChartConfig;

function formatDiscount(promo: Promotion): string {
  if (promo.type === "percent") {
    return `${Math.round(promo.value * 10000) / 100}%`;
  }
  return promo.value.toFixed(2);
}

function formatUsageLimit(max: number | null | undefined): string {
  if (max == null) return "Unlimited";
  return String(max);
}

function formatTripTypes(tripTypes: TripType[] | null | undefined): string {
  const ids = tripTypes?.filter(Boolean) ?? [];
  if (ids.length === 0) return "All trip types";
  return ids.map((id) => tripTypeTitle[id] ?? id).join(", ");
}

function DetailValue({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <dd className={muted ? "text-muted-foreground text-sm" : "text-foreground text-sm"}>
      {children}
    </dd>
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

function PromoPlainStat({ label, value }: { label: string; value: string }) {
  return (
    <PromoMetricCard>
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="mt-1 text-sm font-medium tabular-nums">{value}</p>
    </PromoMetricCard>
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
  const locationNames =
    branchIds.length === 0
      ? "All Locations"
      : branchIds
          .map((id) => branches.find((branch) => branch.id === id)?.name ?? id)
          .join(", ");

  const classIds = display.conditions.vehicleClassIds?.filter(Boolean) ?? [];
  const classNames =
    classIds.length === 0
      ? "All vehicle classes"
      : classIds
          .map(
            (id) => vehicleClasses.find((vehicleClass) => vehicleClass.id === id)?.displayName ?? id
          )
          .join(", ");

  const description = display.description?.trim() || null;
  const minFare = display.conditions.minimumSubtotal;
  const perCustomer = display.conditions.perCustomerLimit;
  const heroTitle = display.title.trim() || display.code || "Coupon";
  const endsAt = display.conditions.endsAt;
  const startsAt = display.conditions.startsAt;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Coupon details</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div className="inline-flex items-center gap-4 align-top">
            <div className="border-background bg-muted relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 shadow-xs shadow-black/10">
              <Ticket className="text-muted-foreground size-8" aria-hidden />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold">{heroTitle}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-md px-2 py-1 font-mono">
                  {display.code}
                </Badge>
                <DetailSheetIconBadge icon={Power}>
                  {display.isEnabled ? "Active" : "Inactive"}
                </DetailSheetIconBadge>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <SectionHeading>Details</SectionHeading>
              <dl className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <DetailLabel icon={Hash}>Coupon code</DetailLabel>
                  <DetailValue>
                    <span className="font-mono">{display.code || "—"}</span>
                  </DetailValue>
                </div>
                <div className="space-y-1">
                  <DetailLabel icon={Type}>Title</DetailLabel>
                  <DetailValue muted={!display.title.trim()}>
                    {display.title.trim() || "—"}
                  </DetailValue>
                </div>
                <div className="col-span-2 space-y-1">
                  <DetailLabel icon={Ticket}>Description</DetailLabel>
                  <DetailValue muted={!description}>{description || "—"}</DetailValue>
                </div>
                <div className="space-y-1">
                  <DetailLabel icon={BadgePercent}>Discount type</DetailLabel>
                  <DetailValue>
                    {display.type === "percent" ? "Percent" : "Fixed amount"}
                  </DetailValue>
                </div>
                <div className="space-y-1">
                  <DetailLabel icon={BadgePercent}>Discount value</DetailLabel>
                  <DetailValue>{formatDiscount(display)}</DetailValue>
                </div>
                <div className="col-span-2 space-y-1">
                  <DetailLabel icon={MapPin}>Locations</DetailLabel>
                  <DetailValue>{locationNames}</DetailValue>
                </div>
                <div className="space-y-1">
                  <DetailLabel icon={Ticket}>Trip types</DetailLabel>
                  <DetailValue>{formatTripTypes(display.conditions.tripTypes)}</DetailValue>
                </div>
                <div className="space-y-1">
                  <DetailLabel icon={Users}>Vehicle classes</DetailLabel>
                  <DetailValue>{classNames}</DetailValue>
                </div>
              </dl>
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
                <PromoPlainStat
                  label="Minimum fare"
                  value={minFare == null ? "None" : String(minFare)}
                />
                <PromoPlainStat
                  label="Per customer"
                  value={formatUsageLimit(perCustomer)}
                />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
