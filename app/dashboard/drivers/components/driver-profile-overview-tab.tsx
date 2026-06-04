"use client";

import { useState } from "react";

import type { Invoice } from "@/lib/models/invoice";
import type { Trip } from "@/lib/models";
import type { DriverOverviewPeriod } from "@/app/dashboard/drivers/lib/driver-profile-overview-period";
import { DriverProfileBookingsCard } from "@/app/dashboard/drivers/components/driver-profile-bookings-card";
import { DriverProfileOverviewPeriodSelector } from "@/app/dashboard/drivers/components/driver-profile-overview-period-selector";
import { DriverProfileRevenueStat } from "@/app/dashboard/drivers/components/driver-profile-revenue-stat";
import { DriverProfileTrendChart } from "@/app/dashboard/drivers/components/driver-profile-trend-chart";

export function DriverProfileOverviewTab({
  trips,
  invoices,
  driverId
}: {
  trips: Trip[];
  invoices: Invoice[];
  driverId: string;
}) {
  const [period, setPeriod] = useState<DriverOverviewPeriod>("30d");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">Period</p>
        <DriverProfileOverviewPeriodSelector value={period} onChange={setPeriod} />
      </div>

      <DriverProfileTrendChart trips={trips} period={period} />
      <div className="gap-4 space-y-4 lg:grid lg:grid-cols-2 lg:space-y-0">
        <DriverProfileRevenueStat invoices={invoices} period={period} />
        <DriverProfileBookingsCard trips={trips} period={period} driverId={driverId} />
      </div>
    </div>
  );
}
