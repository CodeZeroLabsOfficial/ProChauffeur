"use client";

import { defaultDriverProfile, type User } from "@/lib/models";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export function DriverProfileComplianceTab({ user }: { user: User }) {
  const profile = user.driverProfile ?? defaultDriverProfile();
  const licenceWarn = expiryWarning(profile.driversLicenseExpiry);
  const accWarn = expiryWarning(profile.operatorAccreditationExpiry);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Driver licence</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRow label="Licence no." value={profile.driversLicenseNumber?.trim() || "—"} />
          <DetailRow label="Class / type" value={profile.driversLicenseClassOrType?.trim() || "—"} />
          <DetailRow label="State" value={profile.driversLicenseJurisdictionCode?.trim() || "—"} />
          <DetailRow
            label="Conditions"
            value={profile.driversLicenseConditions?.trim() || "—"}
          />
          <DetailRow label="Summary" value={profile.driversLicenseSummary?.trim() || "—"} />
          <div className="flex items-start justify-between gap-4 py-3">
            <span className="text-muted-foreground shrink-0 text-sm">Expiry</span>
            <span className="text-end text-sm">
              {formatDate(profile.driversLicenseExpiry)}
              {licenceWarn ? <ExpiryBadge level={licenceWarn} /> : null}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operator accreditation</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRow
            label="Accreditation no."
            value={profile.operatorAccreditationNumber?.trim() || "—"}
          />
          <DetailRow
            label="Issuing authority"
            value={profile.operatorAccreditationIssuingAuthority?.trim() || "—"}
          />
          <div className="flex items-start justify-between gap-4 py-3">
            <span className="text-muted-foreground shrink-0 text-sm">Expiry</span>
            <span className="text-end text-sm">
              {formatDate(profile.operatorAccreditationExpiry)}
              {accWarn ? <ExpiryBadge level={accWarn} /> : null}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
