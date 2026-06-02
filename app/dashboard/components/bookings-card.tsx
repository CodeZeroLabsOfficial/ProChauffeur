"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Info } from "lucide-react";

import { useTrips } from "@/hooks/use-collections";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  endOfDay,
  getMonthRange,
  getWeekRange,
  startOfDay,
  tripsInRange
} from "@/app/dashboard/lib/dashboard-metrics";

type Period = "daily" | "weekly" | "monthly" | "yearly";

function getPeriodRange(period: Period, now: Date) {
  switch (period) {
    case "daily": {
      const start = startOfDay(now);
      return { start, end: endOfDay(now) };
    }
    case "weekly":
      return getWeekRange(now, 0);
    case "monthly":
      return getMonthRange(now, 0);
    case "yearly": {
      const start = startOfDay(new Date(now.getFullYear(), 0, 1));
      const end = endOfDay(new Date(now.getFullYear(), 11, 31));
      return { start, end };
    }
  }
}

function countByStatus(trips: ReturnType<typeof useTrips>["trips"], start: Date, end: Date) {
  const inRange = tripsInRange(trips, start, end);
  const upcoming = inRange.filter(
    (t) => t.status === "requested" || t.status === "accepted" || t.status === "en_route_pickup" || t.status === "in_progress"
  ).length;
  const completed = inRange.filter((t) => t.status === "completed").length;
  return { total: inRange.length, upcoming, completed };
}

export function BookingsCard() {
  const { trips } = useTrips();
  const [period, setPeriod] = useState<Period>("monthly");

  const periods = [
    { value: "daily", label: "D" },
    { value: "weekly", label: "W" },
    { value: "monthly", label: "M" },
    { value: "yearly", label: "Y" }
  ] as const;

  const currentData = useMemo(() => {
    const { start, end } = getPeriodRange(period, new Date());
    return countByStatus(trips, start, end);
  }, [trips, period]);

  const total = currentData.upcoming + currentData.completed;
  const upcomingPercentage = total > 0 ? (currentData.upcoming / total) * 100 : 50;
  const completedPercentage = total > 0 ? (currentData.completed / total) * 100 : 50;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings</CardTitle>
        <CardAction>
          <Tabs value={period} onValueChange={(value) => setPeriod(value as Period)}>
            <TabsList>
              {periods.map((p) => (
                <TabsTrigger key={p.value} value={p.value}>
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold lg:text-3xl">
            {currentData.total.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-sm">Total bookings</span>
        </div>

        <Separator />

        <div className="flex h-12 w-full overflow-hidden rounded-lg">
          <div
            className="bg-green-500 transition-all duration-500 ease-out dark:bg-green-700"
            style={{ width: `${upcomingPercentage}%` }}
          />
          <div
            className="bg-primary/70 transition-all duration-500 ease-out"
            style={{ width: `${completedPercentage}%` }}
          />
        </div>

        <div className="flex justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">Upcoming</p>
            <p className="font-semibold lg:text-xl">{currentData.upcoming.toLocaleString()}</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-muted-foreground text-sm">Completed</p>
            <p className="font-semibold lg:text-xl">{currentData.completed.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border p-3">
          <Info className="text-muted-foreground h-4 w-4" />
          <span className="text-muted-foreground text-sm">
            View detailed booking analytics on the{" "}
            <Link href="/dashboard/reports" className="text-foreground underline-offset-4 hover:underline">
              reports page
            </Link>
            .
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
