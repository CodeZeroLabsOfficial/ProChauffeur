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
  scheduled: { label: "Scheduled", color: "var(--chart-1)" },
  completed: { label: "Completed", color: "var(--chart-4)" }
};

function buildDailySeries(trips: Trip[], days: number, end: Date) {
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

function getRangeData(trips: Trip[], range: RangeKey, now: Date) {
  switch (range) {
    case "this-week": {
      const { start, end } = getWeekRange(now, 0);
      const prev = getWeekRange(now, -1);
      const inRange = tripsInRange(trips, start, end);
      const completed = inRange.filter((t) => t.status === "completed").length;
      const prevCompleted = tripsInRange(trips, prev.start, prev.end).filter(
        (t) => t.status === "completed"
      ).length;
      return {
        performanceChange: percentChange(completed, prevCompleted) ?? 0,
        chartData: buildDailySeries(trips, 7, end)
      };
    }
    case "last-week": {
      const { start, end } = getWeekRange(now, -1);
      const prev = getWeekRange(now, -2);
      const inRange = tripsInRange(trips, start, end);
      const completed = inRange.filter((t) => t.status === "completed").length;
      const prevCompleted = tripsInRange(trips, prev.start, prev.end).filter(
        (t) => t.status === "completed"
      ).length;
      return {
        performanceChange: percentChange(completed, prevCompleted) ?? 0,
        chartData: buildDailySeries(trips, 7, end)
      };
    }
    case "this-month": {
      const { start, end } = getMonthRange(now, 0);
      const prev = getMonthRange(now, -1);
      const inRange = tripsInRange(trips, start, end);
      const completed = inRange.filter((t) => t.status === "completed").length;
      const prevCompleted = tripsInRange(trips, prev.start, prev.end).filter(
        (t) => t.status === "completed"
      ).length;
      const days = Math.min(
        31,
        Math.max(7, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1)
      );
      return {
        performanceChange: percentChange(completed, prevCompleted) ?? 0,
        chartData: buildDailySeries(trips, days, end)
      };
    }
  }
}

export function DriverProfileTrendChart({ trips }: { trips: Trip[] }) {
  const [range, setRange] = useState<RangeKey>("this-month");
  const now = useMemo(() => new Date(), []);
  const { chartData, performanceChange } = useMemo(
    () => getRangeData(trips, range, now),
    [trips, range, now]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking activity</CardTitle>
        <CardAction>
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-[140px]">
              <CalendarIcon className="text-muted-foreground size-4" />
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
        <p className="text-muted-foreground mb-4 text-sm">
          Completed trips{" "}
          <span
            className={
              performanceChange >= 0 ? "text-green-600" : "text-red-600"
            }>{`${performanceChange >= 0 ? "+" : ""}${performanceChange.toFixed(1)}%`}</span>{" "}
          vs prior period
        </p>
        <ChartContainer config={chartConfig} className="aspect-[2/1] w-full max-h-[280px]">
          <LineChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="scheduled"
              stroke="var(--color-scheduled)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="var(--color-completed)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
