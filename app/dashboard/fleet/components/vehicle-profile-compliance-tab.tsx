"use client";

import { useState } from "react";
import { ClipboardCheckIcon, FileTextIcon, PlusIcon, ShieldIcon } from "lucide-react";

import type { Vehicle, VehicleInsurancePolicy } from "@/lib/models";
import { vehicleInsuranceCoverTypeLabel } from "@/lib/vehicle-insurance";
import { cn } from "@/lib/utils";
import { VehicleRegistrationEditSheet } from "@/app/dashboard/fleet/vehicle-registration-edit-sheet";
import { VehicleInsuranceEditSheet } from "@/app/dashboard/fleet/vehicle-insurance-edit-sheet";
import { VehicleRoadworthyEditSheet } from "@/app/dashboard/fleet/vehicle-roadworthy-edit-sheet";
import { ComplianceEmpty } from "@/components/compliance/compliance-empty";
import { hasComplianceDetails } from "@/components/compliance/compliance-stat";
import { ComplianceTile } from "@/components/compliance/compliance-tile";
import { SectionHeading } from "@/components/detail-sheet-fields";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const registrationContent = hasComplianceDetails(registration) ? (
    <ComplianceTile
      label={registration?.registrationNumber ?? ""}
      secondary={registration?.jurisdictionCode}
      start={registration?.registrationStart}
      expiry={registration?.registrationExpiry}
      editLabel={nested ? undefined : "Edit registration"}
      onEdit={nested ? undefined : () => setRegistrationOpen(true)}
    />
  ) : (
    <ComplianceEmpty
      icon={FileTextIcon}
      title="No registration details"
      description="You haven't added any registration details yet."
      actionLabel={nested ? undefined : "Add registration"}
      onAction={nested ? undefined : () => setRegistrationOpen(true)}
    />
  );

  const roadworthyContent = hasComplianceDetails(roadworthy) ? (
    <ComplianceTile
      label={roadworthy?.certificateNumber ?? ""}
      secondary={roadworthy?.jurisdictionCode}
      start={roadworthy?.issueDate}
      expiry={roadworthy?.expiryDate}
      editLabel={nested ? undefined : "Edit roadworthy"}
      onEdit={nested ? undefined : () => setRoadworthyOpen(true)}
    />
  ) : (
    <ComplianceEmpty
      icon={ClipboardCheckIcon}
      title="No roadworthy details"
      description="You haven't added any roadworthy details yet."
      actionLabel={nested ? undefined : "Add Roadworthy"}
      onAction={nested ? undefined : () => setRoadworthyOpen(true)}
    />
  );

  const insuranceContent =
    policies.length === 0 ? (
      <ComplianceEmpty
        icon={ShieldIcon}
        title="No insurance policies"
        description="You haven't added any insurance details yet."
        actionLabel={nested ? undefined : "Add policy"}
        onAction={nested ? undefined : openAddPolicy}
      />
    ) : (
      <div className={cn("grid gap-3", nested ? "grid-cols-1" : "md:grid-cols-2")}>
        {policies.map((policy) => (
          <ComplianceTile
            key={policy.id}
            label={vehicleInsuranceCoverTypeLabel[policy.coverType]}
            secondary={policy.insurerName}
            start={policy.policyStart}
            expiry={policy.policyExpiry}
            editLabel={nested ? undefined : "Edit insurance policy"}
            onEdit={nested ? undefined : () => openEditPolicy(policy)}
          />
        ))}
      </div>
    );

  return (
    <>
      {nested ? (
        <div className="space-y-6">
          <div className="space-y-4">
            <SectionHeading>Registration</SectionHeading>
            {registrationContent}
          </div>
          <div className="space-y-4">
            <SectionHeading>Roadworthy</SectionHeading>
            {roadworthyContent}
          </div>
          <div className="space-y-4">
            <SectionHeading>Insurance</SectionHeading>
            {insuranceContent}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Registration</CardTitle>
            </CardHeader>
            <CardContent>{registrationContent}</CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Roadworthy</CardTitle>
            </CardHeader>
            <CardContent>{roadworthyContent}</CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Insurance</CardTitle>
              {policies.length > 0 ? (
                <CardAction>
                  <Button type="button" variant="outline" size="sm" onClick={openAddPolicy}>
                    <PlusIcon />
                    Add policy
                  </Button>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent>{insuranceContent}</CardContent>
          </Card>
        </div>
      )}

      {!nested ? (
        <>
          <VehicleRegistrationEditSheet
            vehicle={vehicle}
            open={registrationOpen}
            onOpenChange={setRegistrationOpen}
            onSaved={onVehicleUpdated}
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
          />

          <VehicleRoadworthyEditSheet
            vehicle={vehicle}
            open={roadworthyOpen}
            onOpenChange={setRoadworthyOpen}
            onSaved={onVehicleUpdated}
          />
        </>
      ) : null}
    </>
  );
}
