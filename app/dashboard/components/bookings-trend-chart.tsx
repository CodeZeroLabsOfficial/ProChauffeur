"use client";

import { useMemo, useState } from "react";
import { CalendarIcon, Download } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { useTrips } from "@/hooks/use-collections";
import { tripPickupReferenceDate } from "@/lib/models";
import { Button } from "@/components/ui/button";
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

type RangeKey = "this-week" | "last-week" | "this-month" | "last-month" | "last-3-months";

const chartConfig = {
  scheduled: {
    label: "Scheduled",
    color: "var(--chart-1)"
  },
  completed: {
    label: "Completed",
    color: "var(--chart-4)"
  }
};

function buildDailySeries(trips: ReturnType<typeof useTrips>["trips"], days: number, end: Date) {
  const buckets: { date: string; scheduled: number; completed: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(new Date(end));
    d.setDate(end.getDate() - i);
    buckets.push({
      date: new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(d),
      scheduled: 0,
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
    else if (trip.status !== "cancelled") bucket.scheduled += 1;
  }

  return buckets;
}

function getRangeData(trips: ReturnType<typeof useTrips>["trips"], range: RangeKey, now: Date) {
  switch (range) {
    case "this-week": {
      const { start, end } = getWeekRange(now, 0);
      const prev = getWeekRange(now, -1);
      const inRange = tripsInRange(trips, start, end);
      const scheduled = inRange.filter((t) => t.status !== "completed" && t.status !== "cancelled")
        .length;
      const completed = inRange.filter((t) => t.status === "completed").length;
      const prevInRange = tripsInRange(trips, prev.start, prev.end);
      const prevTotal = prevInRange.filter((t) => t.status === "completed").length;
      return {
        scheduled,
        completed,
        performanceChange: percentChange(completed, prevTotal) ?? 0,
        chartData: buildDailySeries(trips, 7, end)
      };
    }
    case "last-week": {
      const { start, end } = getWeekRange(now, -1);
      const prev = getWeekRange(now, -2);
      const inRange = tripsInRange(trips, start, end);
      const scheduled = inRange.filter((t) => t.status !== "completed" && t.status !== "cancelled")
        .length;
      const completed = inRange.filter((t) => t.status === "completed").length;
      const prevInRange = tripsInRange(trips, prev.start, prev.end);
      const prevTotal = prevInRange.filter((t) => t.status === "completed").length;
      return {
        scheduled,
        completed,
        performanceChange: percentChange(completed, prevTotal) ?? 0,
        chartData: buildDailySeries(trips, 7, end)
      };
    }
    case "this-month": {
      const { start, end } = getMonthRange(now, 0);
      const prev = getMonthRange(now, -1);
      const inRange = tripsInRange(trips, start, end);
      const scheduled = inRange.filter((t) => t.status !== "completed" && t.status !== "cancelled")
        .length;
      const completed = inRange.filter((t) => t.status === "completed").length;
      const prevInRange = tripsInRange(trips, prev.start, prev.end);
      const prevTotal = prevInRange.filter((t) => t.status === "completed").length;
      const dayCount = end.getDate();
      return {
        scheduled,
        completed,
        performanceChange: percentChange(completed, prevTotal) ?? 0,
        chartData: buildDailySeries(trips, Math.min(dayCount, 14), end)
      };
    }
    case "last-month": {
      const { start, end } = getMonthRange(now, -1);
      const prev = getMonthRange(now, -2);
      const inRange = tripsInRange(trips, start, end);
      const scheduled = inRange.filter((t) => t.status !== "completed" && t.status !== "cancelled")
        .length;
      const completed = inRange.filter((t) => t.status === "completed").length;
      const prevInRange = tripsInRange(trips, prev.start, prev.end);
      const prevTotal = prevInRange.filter((t) => t.status === "completed").length;
      const dayCount = end.getDate();
      return {
        scheduled,
        completed,
        performanceChange: percentChange(completed, prevTotal) ?? 0,
        chartData: buildDailySeries(trips, Math.min(dayCount, 14), end)
      };
    }
    case "last-3-months": {
      const end = endOfDay(now);
      const start = startOfDay(new Date(now.getFullYear(), now.getMonth() - 2, 1));
      const prevStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - 5, 1));
      const prevEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() - 2, 0));
      const inRange = tripsInRange(trips, start, end);
      const scheduled = inRange.filter((t) => t.status !== "completed" && t.status !== "cancelled")
        .length;
      const completed = inRange.filter((t) => t.status === "completed").length;
      const prevInRange = tripsInRange(trips, prevStart, prevEnd);
      const prevTotal = prevInRange.filter((t) => t.status === "completed").length;
      const chartData = [0, 1, 2].map((offset) => {
        const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth() - (2 - offset), 1));
        const monthEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() - (2 - offset) + 1, 0));
        const monthTrips = tripsInRange(trips, monthStart, monthEnd);
        return {
          date: new Intl.DateTimeFormat("en-AU", { month: "short" }).format(monthStart),
          scheduled: monthTrips.filter((t) => t.status !== "completed" && t.status !== "cancelled")
            .length,
          completed: monthTrips.filter((t) => t.status === "completed").length
        };
      });
      return {
        scheduled,
        completed,
        performanceChange: percentChange(completed, prevTotal) ?? 0,
        chartData
      };
    }
  }
}

export function BookingsTrendChart() {
  const { trips } = useTrips();
  const [dateRange, setDateRange] = useState<RangeKey>("this-week");

  const campaignData = useMemo(
    () => getRangeData(trips, dateRange, new Date()),
    [trips, dateRange]
  );

  const maxY = Math.max(
    ...campaignData.chartData.flatMap((d) => [d.scheduled, d.completed]),
    5
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings overview</CardTitle>
        <CardAction className="flex gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as RangeKey)}>
            <SelectTrigger>
              <CalendarIcon />
              <div className="hidden lg:flex">
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="last-3-months">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid items-end gap-4 lg:grid-cols-2 lg:gap-6">
          <div className="order-2 grid grid-cols-2 divide-x rounded-lg border lg:order-1">
            <div className="space-y-1 p-4">
              <p className="text-muted-foreground text-sm">Scheduled</p>
              <p className="text-xl font-semibold lg:text-2xl">{campaignData.scheduled}</p>
            </div>
            <div className="space-y-1 p-4">
              <p className="text-muted-foreground text-sm">Completed</p>
              <p className="text-xl font-semibold lg:text-2xl">{campaignData.completed}</p>
            </div>
          </div>
          <div className="order-1 space-y-1 lg:order-2 lg:text-end">
            <p>Performance</p>
            <p className="text-sm">
              <span className={campaignData.performanceChange >= 0 ? "text-green-500" : "text-red-500"}>
                {campaignData.performanceChange >= 0 ? "+" : ""}
                {campaignData.performanceChange.toFixed(0)}%
              </span>
              <span className="text-muted-foreground ml-1">Compared to previous period</span>
            </p>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="aspect-video w-full md:h-[180px]">
          <LineChart
            data={campaignData.chartData}
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
              domain={[0, maxY]}
              allowDecimals={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="scheduled"
              stroke="var(--color-scheduled)"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="var(--color-completed)"
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
