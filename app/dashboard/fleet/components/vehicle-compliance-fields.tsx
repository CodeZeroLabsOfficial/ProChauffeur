"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Building2,
  Calendar,
  FileText,
  Landmark,
  RectangleHorizontal,
  Shield,
  ShieldCheck
} from "lucide-react";

import type { Vehicle } from "@/lib/models";
import {
  parseVehicleInsurancePolicyType,
  VEHICLE_INSURANCE_POLICY_TYPE_OPTIONS
} from "@/lib/vehicle-insurance";
import { DetailLabel } from "@/components/detail-sheet-fields";
import { ExpiryBadge, expiryWarning } from "@/components/expiry-badge";
import { InlineEditableDateField } from "@/components/inline-editable-date-field";
import { InlineEditableField } from "@/components/inline-editable-field";
import { InlineEditableSelectField } from "@/components/inline-editable-select-field";
import {
  nullableTrim,
  saveVehicleFields
} from "@/app/dashboard/fleet/lib/save-vehicle-fields";

const CTP_INCLUDED_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" }
];

type FieldGroupProps = {
  vehicle: Vehicle;
  onSaved?: () => void;
  showSectionHeading?: boolean;
  activeFieldId: string | null;
  onActiveFieldIdChange: (fieldId: string | null) => void;
  saveVehicle: (patch: Partial<Vehicle>) => Promise<{ ok: boolean; message?: string }>;
};

export function VehicleRegistrationFields({
  vehicle,
  showSectionHeading = true,
  activeFieldId,
  onActiveFieldIdChange,
  saveVehicle
}: FieldGroupProps) {
  const regoExpiryWarn = expiryWarning(vehicle.registrationExpiry);

  return (
    <div className="space-y-4">
      {showSectionHeading ? <p className="text-sm font-medium">Registration details</p> : null}
      <dl className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <DetailLabel icon={Landmark}>Rego state</DetailLabel>
          <dd>
            <InlineEditableField
              fieldId="regoState"
              activeFieldId={activeFieldId}
              onActiveFieldIdChange={onActiveFieldIdChange}
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
              onActiveFieldIdChange={onActiveFieldIdChange}
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
              onActiveFieldIdChange={onActiveFieldIdChange}
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

export function VehicleCtpFields({
  vehicle,
  showSectionHeading = true,
  activeFieldId,
  onActiveFieldIdChange,
  saveVehicle
}: FieldGroupProps) {
  const ctpExpiryWarn = expiryWarning(vehicle.ctpExpiry);
  const includedValue =
    vehicle.ctpIncludedWithRegistration === true
      ? "yes"
      : vehicle.ctpIncludedWithRegistration === false
        ? "no"
        : "";

  return (
    <div className="space-y-4">
      {showSectionHeading ? (
        <p className="text-sm font-medium">Compulsory Third Party</p>
      ) : null}
      <dl className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <DetailLabel icon={Building2}>CTP insurer / scheme</DetailLabel>
          <dd>
            <InlineEditableField
              fieldId="ctpProvider"
              activeFieldId={activeFieldId}
              onActiveFieldIdChange={onActiveFieldIdChange}
              value={vehicle.ctpProviderName?.trim() ?? ""}
              editLabel="CTP insurer or scheme"
              placeholder="Insurer or scheme"
              onSave={async (next) => saveVehicle({ ctpProviderName: nullableTrim(next) })}
            />
          </dd>
        </div>
        <div className="space-y-1">
          <DetailLabel icon={FileText}>Policy / ref.</DetailLabel>
          <dd>
            <InlineEditableField
              fieldId="ctpPolicy"
              activeFieldId={activeFieldId}
              onActiveFieldIdChange={onActiveFieldIdChange}
              value={vehicle.ctpPolicyNumber?.trim() ?? ""}
              editLabel="CTP policy or reference"
              placeholder="Policy or Green Slip ref."
              onSave={async (next) => saveVehicle({ ctpPolicyNumber: nullableTrim(next) })}
            />
          </dd>
        </div>
        <div className="space-y-1">
          <DetailLabel icon={BadgeCheck}>CTP class</DetailLabel>
          <dd>
            <InlineEditableField
              fieldId="ctpClass"
              activeFieldId={activeFieldId}
              onActiveFieldIdChange={onActiveFieldIdChange}
              value={vehicle.ctpClassOrType?.trim() ?? ""}
              editLabel="CTP class"
              placeholder="e.g. Class 26"
              onSave={async (next) => saveVehicle({ ctpClassOrType: nullableTrim(next) })}
            />
          </dd>
        </div>
        <div className="space-y-1">
          <DetailLabel icon={Shield}>Included with rego</DetailLabel>
          <dd>
            <InlineEditableSelectField
              fieldId="ctpIncluded"
              activeFieldId={activeFieldId}
              onActiveFieldIdChange={onActiveFieldIdChange}
              value={includedValue}
              options={CTP_INCLUDED_OPTIONS}
              editLabel="CTP included with registration"
              placeholder="Select…"
              onSave={async (next) =>
                saveVehicle({
                  ctpIncludedWithRegistration:
                    next === "yes" ? true : next === "no" ? false : null
                })
              }
            />
          </dd>
        </div>
        <div className="space-y-1">
          <DetailLabel icon={Calendar}>CTP expiry</DetailLabel>
          <dd>
            <InlineEditableDateField
              fieldId="ctpExpiry"
              activeFieldId={activeFieldId}
              onActiveFieldIdChange={onActiveFieldIdChange}
              value={vehicle.ctpExpiry}
              editLabel="CTP expiry"
              dateRange="expiry"
              trailingContent={ctpExpiryWarn ? <ExpiryBadge level={ctpExpiryWarn} /> : null}
              onSave={async (next) => saveVehicle({ ctpExpiry: next })}
            />
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function VehicleInsuranceFields({
  vehicle,
  showSectionHeading = true,
  activeFieldId,
  onActiveFieldIdChange,
  saveVehicle
}: FieldGroupProps) {
  const insuranceExpiryWarn = expiryWarning(vehicle.insuranceExpiry);

  return (
    <div className="space-y-4">
      {showSectionHeading ? <p className="text-sm font-medium">Vehicle insurance</p> : null}
      <p className="text-muted-foreground text-sm">
        Optional cover for the vehicle. CTP is tracked separately.
      </p>
      <dl className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <DetailLabel icon={ShieldCheck}>Policy type</DetailLabel>
          <dd>
            <InlineEditableSelectField
              fieldId="insurancePolicyType"
              activeFieldId={activeFieldId}
              onActiveFieldIdChange={onActiveFieldIdChange}
              value={vehicle.insurancePolicyType ?? ""}
              options={VEHICLE_INSURANCE_POLICY_TYPE_OPTIONS}
              editLabel="insurance policy type"
              placeholder="Select policy type"
              onSave={async (next) =>
                saveVehicle({
                  insurancePolicyType: parseVehicleInsurancePolicyType(next)
                })
              }
            />
          </dd>
        </div>
        <div className="space-y-1">
          <DetailLabel icon={Building2}>Insurer</DetailLabel>
          <dd>
            <InlineEditableField
              fieldId="insuranceProvider"
              activeFieldId={activeFieldId}
              onActiveFieldIdChange={onActiveFieldIdChange}
              value={vehicle.insuranceProviderName?.trim() ?? ""}
              editLabel="insurer"
              placeholder="Insurer name"
              onSave={async (next) =>
                saveVehicle({ insuranceProviderName: nullableTrim(next) })
              }
            />
          </dd>
        </div>
        <div className="space-y-1">
          <DetailLabel icon={FileText}>Policy no.</DetailLabel>
          <dd>
            <InlineEditableField
              fieldId="insurancePolicy"
              activeFieldId={activeFieldId}
              onActiveFieldIdChange={onActiveFieldIdChange}
              value={vehicle.insurancePolicyNumber?.trim() ?? ""}
              editLabel="insurance policy number"
              placeholder="Policy number"
              onSave={async (next) =>
                saveVehicle({ insurancePolicyNumber: nullableTrim(next) })
              }
            />
          </dd>
        </div>
        <div className="col-span-2 space-y-1">
          <DetailLabel icon={Calendar}>Insurance expiry</DetailLabel>
          <dd>
            <InlineEditableDateField
              fieldId="insuranceExpiry"
              activeFieldId={activeFieldId}
              onActiveFieldIdChange={onActiveFieldIdChange}
              value={vehicle.insuranceExpiry}
              editLabel="insurance expiry"
              dateRange="expiry"
              trailingContent={
                insuranceExpiryWarn ? <ExpiryBadge level={insuranceExpiryWarn} /> : null
              }
              onSave={async (next) => saveVehicle({ insuranceExpiry: next })}
            />
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function VehicleRoadworthyFields({
  vehicle,
  showSectionHeading = true,
  activeFieldId,
  onActiveFieldIdChange,
  saveVehicle
}: FieldGroupProps) {
  const roadworthyExpiryWarn = expiryWarning(vehicle.roadworthyExpiry);

  return (
    <div className="space-y-4">
      {showSectionHeading ? <p className="text-sm font-medium">Roadworthy</p> : null}
      <dl className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <DetailLabel icon={FileText}>Certificate no.</DetailLabel>
          <dd>
            <InlineEditableField
              fieldId="roadworthyCert"
              activeFieldId={activeFieldId}
              onActiveFieldIdChange={onActiveFieldIdChange}
              value={vehicle.roadworthyCertificateNumber?.trim() ?? ""}
              editLabel="roadworthy certificate number"
              placeholder="Certificate number"
              onSave={async (next) =>
                saveVehicle({ roadworthyCertificateNumber: nullableTrim(next) })
              }
            />
          </dd>
        </div>
        <div className="space-y-1">
          <DetailLabel icon={Landmark}>Issued by</DetailLabel>
          <dd>
            <InlineEditableField
              fieldId="roadworthyAuthority"
              activeFieldId={activeFieldId}
              onActiveFieldIdChange={onActiveFieldIdChange}
              value={vehicle.roadworthyIssuingAuthority?.trim() ?? ""}
              editLabel="roadworthy issuing authority"
              placeholder="Issuing authority"
              onSave={async (next) =>
                saveVehicle({ roadworthyIssuingAuthority: nullableTrim(next) })
              }
            />
          </dd>
        </div>
        <div className="col-span-2 space-y-1">
          <DetailLabel icon={Calendar}>Roadworthy expiry</DetailLabel>
          <dd>
            <InlineEditableDateField
              fieldId="roadworthyExpiry"
              activeFieldId={activeFieldId}
              onActiveFieldIdChange={onActiveFieldIdChange}
              value={vehicle.roadworthyExpiry}
              editLabel="roadworthy expiry"
              dateRange="expiry"
              trailingContent={
                roadworthyExpiryWarn ? <ExpiryBadge level={roadworthyExpiryWarn} /> : null
              }
              onSave={async (next) => saveVehicle({ roadworthyExpiry: next })}
            />
          </dd>
        </div>
      </dl>
    </div>
  );
}

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

  async function saveVehicle(patch: Partial<Vehicle>) {
    const result = await saveVehicleFields(vehicle, patch);
    if (result.ok) onSaved?.();
    return result;
  }

  const shared = {
    vehicle,
    onSaved,
    showSectionHeading,
    activeFieldId,
    onActiveFieldIdChange: setActiveFieldId,
    saveVehicle
  };

  return (
    <div className="space-y-6">
      <VehicleRegistrationFields {...shared} />
      <VehicleCtpFields {...shared} />
      <VehicleInsuranceFields {...shared} />
      <VehicleRoadworthyFields {...shared} />
    </div>
  );
}
