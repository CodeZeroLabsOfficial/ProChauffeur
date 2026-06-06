"use client";

import { useState } from "react";
import { Calendar, Landmark, RectangleHorizontal } from "lucide-react";

import type { Vehicle } from "@/lib/models";
import { DetailLabel } from "@/components/detail-sheet-fields";
import { ExpiryBadge, expiryWarning } from "@/components/expiry-badge";
import { InlineEditableDateField } from "@/components/inline-editable-date-field";
import { InlineEditableField } from "@/components/inline-editable-field";
import {
  nullableTrim,
  saveVehicleFields
} from "@/app/dashboard/fleet/lib/save-vehicle-fields";

export function VehicleComplianceFields({
  vehicle,
  onSaved,
  showSectionHeading = true
}: {
  vehicle: Vehicle;
  onSaved?: () => void;
  showSectionHeading?: boolean;
}) {
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const regoExpiryWarn = expiryWarning(vehicle.registrationExpiry);

  async function saveVehicle(patch: Partial<Vehicle>) {
    const result = await saveVehicleFields(vehicle, patch);
    if (result.ok) onSaved?.();
    return result;
  }

  return (
    <div className="space-y-4">
      {showSectionHeading ? (
        <p className="text-sm font-medium">Registration details</p>
      ) : null}
      <dl className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <DetailLabel icon={Landmark}>Rego state</DetailLabel>
          <dd>
            <InlineEditableField
              fieldId="regoState"
              activeFieldId={activeFieldId}
              onActiveFieldIdChange={setActiveFieldId}
              value={vehicle.registrationJurisdictionCode?.trim() ?? ""}
              editLabel="rego state"
              placeholder="NSW"
              onSave={async (next) =>
                saveVehicle({ registrationJurisdictionCode: nullableTrim(next) })
              }
            />
          </dd>
        </div>
        <div className="space-y-1">
          <DetailLabel icon={RectangleHorizontal}>Plate</DetailLabel>
          <dd>
            <InlineEditableField
              fieldId="plate"
              activeFieldId={activeFieldId}
              onActiveFieldIdChange={setActiveFieldId}
              value={vehicle.licensePlate?.trim() ?? ""}
              editLabel="plate"
              placeholder="Plate number"
              onSave={async (next) => saveVehicle({ licensePlate: next.trim() })}
            />
          </dd>
        </div>
        <div className="col-span-2 space-y-1">
          <DetailLabel icon={Calendar}>Rego expiry</DetailLabel>
          <dd>
            <InlineEditableDateField
              fieldId="regoExpiry"
              activeFieldId={activeFieldId}
              onActiveFieldIdChange={setActiveFieldId}
              value={vehicle.registrationExpiry}
              editLabel="rego expiry"
              dateRange="expiry"
              trailingContent={
                regoExpiryWarn ? <ExpiryBadge level={regoExpiryWarn} /> : null
              }
              onSave={async (next) => saveVehicle({ registrationExpiry: next })}
            />
          </dd>
        </div>
      </dl>
    </div>
  );
}
