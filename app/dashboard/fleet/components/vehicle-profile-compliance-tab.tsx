"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import type { Vehicle, VehicleInsurancePolicy } from "@/lib/models";
import { vehicleInsuranceCoverTypeLabel } from "@/lib/vehicle-insurance";
import { VehicleRegistrationEditSheet } from "@/app/dashboard/fleet/vehicle-registration-edit-sheet";
import { VehicleInsuranceEditSheet } from "@/app/dashboard/fleet/vehicle-insurance-edit-sheet";
import { VehicleRoadworthyEditSheet } from "@/app/dashboard/fleet/vehicle-roadworthy-edit-sheet";
import {
  ComplianceEditButton,
  ValidityTermFooter
} from "@/app/dashboard/fleet/components/validity-term-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 last:border-0">
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="text-end text-sm">{value}</span>
    </div>
  );
}

function InsurancePolicyCard({
  policy,
  onEdit
}: {
  policy: VehicleInsurancePolicy;
  onEdit: () => void;
}) {
  return (
    <div className="relative rounded-lg border p-3 text-sm">
      <ComplianceEditButton
        label="Edit insurance policy"
        onClick={onEdit}
        className="top-2 right-2"
      />
      <div className="pr-10">
        <p className="font-semibold">{vehicleInsuranceCoverTypeLabel[policy.coverType]}</p>
        <p className="text-muted-foreground mt-1 text-sm">{policy.insurerName.trim() || "—"}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {policy.policyReferenceNumber.trim() || "—"}
        </p>
      </div>
      <ValidityTermFooter start={policy.policyStart} expiry={policy.policyExpiry} />
    </div>
  );
}

export function VehicleProfileComplianceTab({
  vehicle,
  onVehicleUpdated,
  nested = false
}: {
  vehicle: Vehicle;
  onVehicleUpdated?: () => void;
  nested?: boolean;
}) {
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [roadworthyOpen, setRoadworthyOpen] = useState(false);
  const [insuranceOpen, setInsuranceOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<VehicleInsurancePolicy | null>(null);
  const policies = vehicle.insurancePolicies ?? [];
  const registration = vehicle.registration;
  const roadworthy = vehicle.roadworthy;

  function openAddPolicy() {
    setEditingPolicy(null);
    setInsuranceOpen(true);
  }

  function openEditPolicy(policy: VehicleInsurancePolicy) {
    setEditingPolicy(policy);
    setInsuranceOpen(true);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="relative">
        <ComplianceEditButton label="Edit registration" onClick={() => setRegistrationOpen(true)} />
        <CardHeader>
          <CardTitle>Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRow label="Jurisdiction" value={registration?.jurisdictionCode?.trim() || "—"} />
          <DetailRow label="Registration Number" value={registration?.registrationNumber?.trim() || "—"} />
          <DetailRow
            label="Issuing Authority"
            value={registration?.issuingAuthority?.trim() || "—"}
          />
          <ValidityTermFooter
            start={registration?.registrationStart}
            expiry={registration?.registrationExpiry}
          />
        </CardContent>
      </Card>

      <Card className="relative">
        <ComplianceEditButton label="Edit roadworthy" onClick={() => setRoadworthyOpen(true)} />
        <CardHeader>
          <CardTitle>Roadworthy</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRow label="Certificate no." value={roadworthy?.certificateNumber?.trim() || "—"} />
          <DetailRow label="Issued by" value={roadworthy?.issuingAuthority?.trim() || "—"} />
          <DetailRow label="State" value={roadworthy?.jurisdictionCode?.trim() || "—"} />
          <ValidityTermFooter start={roadworthy?.issueDate} expiry={roadworthy?.expiryDate} />
        </CardContent>
      </Card>

      <Card className="relative lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Insurance</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={openAddPolicy}>
            <PlusIcon />
            Add policy
          </Button>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <p className="text-muted-foreground text-sm">No insurance policies yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {policies.map((policy) => (
                <InsurancePolicyCard
                  key={policy.id}
                  policy={policy}
                  onEdit={() => openEditPolicy(policy)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <VehicleRegistrationEditSheet
        vehicle={vehicle}
        open={registrationOpen}
        onOpenChange={setRegistrationOpen}
        onSaved={onVehicleUpdated}
        nested={nested}
      />

      <VehicleInsuranceEditSheet
        vehicle={vehicle}
        policy={editingPolicy}
        open={insuranceOpen}
        onOpenChange={(open) => {
          setInsuranceOpen(open);
          if (!open) setEditingPolicy(null);
        }}
        onSaved={onVehicleUpdated}
        nested={nested}
      />

      <VehicleRoadworthyEditSheet
        vehicle={vehicle}
        open={roadworthyOpen}
        onOpenChange={setRoadworthyOpen}
        onSaved={onVehicleUpdated}
        nested={nested}
      />
    </div>
  );
}
