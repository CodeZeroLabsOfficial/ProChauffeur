"use client";

import Link from "next/link";

import {
  defaultDriverProfile,
  vehicleDisplayName,
  type User,
  type Vehicle
} from "@/lib/models";
import { formatDate } from "@/lib/format";
import { visibilityStatusLabel } from "@/lib/chauffeur-badge-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 last:border-0">
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="text-end text-sm">{value}</span>
    </div>
  );
}

export function DriverProfileOperationsTab({
  user,
  vehicle
}: {
  user: User;
  vehicle: Vehicle | undefined;
}) {
  const profile = user.driverProfile ?? defaultDriverProfile();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Dispatch & visibility</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRow
            label="Accepts dispatch"
            value={profile.acceptsDispatchAssignments ? "Yes" : "No"}
          />
          <DetailRow
            label="Customer app"
            value={visibilityStatusLabel(profile.visibleOnCustomerApp)}
          />
          <DetailRow label="Time zone" value={profile.timeZoneIdentifier?.trim() || "—"} />
          <DetailRow
            label="Preferred garage"
            value={profile.preferredGarageLocationId?.trim() || "—"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fleet vehicle</CardTitle>
        </CardHeader>
        <CardContent>
          {vehicle ? (
            <>
              <DetailRow
                label="Vehicle"
                value={
                  <Link
                    href={`/dashboard/fleet/${vehicle.driverID}`}
                    className="hover:text-primary hover:underline">
                    {vehicleDisplayName(vehicle)}
                  </Link>
                }
              />
              <DetailRow label="Plate" value={vehicle.licensePlate || "—"} />
              <DetailRow label="Capacity" value={String(vehicle.passengerCapacity)} />
              <DetailRow
                label="Registration expiry"
                value={formatDate(vehicle.registrationExpiry)}
              />
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No fleet vehicle assigned.</p>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Availability schedules</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.availabilitySchedules.length ? (
            <ul className="space-y-3">
              {profile.availabilitySchedules.map((schedule) => (
                <li
                  key={schedule.id}
                  className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    {schedule.name?.trim() || "Schedule"}
                    {!schedule.isEnabled ? (
                      <Badge variant="outline">Disabled</Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-1">
                    {schedule.weekdayNumbers
                      .map((n) => WEEKDAYS[n === 7 ? 0 : n] ?? n)
                      .join(", ") || "—"}
                    {schedule.startTime && schedule.endTime
                      ? ` · ${schedule.startTime}–${schedule.endTime}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No availability schedules configured.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
