"use client";

import type { Invoice } from "@/lib/models/invoice";
import type { Trip, User, Vehicle } from "@/lib/models";
import type { ProfileOverviewPeriod } from "@/lib/profile/overview-period";
import { vehicleProfileCompleteness } from "@/app/dashboard/fleet/lib/vehicle-profile-metrics";
import { AssignedDriverCard } from "@/app/dashboard/fleet/components/assigned-driver-card";
import { ProfileBookingsCard } from "@/components/profile/profile-bookings-card";
import { ProfileCompletenessCard } from "@/components/profile/profile-completeness-card";
import { ProfileRevenueStat } from "@/components/profile/profile-revenue-stat";
import { VehicleDetailsCard } from "@/app/dashboard/fleet/components/vehicle-details-card";
import { VehicleProfileUtilizationChart } from "@/app/dashboard/fleet/components/vehicle-profile-utilization-chart";

export function VehicleProfileOverviewTab({
  vehicle,
  assignedChauffeur,
  assignedChauffeurCategoryLabel,
  trips,
  invoices,
  vehicleDocumentId,
  period,
  onPeriodChange
}: {
  vehicle: Vehicle;
  assignedChauffeur: User | undefined;
  assignedChauffeurCategoryLabel: string | null;
  trips: Trip[];
  invoices: Invoice[];
  vehicleDocumentId: string;
  period: ProfileOverviewPeriod;
  onPeriodChange: (period: ProfileOverviewPeriod) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-1">
        <VehicleDetailsCard vehicle={vehicle} />
        <AssignedDriverCard
          assignedChauffeur={assignedChauffeur}
          categoryLabel={assignedChauffeurCategoryLabel}
        />
        <ProfileCompletenessCard value={vehicleProfileCompleteness(vehicle)} />
      </div>

      <div className="space-y-4 xl:col-span-2">
        <VehicleProfileUtilizationChart period={period} onPeriodChange={onPeriodChange} />
        <div className="gap-4 space-y-4 lg:grid lg:grid-cols-2 lg:space-y-0">
          <ProfileRevenueStat invoices={invoices} period={period} />
          <ProfileBookingsCard
            trips={trips}
            period={period}
            tripsHref={`/dashboard/fleet/${vehicleDocumentId}?tab=trips`}
          />
        </div>
      </div>
    </div>
  );
}
