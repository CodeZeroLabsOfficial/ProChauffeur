"use client";

import type { Vehicle } from "@/lib/models";
import { VehicleComplianceFields } from "@/app/dashboard/fleet/components/vehicle-compliance-fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VehicleProfileComplianceTab({
  vehicle,
  onVehicleUpdated
}: {
  vehicle: Vehicle;
  onVehicleUpdated?: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleComplianceFields
            vehicle={vehicle}
            onSaved={onVehicleUpdated}
            showSectionHeading={false}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Other compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Insurance, roadworthy, and fleet certification details coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
