"use client";

import type { Invoice } from "@/lib/models/invoice";
import type { Trip } from "@/lib/models";
import type { DriverOverviewPeriod } from "@/app/dashboard/drivers/lib/driver-profile-overview-period";
import { DriverProfileTrendChart } from "@/app/dashboard/drivers/components/driver-profile-trend-chart";
import { DriverProfileRevenueStat } from "@/app/dashboard/drivers/components/driver-profile-revenue-stat";
import { CustomerProfileBookingsCard } from "@/app/dashboard/customers/components/customer-profile-bookings-card";

export function CustomerProfileOverviewTab({
  trips,
  invoices,
  customerId,
  period,
  onPeriodChange
}: {
  trips: Trip[];
  invoices: Invoice[];
  customerId: string;
  period: DriverOverviewPeriod;
  onPeriodChange: (period: DriverOverviewPeriod) => void;
}) {
  return (
    <div className="space-y-4">
      <DriverProfileTrendChart trips={trips} period={period} onPeriodChange={onPeriodChange} />
      <div className="gap-4 space-y-4 lg:grid lg:grid-cols-2 lg:space-y-0">
        <DriverProfileRevenueStat invoices={invoices} period={period} />
        <CustomerProfileBookingsCard trips={trips} period={period} customerId={customerId} />
      </div>
    </div>
  );
}
