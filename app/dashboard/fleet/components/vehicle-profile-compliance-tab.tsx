"use client";

import { useState } from "react";
import { ClipboardCheckIcon, FileTextIcon, ShieldIcon } from "lucide-react";

import type { Vehicle, VehicleInsurancePolicy } from "@/lib/models";
import { cn } from "@/lib/utils";
import { VehicleRegistrationEditSheet } from "@/app/dashboard/fleet/vehicle-registration-edit-sheet";
import { VehicleInsuranceEditSheet } from "@/app/dashboard/fleet/vehicle-insurance-edit-sheet";
import { VehicleRoadworthyEditSheet } from "@/app/dashboard/fleet/vehicle-roadworthy-edit-sheet";
import {
  ComplianceEmpty,
  ComplianceSectionCard,
  ComplianceTile,
  hasComplianceDetails
} from "@/components/compliance";
import { SectionHeading } from "@/components/detail-sheet-fields";

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
  const hasRegistration = hasComplianceDetails(registration);
  const hasRoadworthy = hasComplianceDetails(roadworthy);

  function openAddPolicy() {
    setEditingPolicy(null);
    setInsuranceOpen(true);
  }

  function openEditPolicy(policy: VehicleInsurancePolicy) {
    setEditingPolicy(policy);
    setInsuranceOpen(true);
  }

  const registrationContent = hasRegistration ? (
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
    />
  );

  const roadworthyContent = hasRoadworthy ? (
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
    />
  );

  const insuranceContent =
    policies.length === 0 ? (
      <ComplianceEmpty
        icon={ShieldIcon}
        title="No insurance policies"
        description="You haven't added any insurance details yet."
      />
    ) : (
      <div className={cn("grid gap-3", nested ? "grid-cols-1" : "md:grid-cols-2")}>
        {policies.map((policy) => (
          <ComplianceTile
            key={policy.id}
            label={policy.coverType}
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
          <ComplianceSectionCard
            title="Registration"
            addLabel={!hasRegistration ? "Add registration" : undefined}
            onAdd={!hasRegistration ? () => setRegistrationOpen(true) : undefined}>
            {registrationContent}
          </ComplianceSectionCard>

          <ComplianceSectionCard
            title="Roadworthy"
            addLabel={!hasRoadworthy ? "Add Roadworthy" : undefined}
            onAdd={!hasRoadworthy ? () => setRoadworthyOpen(true) : undefined}>
            {roadworthyContent}
          </ComplianceSectionCard>

          <ComplianceSectionCard
            className="lg:col-span-2"
            title="Insurance"
            addLabel="Add policy"
            onAdd={openAddPolicy}>
            {insuranceContent}
          </ComplianceSectionCard>
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
