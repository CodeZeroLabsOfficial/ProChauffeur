"use client";

import Link from "next/link";

import { effectiveChauffeurUserId, vehicleDisplayName, type User, type Vehicle } from "@/lib/models";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 last:border-0">
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="text-end text-sm">{value}</span>
    </div>
  );
}

export function VehicleProfileOperationsTab({
  vehicle,
  assignedChauffeur
}: {
  vehicle: Vehicle;
  assignedChauffeur: User | undefined;
}) {
  const chauffeurId = effectiveChauffeurUserId(vehicle);
  const chauffeurName =
    assignedChauffeur?.profile.displayName.trim() ||
    assignedChauffeur?.email ||
    null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRow
            label="Status"
            value={chauffeurId ? "Assigned" : "Unassigned"}
          />
          <DetailRow
            label="Chauffeur"
            value={
              chauffeurId && chauffeurName ? (
                <Link
                  href={`/dashboard/drivers/${chauffeurId}`}
                  className="hover:text-primary hover:underline">
                  {chauffeurName}
                </Link>
              ) : (
                "—"
              )
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle summary</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRow label="Vehicle" value={vehicleDisplayName(vehicle) || "—"} />
          <DetailRow label="Plate" value={vehicle.licensePlate?.trim() || "—"} />
          <DetailRow label="Capacity" value={String(vehicle.passengerCapacity)} />
          <DetailRow
            label="Registration expiry"
            value={formatDate(vehicle.registrationExpiry)}
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Maintenance &amp; operations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Maintenance schedules and operational details coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
