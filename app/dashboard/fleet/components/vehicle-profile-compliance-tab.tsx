"use client";

import { useState } from "react";
import { ArrowRightIcon, PlusIcon } from "lucide-react";

import type { Vehicle, VehicleInsurancePolicy } from "@/lib/models";
import { vehicleInsuranceCoverTypeLabel } from "@/lib/vehicle-insurance";
import { cn } from "@/lib/utils";
import { VehicleRegistrationEditSheet } from "@/app/dashboard/fleet/vehicle-registration-edit-sheet";
import { VehicleInsuranceEditSheet } from "@/app/dashboard/fleet/vehicle-insurance-edit-sheet";
import { VehicleRoadworthyEditSheet } from "@/app/dashboard/fleet/vehicle-roadworthy-edit-sheet";
import { ComplianceDetailsSheet } from "@/app/dashboard/fleet/components/compliance-details-sheet";
import { ComplianceEditButton } from "@/app/dashboard/fleet/components/compliance-edit-button";
import { ComplianceStat } from "@/app/dashboard/fleet/components/compliance-stat";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

function ViewDetailsFooter({ onClick }: { onClick: () => void }) {
  return (
    <CardFooter className="border-border mt-auto flex items-center justify-end border-t p-0!">
      <button
        type="button"
        onClick={onClick}
        className="text-primary hover:text-primary/90 flex items-center px-6 py-3 text-sm font-medium">
        View details
        <ArrowRightIcon className="ms-1 size-4" />
      </button>
    </CardFooter>
  );
}

function InsurancePolicyCard({
  policy,
  onEdit,
  onViewDetails
}: {
  policy: VehicleInsurancePolicy;
  onEdit: () => void;
  onViewDetails: () => void;
}) {
  return (
    <Card className="relative gap-4 py-4 pb-0 shadow-none">
      <ComplianceEditButton
        label="Edit insurance policy"
        onClick={onEdit}
        className="absolute top-3 right-3"
      />
      <CardContent className="pe-14">
        <ComplianceStat
          label={vehicleInsuranceCoverTypeLabel[policy.coverType]}
          secondary={policy.insurerName}
          start={policy.policyStart}
          expiry={policy.policyExpiry}
        />
      </CardContent>
      <ViewDetailsFooter onClick={onViewDetails} />
    </Card>
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
      <Card className="pb-0">
        <CardHeader>
          <CardTitle>Registration</CardTitle>
          <CardAction>
            <ComplianceEditButton
              label="Edit registration"
              onClick={() => setRegistrationOpen(true)}
            />
          </CardAction>
        </CardHeader>
        <CardContent>
          <ComplianceStat
            label={registration?.registrationNumber ?? ""}
            secondary={registration?.jurisdictionCode}
            start={registration?.registrationStart}
            expiry={registration?.registrationExpiry}
          />
        </CardContent>
        <ViewDetailsFooter onClick={() => setRegistrationDetailsOpen(true)} />
      </Card>

      <Card className="pb-0">
        <CardHeader>
          <CardTitle>Roadworthy</CardTitle>
          <CardAction>
            <ComplianceEditButton label="Edit roadworthy" onClick={() => setRoadworthyOpen(true)} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <ComplianceStat
            label={roadworthy?.certificateNumber ?? ""}
            secondary={roadworthy?.jurisdictionCode}
            start={roadworthy?.issueDate}
            expiry={roadworthy?.expiryDate}
          />
        </CardContent>
        <ViewDetailsFooter onClick={() => setRoadworthyDetailsOpen(true)} />
      </Card>

      <Card className={nested ? undefined : "lg:col-span-2"}>
        <CardHeader>
          <CardTitle>Insurance</CardTitle>
          <CardAction>
            <Button type="button" variant="outline" size="sm" onClick={openAddPolicy}>
              <PlusIcon />
              Add policy
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <p className="text-muted-foreground text-sm">No insurance policies yet.</p>
          ) : (
            <div className={cn("grid gap-3", nested ? "grid-cols-1" : "md:grid-cols-2")}>
              {policies.map((policy) => (
                <InsurancePolicyCard
                  key={policy.id}
                  policy={policy}
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
