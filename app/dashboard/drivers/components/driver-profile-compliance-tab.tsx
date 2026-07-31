"use client";

import { useState } from "react";
import { PencilIcon } from "lucide-react";

import { DriverAccreditationEditSheet } from "@/app/dashboard/drivers/driver-accreditation-edit-sheet";
import { DriverLicenceEditSheet } from "@/app/dashboard/drivers/driver-licence-edit-sheet";
import { branchDriverToProfile } from "@/app/dashboard/drivers/lib/roster-chauffeurs";
import type { BranchDriver, User } from "@/lib/models";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 last:border-0">
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="text-end text-sm">{value}</span>
    </div>
  );
}

function expiryWarning(date: Date | null | undefined): "expired" | "soon" | null {
  if (!date) return null;
  const now = new Date();
  if (date < now) return "expired";
  const days = (date.getTime() - now.getTime()) / 86400000;
  if (days <= 60) return "soon";
  return null;
}

function ExpiryBadge({ level }: { level: "expired" | "soon" }) {
  return (
    <Badge variant={level === "expired" ? "destructive" : "outline"} className="ms-2">
      {level === "expired" ? "Expired" : "Expiring soon"}
    </Badge>
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
  const licenceWarn = expiryWarning(profile.driversLicense?.expiry);
  const accWarn = expiryWarning(profile.operatorAccreditation?.expiry);
  const [licenceEditOpen, setLicenceEditOpen] = useState(false);
  const [accreditationEditOpen, setAccreditationEditOpen] = useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="relative">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute top-4 right-4 z-10"
          onClick={() => setLicenceEditOpen(true)}
          aria-label="Edit driver licence">
          <PencilIcon />
        </Button>
        <CardHeader>
          <CardTitle>Driver licence</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRow label="Licence no." value={profile.driversLicense?.number?.trim() || "—"} />
          <DetailRow label="Class / type" value={profile.driversLicense?.classOrType?.trim() || "—"} />
          <DetailRow label="State" value={profile.driversLicense?.jurisdictionCode?.trim() || "—"} />
          <DetailRow
            label="Conditions"
            value={profile.driversLicense?.conditions?.trim() || "—"}
          />
          <DetailRow label="Summary" value={profile.driversLicense?.summary?.trim() || "—"} />
          <div className="flex items-start justify-between gap-4 py-3">
            <span className="text-muted-foreground shrink-0 text-sm">Expiry</span>
            <span className="text-end text-sm">
              {formatDate(profile.driversLicense?.expiry)}
              {licenceWarn ? <ExpiryBadge level={licenceWarn} /> : null}
            </span>
          </div>
        </CardContent>
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
            <span className="text-muted-foreground text-sm shrink-0">Expiry</span>
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
