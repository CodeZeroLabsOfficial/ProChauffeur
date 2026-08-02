"use client";

import { useState } from "react";
import { IdCard, PencilIcon } from "lucide-react";

import { DriverAccreditationEditSheet } from "@/app/dashboard/drivers/driver-accreditation-edit-sheet";
import { DriverLicenceEditSheet } from "@/app/dashboard/drivers/driver-licence-edit-sheet";
import { branchDriverToProfile } from "@/app/dashboard/drivers/lib/roster-chauffeurs";
import type { BranchDriver, User } from "@/lib/models";
import { formatDate } from "@/lib/format";
import { ComplianceEmpty } from "@/components/compliance/compliance-empty";
import { hasComplianceDetails } from "@/components/compliance/compliance-stat";
import { ComplianceTile } from "@/components/compliance/compliance-tile";
import { ExpiryBadge, expiryWarning } from "@/components/expiry-badge";
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
  const accWarn = expiryWarning(profile.operatorAccreditation?.expiry);
  const [licenceEditOpen, setLicenceEditOpen] = useState(false);
  const [accreditationEditOpen, setAccreditationEditOpen] = useState(false);

  const licenceContent = hasComplianceDetails(license) ? (
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
      actionLabel="Add driver's licence"
      onAction={() => setLicenceEditOpen(true)}
    />
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Driver&apos;s licence</CardTitle>
        </CardHeader>
        <CardContent>{licenceContent}</CardContent>
      </Card>

      <DriverLicenceEditSheet
        user={user}
        roster={roster}
        open={licenceEditOpen}
        onOpenChange={setLicenceEditOpen}
        onSaved={onUserUpdated}
      />

      <Card className="relative">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute top-4 right-4 z-10"
          onClick={() => setAccreditationEditOpen(true)}
          aria-label="Edit operator accreditation">
          <PencilIcon />
        </Button>
        <CardHeader>
          <CardTitle>Operator accreditation</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRow
            label="Accreditation no."
            value={profile.operatorAccreditation?.number?.trim() || "—"}
          />
          <DetailRow
            label="Issuing authority"
            value={profile.operatorAccreditation?.issuingAuthority?.trim() || "—"}
          />
          <div className="flex items-start justify-between gap-4 py-3">
            <span className="text-muted-foreground shrink-0 text-sm">Expiry</span>
            <span className="text-end text-sm">
              {formatDate(profile.operatorAccreditation?.expiry)}
              {accWarn ? <ExpiryBadge level={accWarn} /> : null}
            </span>
          </div>
        </CardContent>
      </Card>

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
