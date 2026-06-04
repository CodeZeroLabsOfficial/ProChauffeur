"use client";

import type { Invoice } from "@/lib/models/invoice";
import type { Trip } from "@/lib/models";
import { BookingsCard } from "@/app/dashboard/components/bookings-card";
import { RevenueStat } from "@/app/dashboard/components/revenue-stat";
import { DriverProfileTrendChart } from "@/app/dashboard/drivers/components/driver-profile-trend-chart";

export function DriverProfileOverviewTab({
  trips,
  invoices
}: {
  trips: Trip[];
  invoices: Invoice[];
}) {
  return (
    <div className="space-y-4">
      <DriverProfileTrendChart trips={trips} />
      <div className="gap-4 space-y-4 lg:grid lg:grid-cols-2 lg:space-y-0">
        <RevenueStat invoices={invoices} />
        <BookingsCard trips={trips} />
      </div>
    </div>
  );
}
