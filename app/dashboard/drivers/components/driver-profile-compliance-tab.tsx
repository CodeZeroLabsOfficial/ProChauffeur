"use client";

import { useState } from "react";
import { BadgeCheck, IdCard } from "lucide-react";

import { DriverAccreditationEditSheet } from "@/app/dashboard/drivers/driver-accreditation-edit-sheet";
import { DriverLicenceEditSheet } from "@/app/dashboard/drivers/driver-licence-edit-sheet";
import { branchDriverToProfile } from "@/app/dashboard/drivers/lib/roster-chauffeurs";
import type { BranchDriver, User } from "@/lib/models";
import {
  ComplianceEmpty,
  ComplianceSectionCard,
  ComplianceTile,
  hasComplianceDetails
} from "@/components/compliance";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 last:border-0">
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="text-end text-sm">{value}</span>
    </div>
  );
}

export function DriverProfileComplianceTab({
  user,
  roster,
  onUserUpdated
}: {
  user: User;
  roster: BranchDriver;
  onUserUpdated?: () => void;
}) {
  const profile = branchDriverToProfile(roster);
  const license = profile.driversLicense;
  const accreditation = profile.operatorAccreditation;
  const hasLicence = hasComplianceDetails(license);
  const hasAccreditation = hasComplianceDetails(accreditation);
  const [licenceEditOpen, setLicenceEditOpen] = useState(false);
  const [accreditationEditOpen, setAccreditationEditOpen] = useState(false);

  const licenceContent = hasLicence ? (
    <ComplianceTile
      label={license?.number ?? ""}
      secondary={license?.jurisdictionCode}
      start={license?.issueDate}
      expiry={license?.expiry}
      editLabel="Edit driver licence"
      onEdit={() => setLicenceEditOpen(true)}>
      <DetailRow label="Class / type" value={license?.classOrType?.trim() || "—"} />
      <DetailRow label="Conditions" value={license?.conditions?.trim() || "—"} />
    </ComplianceTile>
  ) : (
    <ComplianceEmpty
      icon={IdCard}
      title="No driver's licence details"
      description="You haven't added any licence details yet."
    />
  );

  const accreditationContent = hasAccreditation ? (
    <ComplianceTile
      label={accreditation?.number?.trim() || "—"}
      secondary={accreditation?.issuingAuthority}
      start={null}
      expiry={accreditation?.expiry ?? null}
      editLabel="Edit operator accreditation"
      onEdit={() => setAccreditationEditOpen(true)}
    />
  ) : (
    <ComplianceEmpty
      icon={BadgeCheck}
      title="No operator accreditation details"
      description="You haven't added any accreditation details yet."
    />
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ComplianceSectionCard
        title="Driver's licence"
        addLabel={!hasLicence ? "Add driver's licence" : undefined}
        onAdd={!hasLicence ? () => setLicenceEditOpen(true) : undefined}>
        {licenceContent}
      </ComplianceSectionCard>

      <DriverLicenceEditSheet
        user={user}
        roster={roster}
        open={licenceEditOpen}
        onOpenChange={setLicenceEditOpen}
        onSaved={onUserUpdated}
      />

      <ComplianceSectionCard
        title="Operator accreditation"
        addLabel={!hasAccreditation ? "Add accreditation" : undefined}
        onAdd={!hasAccreditation ? () => setAccreditationEditOpen(true) : undefined}>
        {accreditationContent}
      </ComplianceSectionCard>

      <DriverAccreditationEditSheet
        user={user}
        roster={roster}
        open={accreditationEditOpen}
        onOpenChange={setAccreditationEditOpen}
        onSaved={onUserUpdated}
      />
    </div>
  );
}
