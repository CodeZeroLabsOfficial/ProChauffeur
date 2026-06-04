"use client";

import { useMemo } from "react";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { tripPickupReferenceDate, type Trip } from "@/lib/models";
import {
  overviewPeriodOption,
  overviewPeriodDays,
  overviewPeriodRanges,
  type DriverOverviewPeriod
} from "@/app/dashboard/drivers/lib/driver-profile-overview-period";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  isSameDay,
  percentChange,
  startOfDay,
  tripsInRange
} from "@/app/dashboard/lib/dashboard-metrics";

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

function getRangeData(trips: Trip[], period: DriverOverviewPeriod, now: Date) {
  const days = overviewPeriodDays(period);
  const { current, previous } = overviewPeriodRanges(period, now);
  const inRange = tripsInRange(trips, current.start, current.end);
  const chartData = buildDailySeries(inRange, days, current.end);
  const completed = countCompletedInRange(trips, current.start, current.end);
  const prevCompleted = countCompletedInRange(trips, previous.start, previous.end);

  return {
    booked: countBookedInRange(trips, current.start, current.end),
    completed,
    performanceChange: percentChange(completed, prevCompleted) ?? 0,
    chartData,
    descriptionLabel: overviewPeriodOption(period).label.toLowerCase(),
    ...chartYDomain(chartData)
  };
}

export function DriverProfileTrendChart({
  trips,
  period
}: {
  trips: Trip[];
  period: DriverOverviewPeriod;
}) {
  const now = useMemo(() => new Date(), []);
  const metrics = useMemo(() => getRangeData(trips, period, now), [trips, period, now]);
  const selectedOption = overviewPeriodOption(period);
  const performancePositive = metrics.performanceChange >= 0;

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
