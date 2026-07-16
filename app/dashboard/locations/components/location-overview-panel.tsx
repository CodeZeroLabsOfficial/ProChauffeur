"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";

import { LocationDetailsCard } from "@/app/dashboard/locations/components/location-details-card";
import { LocationRecentTripsCard } from "@/app/dashboard/locations/components/location-recent-trips-card";
import { DriverProfileRevenueStat } from "@/app/dashboard/drivers/components/driver-profile-revenue-stat";
import { DriverProfileTrendChart } from "@/app/dashboard/drivers/components/driver-profile-trend-chart";
import type { DriverOverviewPeriod } from "@/app/dashboard/drivers/lib/driver-profile-overview-period";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Branch } from "@/lib/models";
import type { Invoice } from "@/lib/models/invoice";
import type { Trip } from "@/lib/models/trip";
import {
  fetchOperatingHours,
  fetchPricingConfiguration
} from "@/lib/services/firebase-service";
import { useVehicleClasses } from "@/hooks/use-collections";

function SetupRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {done ? (
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
      ) : (
        <Circle className="text-muted-foreground size-4 shrink-0" />
      )}
      <span className={done ? undefined : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

export function LocationOverviewPanel({
  branch,
  trips,
  invoices,
  period,
  onPeriodChange
}: {
  branch: Branch;
  trips: Trip[];
  invoices: Invoice[];
  period: DriverOverviewPeriod;
  onPeriodChange: (period: DriverOverviewPeriod) => void;
}) {
  const { vehicleClasses } = useVehicleClasses();
  const [hoursConfigured, setHoursConfigured] = useState(false);
  const [pricingConfigured, setPricingConfigured] = useState(false);

  const postcodeCount = useMemo(() => {
    if (branch.serviceArea?.type !== "postcodes") return 0;
    return (branch.serviceArea.postcodes ?? []).length;
  }, [branch.serviceArea]);

  const officeSet = Boolean(branch.officeAddressLine?.trim());
  const serviceAreaSet = postcodeCount > 0;
  const classesSet = vehicleClasses.length > 0;

  useEffect(() => {
    fetchOperatingHours(branch.id)
      .then((hours) => setHoursConfigured(hours.schedules.length > 0))
      .catch(() => setHoursConfigured(false));

    fetchPricingConfiguration(branch.id)
      .then(() => setPricingConfigured(true))
      .catch(() => setPricingConfigured(false));
  }, [branch.id]);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-1">
        <LocationDetailsCard branch={branch} />

        <Card>
          <CardHeader>
            <CardTitle>Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <SetupRow done={officeSet} label="Office" />
            <SetupRow done={serviceAreaSet} label="Service area" />
            <SetupRow done={hoursConfigured} label="Operating hours" />
            <SetupRow done={classesSet} label="Vehicle classes" />
            <SetupRow done={pricingConfigured} label="Pricing" />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 xl:col-span-2">
        <DriverProfileTrendChart trips={trips} period={period} onPeriodChange={onPeriodChange} />
        <div className="gap-4 space-y-4 lg:grid lg:grid-cols-2 lg:space-y-0">
          <DriverProfileRevenueStat invoices={invoices} period={period} />
          <LocationRecentTripsCard trips={trips} />
        </div>
      </div>
    </div>
  );
}
