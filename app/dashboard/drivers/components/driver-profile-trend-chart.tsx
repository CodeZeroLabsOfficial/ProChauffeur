"use client";

import { useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { tripPickupReferenceDate, type Trip } from "@/lib/models";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  endOfDay,
  getMonthRange,
  getWeekRange,
  isSameDay,
  percentChange,
  startOfDay,
  tripsInRange
} from "@/app/dashboard/lib/dashboard-metrics";

type RangeKey = "this-week" | "last-week" | "this-month";

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

function performanceComparisonLabel(range: RangeKey): string {
  switch (range) {
    case "this-week":
      return "Compared to last week";
    case "last-week":
      return "Compared to two weeks ago";
    case "this-month":
      return "Compared to last month";
  }
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
  switch (range) {
    case "this-week": {
      const { start, end } = getWeekRange(now, 0);
      const prev = getWeekRange(now, -1);
      const chartData = buildDailySeries(tripsInRange(trips, start, end), 7, end);
      const completed = countCompletedInRange(trips, start, end);
      const prevCompleted = countCompletedInRange(trips, prev.start, prev.end);
      return {
        booked: countBookedInRange(trips, start, end),
        completed,
        performanceChange: percentChange(completed, prevCompleted) ?? 0,
        chartData,
        ...chartYDomain(chartData)
      };
    }
    case "last-week": {
      const { start, end } = getWeekRange(now, -1);
      const prev = getWeekRange(now, -2);
      const chartData = buildDailySeries(tripsInRange(trips, start, end), 7, end);
      const completed = countCompletedInRange(trips, start, end);
      const prevCompleted = countCompletedInRange(trips, prev.start, prev.end);
      return {
        booked: countBookedInRange(trips, start, end),
        completed,
        performanceChange: percentChange(completed, prevCompleted) ?? 0,
        chartData,
        ...chartYDomain(chartData)
      };
    }
    case "this-month": {
      const { start, end } = getMonthRange(now, 0);
      const prev = getMonthRange(now, -1);
      const inRange = tripsInRange(trips, start, end);
      const days = Math.min(
        31,
        Math.max(7, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1)
      );
      const chartData = buildDailySeries(inRange, days, end);
      const completed = countCompletedInRange(trips, start, end);
      const prevCompleted = countCompletedInRange(trips, prev.start, prev.end);
      return {
        booked: countBookedInRange(trips, start, end),
        completed,
        performanceChange: percentChange(completed, prevCompleted) ?? 0,
        chartData,
        ...chartYDomain(chartData)
      };
    }
  }
}

export function DriverProfileTrendChart({ trips }: { trips: Trip[] }) {
  const [range, setRange] = useState<RangeKey>("this-week");
  const now = useMemo(() => new Date(), []);
  const metrics = useMemo(() => getRangeData(trips, range, now), [trips, range, now]);

  const performancePositive = metrics.performanceChange >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking activity</CardTitle>
        <CardAction>
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="min-w-44 shrink-0">
              <CalendarIcon className="text-muted-foreground size-4 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-week">This week</SelectItem>
              <SelectItem value="last-week">Last week</SelectItem>
              <SelectItem value="this-month">This month</SelectItem>
            </SelectContent>
          </Select>
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
              <span className="text-muted-foreground ml-1">
                {performanceComparisonLabel(range)}
              </span>
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
