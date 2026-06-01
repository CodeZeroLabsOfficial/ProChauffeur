"use client";

import { useEffect, useState } from "react";

import { useFleetLocations, useUsers, useVehicles } from "@/hooks/use-collections";
import { fetchGlobalLimits, fetchOperatingHours } from "@/lib/services/firebase-service";
import { capLabel, type AppGlobalLimits } from "@/lib/models";
import { appConfig } from "@/lib/env";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanyOverviewPage() {
  const { users } = useUsers();
  const { vehicles } = useVehicles();
  const { locations } = useFleetLocations();
  const [limits, setLimits] = useState<AppGlobalLimits | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);

  useEffect(() => {
    fetchGlobalLimits().then(setLimits).catch(() => setLimits(null));
    fetchOperatingHours()
      .then((h) => setTimezone(h.timeZoneIdentifier ?? null))
      .catch(() => setTimezone(null));
  }, []);

  const admins = users.filter((u) => u.role === "admin").length;
  const drivers = users.filter((u) => u.role === "driver").length;

  const cards = [
    { label: "Admins", value: limits ? `${admins} / ${capLabel(limits.maxAdmins)}` : `${admins}` },
    { label: "Chauffeurs", value: limits ? `${drivers} / ${capLabel(limits.maxDrivers)}` : `${drivers}` },
    {
      label: "Locations",
      value: limits ? `${locations.length} / ${capLabel(limits.maxLocations)}` : `${locations.length}`
    },
    { label: "Fleet vehicles", value: `${vehicles.length}` }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <p className="text-muted-foreground text-sm">{c.label}</p>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operating profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-sm">Subscription tier</p>
            <p className="font-medium">{limits?.subscriptionTier || "Not set"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Operating time zone</p>
            <p className="font-medium">{timezone || appConfig.timezone}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Default currency</p>
            <p className="font-medium">{appConfig.currency}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Locale</p>
            <p className="font-medium">{appConfig.locale}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
