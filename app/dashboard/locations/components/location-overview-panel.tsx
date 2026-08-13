"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";

import { LocationDetailsCard } from "@/app/dashboard/locations/components/location-details-card";
import { LocationRecentTripsCard } from "@/app/dashboard/locations/components/location-recent-trips-card";
import { ProfileRevenueStat } from "@/components/profile/profile-revenue-stat";
import { ProfileBookingActivityChart } from "@/components/profile/profile-booking-activity-chart";
import type { ProfileOverviewPeriod } from "@/lib/profile/overview-period";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Branch } from "@/lib/models";
import type { Invoice } from "@/lib/models/invoice";
import type { Trip } from "@/lib/models/trip";
import {
  fetchOperatingHours,
  fetchOperatorLocale,
  fetchPricingConfiguration
} from "@/lib/services/firebase-service";
import { isServiceAreaConfigured } from "@/lib/branch/service-area";
import { useBranchVehicleClasses } from "@/hooks/use-branch-collections";

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
  period: ProfileOverviewPeriod;
  onPeriodChange: (period: ProfileOverviewPeriod) => void;
}) {
  const { vehicleClasses } = useBranchVehicleClasses(branch.id);
  const [hoursConfigured, setHoursConfigured] = useState(false);
  const [pricingConfigured, setPricingConfigured] = useState(false);
  const [localeConfigured, setLocaleConfigured] = useState(false);
  const [timezone, setTimezone] = useState<string | null>(null);

  const officeSet = Boolean(branch.officeAddressLine?.trim());
  const serviceAreaSet = isServiceAreaConfigured(branch.serviceArea);
  const classesSet = vehicleClasses.length > 0;

  useEffect(() => {
    setTimezone(null);
    fetchOperatingHours(branch.id)
      .then((hours) => setHoursConfigured(hours.schedules.length > 0))
      .catch(() => setHoursConfigured(false));

    fetchPricingConfiguration(branch.id)
      .then(() => setPricingConfigured(true))
      .catch(() => setPricingConfigured(false));

    fetchOperatorLocale(branch.id)
      .then((locale) => {
        setLocaleConfigured(true);
        setTimezone(locale.timezone);
      })
      .catch(() => {
        setLocaleConfigured(false);
        setTimezone(null);
      });
  }, [branch.id]);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-1">
        <LocationDetailsCard branch={branch} timezone={timezone} />

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
            <SetupRow done={localeConfigured} label="Locale" />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 xl:col-span-2">
        <ProfileBookingActivityChart trips={trips} period={period} onPeriodChange={onPeriodChange} />
        <div className="gap-4 space-y-4 lg:grid lg:grid-cols-2 lg:space-y-0">
          <ProfileRevenueStat invoices={invoices} period={period} />
          <LocationRecentTripsCard trips={trips} />
        </div>
      </div>
    </div>
  );
}
