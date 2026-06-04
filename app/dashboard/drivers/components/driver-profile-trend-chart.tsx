"use client";

import { useEffect, useMemo, useState } from "react";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";
import { tripPickupReferenceDate, type Trip } from "@/lib/models";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  endOfDay,
  isSameDay,
  percentChange,
  startOfDay,
  tripsInRange
} from "@/app/dashboard/lib/dashboard-metrics";

type RangeKey = "7d" | "30d" | "90d" | "1y";

const RANGE_OPTIONS: { value: RangeKey; label: string; shortLabel: string; days: number }[] = [
  { value: "7d", label: "Last 7 days", shortLabel: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", shortLabel: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", shortLabel: "Last 90 days", days: 90 },
  { value: "1y", label: "Last year", shortLabel: "Last year", days: 365 }
];

const chartConfig = {
  completed: {
    label: "Completed",
    color: "var(--chart-1)"
  },
  booked: {
    label: "Booked",
    color: "var(--chart-4)"
  }
};

function rollingWindow(reference: Date, days: number) {
  const end = endOfDay(reference);
  const start = startOfDay(new Date(reference));
  start.setDate(start.getDate() - (days - 1));
  return { start, end };
}

function previousWindow(windowStart: Date, days: number) {
  const prevEnd = endOfDay(new Date(windowStart));
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = startOfDay(new Date(prevEnd));
  prevStart.setDate(prevStart.getDate() - (days - 1));
  return { start: prevStart, end: prevEnd };
}

function buildDailySeries(trips: Trip[], days: number, end: Date) {
  const buckets: { date: string; booked: number; completed: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(new Date(end));
    d.setDate(end.getDate() - i);
    buckets.push({
      date: new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(d),
      booked: 0,
      completed: 0
    });
  }

  for (const trip of trips) {
    const ref = tripPickupReferenceDate(trip);
    const bucket = buckets.find((b, idx) => {
      const d = startOfDay(new Date(end));
      d.setDate(end.getDate() - (days - 1 - idx));
      return isSameDay(d, ref);
    });
    if (!bucket) continue;
    if (trip.status === "completed") bucket.completed += 1;
    else if (trip.status !== "cancelled") bucket.booked += 1;
  }

  return buckets;
}

/** Active (non-completed) bookings in the period — aligns with daily "booked" series. */
function countBookedInRange(trips: Trip[], start: Date, end: Date) {
  return tripsInRange(trips, start, end).filter(
    (t) => t.status !== "cancelled" && t.status !== "completed"
  ).length;
}

function countCompletedInRange(trips: Trip[], start: Date, end: Date) {
  return tripsInRange(trips, start, end).filter((t) => t.status === "completed").length;
}

function chartYDomain(chartData: { booked: number; completed: number }[]) {
  const max = Math.max(1, ...chartData.flatMap((d) => [d.booked, d.completed]));
  const step = max <= 5 ? 1 : max <= 20 ? 5 : 10;
  const ceiling = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= ceiling; v += step) ticks.push(v);
  return { domain: [0, ceiling] as [number, number], ticks };
}

function getRangeData(trips: Trip[], range: RangeKey, now: Date) {
  const option = RANGE_OPTIONS.find((o) => o.value === range) ?? RANGE_OPTIONS[1];
  const { start, end } = rollingWindow(now, option.days);
  const prev = previousWindow(start, option.days);
  const inRange = tripsInRange(trips, start, end);
  const chartData = buildDailySeries(inRange, option.days, end);
  const completed = countCompletedInRange(trips, start, end);
  const prevCompleted = countCompletedInRange(trips, prev.start, prev.end);

  return {
    booked: countBookedInRange(trips, start, end),
    completed,
    performanceChange: percentChange(completed, prevCompleted) ?? 0,
    chartData,
    descriptionLabel: option.label.toLowerCase(),
    ...chartYDomain(chartData)
  };
}

function PeriodSelector({
  value,
  onChange
}: {
  value: RangeKey;
  onChange: (value: RangeKey) => void;
}) {
  return (
    <>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(next) => next && onChange(next as RangeKey)}
        variant="outline"
        className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex">
        {RANGE_OPTIONS.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Select value={value} onValueChange={(v) => onChange(v as RangeKey)}>
        <SelectTrigger
          className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
          size="sm"
          aria-label="Select period">
          <SelectValue placeholder="Last 30 days" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value} className="rounded-lg">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}

export function DriverProfileTrendChart({ trips }: { trips: Trip[] }) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = useState<RangeKey>("30d");
  const now = useMemo(() => new Date(), []);
  const metrics = useMemo(() => getRangeData(trips, timeRange, now), [trips, timeRange, now]);

  useEffect(() => {
    if (isMobile) setTimeRange("7d");
  }, [isMobile]);

  const performancePositive = metrics.performanceChange >= 0;
  const selectedOption = RANGE_OPTIONS.find((o) => o.value === timeRange) ?? RANGE_OPTIONS[1];

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Booking activity</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Total for the {metrics.descriptionLabel}
          </span>
          <span className="@[540px]/card:hidden">{selectedOption.shortLabel}</span>
        </CardDescription>
        <CardAction>
          <PeriodSelector value={timeRange} onChange={setTimeRange} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid items-end gap-4 lg:grid-cols-2 lg:gap-6">
          <div className="order-2 grid grid-cols-2 divide-x rounded-lg border lg:order-1">
            <div className="space-y-1 p-4">
              <p className="text-muted-foreground text-sm">Booked</p>
              <p className="text-xl font-semibold lg:text-2xl">{metrics.booked}</p>
            </div>
            <div className="space-y-1 p-4">
              <p className="text-muted-foreground text-sm">Completed</p>
              <p className="text-xl font-semibold lg:text-2xl">{metrics.completed}</p>
            </div>
          </div>
          <div className="order-1 space-y-1 lg:order-2 lg:text-end">
            <p>Performance</p>
            <p className="text-sm">
              <span className={performancePositive ? "text-green-500" : "text-red-500"}>
                {performancePositive ? "+" : ""}
                {metrics.performanceChange.toFixed(1)}%
              </span>
              <span className="text-muted-foreground ml-1">Compared to previous period</span>
            </p>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="aspect-video w-full md:h-[180px]">
          <LineChart
            data={metrics.chartData}
            margin={{ top: 20, right: 20, bottom: 20, left: -15 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              dy={10}
              interval="preserveStartEnd"
              minTickGap={32}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              dx={-10}
              domain={metrics.domain}
              ticks={metrics.ticks}
              allowDecimals={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="completed" stroke="var(--color-completed)" dot={false} />
            <Line type="monotone" dataKey="booked" stroke="var(--color-booked)" dot={false} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
