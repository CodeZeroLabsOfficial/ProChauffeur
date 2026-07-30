"use client";

import { useState } from "react";
import { ClipboardCheckIcon, FileTextIcon, PlusIcon, ShieldIcon } from "lucide-react";

import type { Vehicle, VehicleInsurancePolicy } from "@/lib/models";
import { vehicleInsuranceCoverTypeLabel } from "@/lib/vehicle-insurance";
import { cn } from "@/lib/utils";
import { VehicleRegistrationEditSheet } from "@/app/dashboard/fleet/vehicle-registration-edit-sheet";
import { VehicleInsuranceEditSheet } from "@/app/dashboard/fleet/vehicle-insurance-edit-sheet";
import { VehicleRoadworthyEditSheet } from "@/app/dashboard/fleet/vehicle-roadworthy-edit-sheet";
import { ComplianceDetailsSheet } from "@/app/dashboard/fleet/components/compliance-details-sheet";
import { ComplianceEmpty } from "@/app/dashboard/fleet/components/compliance-empty";
import { hasComplianceDetails } from "@/app/dashboard/fleet/components/compliance-stat";
import { ComplianceTile } from "@/app/dashboard/fleet/components/compliance-tile";
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
  const [registrationDetailsOpen, setRegistrationDetailsOpen] = useState(false);
  const [roadworthyDetailsOpen, setRoadworthyDetailsOpen] = useState(false);
  const [detailsPolicy, setDetailsPolicy] = useState<VehicleInsurancePolicy | null>(null);
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
    <div className={cn("grid gap-4", nested ? "grid-cols-1" : "lg:grid-cols-2")}>
      <Card>
        <CardHeader>
          <CardTitle>Registration</CardTitle>
        </CardHeader>
        <CardContent>
          {hasComplianceDetails(registration) ? (
            <ComplianceTile
              label={registration?.registrationNumber ?? ""}
              secondary={registration?.jurisdictionCode}
              start={registration?.registrationStart}
              expiry={registration?.registrationExpiry}
              editLabel="Edit registration"
              onEdit={() => setRegistrationOpen(true)}
              onViewDetails={() => setRegistrationDetailsOpen(true)}
            />
          ) : (
            <ComplianceEmpty
              icon={FileTextIcon}
              title="No registration details"
              description="You haven't added any registration details yet."
              actionLabel="Add registration"
              onAction={() => setRegistrationOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roadworthy</CardTitle>
        </CardHeader>
        <CardContent>
          {hasComplianceDetails(roadworthy) ? (
            <ComplianceTile
              label={roadworthy?.certificateNumber ?? ""}
              secondary={roadworthy?.jurisdictionCode}
              start={roadworthy?.issueDate}
              expiry={roadworthy?.expiryDate}
              editLabel="Edit roadworthy"
              onEdit={() => setRoadworthyOpen(true)}
              onViewDetails={() => setRoadworthyDetailsOpen(true)}
            />
          ) : (
            <ComplianceEmpty
              icon={ClipboardCheckIcon}
              title="No roadworthy details"
              description="You haven't added any roadworthy details yet."
              actionLabel="Add Roadworthy"
              onAction={() => setRoadworthyOpen(true)}
            />
          )}
        </CardContent>
      </Card>

      <Card className={nested ? undefined : "lg:col-span-2"}>
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
        <CardContent>
          {policies.length === 0 ? (
            <ComplianceEmpty
              icon={ShieldIcon}
              title="No insurance policies"
              description="You haven't added any insurance details yet."
              actionLabel="Add policy"
              onAction={openAddPolicy}
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
                  editLabel="Edit insurance policy"
                  onEdit={() => openEditPolicy(policy)}
                  onViewDetails={() => setDetailsPolicy(policy)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ComplianceDetailsSheet
        title="Registration details"
        description="Registration information for this fleet vehicle."
        details={[
          {
            label: "Registration number",
            value: registration?.registrationNumber?.trim() || "—"
          },
          { label: "Jurisdiction", value: registration?.jurisdictionCode?.trim() || "—" },
          { label: "Issuing authority", value: registration?.issuingAuthority?.trim() || "—" }
        ]}
        startLabel="Registration start"
        start={registration?.registrationStart}
        expiry={registration?.registrationExpiry}
        open={registrationDetailsOpen}
        onOpenChange={setRegistrationDetailsOpen}
        nested={nested}
      />

      <ComplianceDetailsSheet
        title="Roadworthy details"
        description="Roadworthy certificate information for this fleet vehicle."
        details={[
          { label: "Certificate number", value: roadworthy?.certificateNumber?.trim() || "—" },
          { label: "Jurisdiction", value: roadworthy?.jurisdictionCode?.trim() || "—" },
          { label: "Issuing authority", value: roadworthy?.issuingAuthority?.trim() || "—" }
        ]}
        startLabel="Issue date"
        start={roadworthy?.issueDate}
        expiry={roadworthy?.expiryDate}
        open={roadworthyDetailsOpen}
        onOpenChange={setRoadworthyDetailsOpen}
        nested={nested}
      />

      <ComplianceDetailsSheet
        title="Insurance policy details"
        description="Insurance policy information for this fleet vehicle."
        details={[
          {
            label: "Cover type",
            value: detailsPolicy ? vehicleInsuranceCoverTypeLabel[detailsPolicy.coverType] : "—"
          },
          { label: "Insurer", value: detailsPolicy?.insurerName.trim() || "—" },
          {
            label: "Policy reference",
            value: detailsPolicy?.policyReferenceNumber.trim() || "—"
          }
        ]}
        startLabel="Policy start"
        start={detailsPolicy?.policyStart}
        expiry={detailsPolicy?.policyExpiry}
        open={detailsPolicy != null}
        onOpenChange={(open) => {
          if (!open) setDetailsPolicy(null);
        }}
        nested={nested}
      />

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
