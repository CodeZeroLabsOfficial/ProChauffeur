"use client";

import type { Invoice } from "@/lib/models/invoice";
import type { Trip } from "@/lib/models";
import type { DriverOverviewPeriod } from "@/app/dashboard/drivers/lib/driver-profile-overview-period";
import { DriverProfileRevenueStat } from "@/app/dashboard/drivers/components/driver-profile-revenue-stat";
import { VehicleProfileBookingsCard } from "@/app/dashboard/fleet/components/vehicle-profile-bookings-card";
import { VehicleProfileUtilizationChart } from "@/app/dashboard/fleet/components/vehicle-profile-utilization-chart";

export function VehicleProfileOverviewTab({
  trips,
  invoices,
  vehicleDocumentId,
  period,
  onPeriodChange
}: {
  trips: Trip[];
  invoices: Invoice[];
  vehicleDocumentId: string;
  period: DriverOverviewPeriod;
  onPeriodChange: (period: DriverOverviewPeriod) => void;
}) {
  return (
    <div className="space-y-4">
      <VehicleProfileUtilizationChart period={period} onPeriodChange={onPeriodChange} />
      <div className="gap-4 space-y-4 lg:grid lg:grid-cols-2 lg:space-y-0">
        <DriverProfileRevenueStat invoices={invoices} period={period} />
        <VehicleProfileBookingsCard
          trips={trips}
          period={period}
          vehicleDocumentId={vehicleDocumentId}
        />
      </div>
    </div>
  );
}
