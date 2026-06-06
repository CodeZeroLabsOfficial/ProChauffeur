"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Info } from "lucide-react";

import type { Trip } from "@/lib/models";
import {
  countBookingsInOverviewPeriod,
  overviewPeriodOption,
  type DriverOverviewPeriod
} from "@/app/dashboard/drivers/lib/driver-profile-overview-period";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function VehicleProfileBookingsCard({
  trips,
  period,
  vehicleDocumentId
}: {
  trips: Trip[];
  period: DriverOverviewPeriod;
  vehicleDocumentId: string;
}) {
  const currentData = useMemo(
    () => countBookingsInOverviewPeriod(trips, period),
    [trips, period]
  );

  const total = currentData.upcoming + currentData.completed;
  const upcomingPercentage = total > 0 ? (currentData.upcoming / total) * 100 : 50;
  const completedPercentage = total > 0 ? (currentData.completed / total) * 100 : 50;
  const periodLabel = overviewPeriodOption(period).label.toLowerCase();

  return (
    <Card>
      <CardHeader className="grid-cols-[1fr_auto]">
        <CardTitle>Bookings</CardTitle>
        <CardDescription>Trips {periodLabel}</CardDescription>
        <span className="col-start-2 row-start-1 justify-self-end text-2xl font-semibold lg:text-3xl">
          {currentData.total.toLocaleString()}
        </span>
        <span className="col-start-2 row-start-2 justify-self-end self-center text-muted-foreground text-sm">
          Total bookings
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
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
            View all trips on the{" "}
            <Link
              href={`/dashboard/fleet/${vehicleDocumentId}?tab=trips`}
              className="text-foreground underline-offset-4 hover:underline">
              Trips tab
            </Link>
            .
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
