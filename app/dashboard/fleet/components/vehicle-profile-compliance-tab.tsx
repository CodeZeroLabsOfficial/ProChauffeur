"use client";

import { useState } from "react";

import type { Vehicle } from "@/lib/models";
import {
  VehicleCtpFields,
  VehicleInsuranceFields,
  VehicleRegistrationFields,
  VehicleRoadworthyFields
} from "@/app/dashboard/fleet/components/vehicle-compliance-fields";
import {
  saveVehicleFields
} from "@/app/dashboard/fleet/lib/save-vehicle-fields";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function VehicleProfileComplianceTab({
  vehicle,
  onVehicleUpdated
}: {
  vehicle: Vehicle;
  onVehicleUpdated?: () => void;
}) {
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  async function saveVehicle(patch: Partial<Vehicle>) {
    const result = await saveVehicleFields(vehicle, patch);
    if (result.ok) onVehicleUpdated?.();
    return result;
  }

  const shared = {
    vehicle,
    onSaved: onVehicleUpdated,
    showSectionHeading: false,
    activeFieldId,
    onActiveFieldIdChange: setActiveFieldId,
    saveVehicle
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleRegistrationFields {...shared} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compulsory Third Party</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleCtpFields {...shared} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle insurance</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleInsuranceFields {...shared} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roadworthy</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleRoadworthyFields {...shared} />
        </CardContent>
      </Card>
    </div>
  );
}
