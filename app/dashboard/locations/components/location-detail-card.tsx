import { CalendarDays, CheckCircle2, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { LocationWeeklyHeroMetrics } from "@/app/dashboard/locations/lib/location-profile-metrics";
import { formatCurrency } from "@/lib/format";
import type { Branch } from "@/lib/models";
import { Badge } from "@/components/ui/badge";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const tabTriggerClassName =
  "data-[state=active]:border-b-primary data-[state=active]:text-foreground text-muted-foreground rounded-none border-0 border-b-2 border-transparent bg-transparent! px-0 py-4 shadow-none!";

function formatHeroCurrency(value: number) {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (value >= 1000) {
    const thousands = value / 1000;
    return `$${thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)}K`;
  }
  return formatCurrency(value);
}

function formatKpiCurrency(value: number) {
  return value >= 1000
    ? formatCurrency(value).replace(/\.\d{2}$/, "")
    : formatCurrency(value);
}

function revenueCaption(metrics: LocationWeeklyHeroMetrics) {
  const previous = formatHeroCurrency(metrics.previousWeekRevenue);
  const change = metrics.revenueChangePercent;

  if (change === null) {
    return `Revenue this week compared to last week (${previous}).`;
  }

  if (change >= 0) {
    return `Revenue this week compared to last week. Up ${Math.abs(change).toFixed(0)}% from ${previous}.`;
  }

  return `Revenue this week compared to last week. Down ${Math.abs(change).toFixed(0)}% from ${previous}.`;
}

function WeeklyBarChart({
  data
}: {
  data: LocationWeeklyHeroMetrics["dailyRevenue"];
}) {
  const max = Math.max(...data.map((day) => day.revenue), 1);

  return (
    <div className="flex h-28 items-end justify-between gap-1.5 sm:gap-2">
      {data.map((day) => {
        const height = day.revenue > 0 ? Math.max((day.revenue / max) * 100, 12) : 6;
        return (
          <div key={day.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-20 w-full items-end justify-center">
              <div
                className={cn(
                  "w-full max-w-3 rounded-full",
                  day.isToday ? "bg-foreground" : "bg-muted"
                )}
                style={{ height: `${height}%` }}
              />
            </div>
            <span
              className={cn(
                "text-xs",
                day.isToday ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
              {day.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HeroKpiCard({
  icon: Icon,
  iconWrapClassName,
  iconClassName,
  label,
  value
}: {
  icon: LucideIcon;
  iconWrapClassName: string;
  iconClassName: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          iconWrapClassName
        )}>
        <Icon className={cn("size-5", iconClassName)} />
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-lg font-semibold tracking-tight tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function LocationDetailCard({
  branch,
  metrics
}: {
  branch: Branch;
  metrics: LocationWeeklyHeroMetrics;
}) {
  const change = metrics.revenueChangePercent;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-4 py-5 sm:px-6 md:px-8 md:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight lg:text-2xl">{branch.name}</h2>
          {branch.isActive ? (
            <Badge variant="secondary">Active</Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6 md:px-8 md:py-6">
        <div className="grid gap-5 lg:grid-cols-12 lg:gap-6">
          <div className="space-y-4 lg:col-span-8">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-3xl font-bold tracking-tight tabular-nums lg:text-4xl">
                  {formatHeroCurrency(metrics.weeklyRevenue)}
                </p>
                {change !== null ? (
                  <Badge variant="secondary" className="tabular-nums">
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(0)}%
                  </Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground max-w-xl text-sm">{revenueCaption(metrics)}</p>
            </div>
            <WeeklyBarChart data={metrics.dailyRevenue} />
          </div>

          <div className="flex flex-col gap-3 lg:col-span-4">
            <HeroKpiCard
              icon={Wallet}
              iconWrapClassName="bg-emerald-500/10"
              iconClassName="text-emerald-600"
              label="Revenue"
              value={formatKpiCurrency(metrics.revenue)}
            />
            <HeroKpiCard
              icon={CheckCircle2}
              iconWrapClassName="bg-rose-500/10"
              iconClassName="text-rose-600"
              label="Completed"
              value={metrics.completed.toLocaleString()}
            />
            <HeroKpiCard
              icon={CalendarDays}
              iconWrapClassName="bg-sky-500/10"
              iconClassName="text-sky-600"
              label="Trips"
              value={metrics.trips.toLocaleString()}
            />
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="px-4 sm:px-6 md:px-8">
          <TabsList
            className={cn(
              "-mb-0.5 h-auto! w-full justify-start gap-6 overflow-x-auto border-none bg-transparent p-0"
            )}>
            <TabsTrigger value="overview" className={tabTriggerClassName}>
              Overview
            </TabsTrigger>
            <TabsTrigger value="service-area" className={tabTriggerClassName}>
              Service area
            </TabsTrigger>
            <TabsTrigger value="hours" className={tabTriggerClassName}>
              Operating hours
            </TabsTrigger>
            <TabsTrigger value="classes" className={tabTriggerClassName}>
              Vehicle classes
            </TabsTrigger>
            <TabsTrigger value="pricing" className={tabTriggerClassName}>
              Pricing
            </TabsTrigger>
          </TabsList>
        </div>
      </div>
    </div>
  );
}
