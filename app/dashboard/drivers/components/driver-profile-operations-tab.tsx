"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { assignedVehicle } from "@/app/dashboard/bookings/lib/chauffeur-assignment";
import {
  defaultDriverProfile,
  effectiveChauffeurUserId,
  type User,
  type Vehicle
} from "@/lib/models";
import { assignFleetVehicle, unassignFleetVehicle } from "@/lib/services/firebase-service";
import { visibilityStatusLabel } from "@/lib/chauffeur-badge-icons";
import { useVehicleClasses } from "@/hooks/use-collections";
import { VehicleMakeAvatar } from "@/components/vehicle-make-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 last:border-0">
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="text-end text-sm">{value}</span>
    </div>
  );
}

function vehicleMakeModel(vehicle: Vehicle): string {
  return `${vehicle.make} ${vehicle.model}`.trim() || "Vehicle";
}

export function DriverProfileOperationsTab({
  user,
  vehicles
}: {
  user: User;
  vehicles: Vehicle[];
}) {
  const profile = user.driverProfile ?? defaultDriverProfile();
  const { vehicleClasses } = useVehicleClasses();
  const vehicle = assignedVehicle(vehicles, user.id);

  const classesById = useMemo(
    () => new Map(vehicleClasses.map((c) => [c.id, c.displayName])),
    [vehicleClasses]
  );

  const classLabel = vehicle?.vehicleClassId
    ? (classesById.get(vehicle.vehicleClassId) ?? vehicle.vehicleClassId)
    : null;

  const handleAssign = useCallback(
    async (vehicleDocumentId: string) => {
      try {
        await assignFleetVehicle(vehicles, vehicleDocumentId, user.id);
        toast.success("Vehicle assigned.");
      } catch {
        toast.error("Could not assign the vehicle.");
      }
    },
    [user.id, vehicles]
  );

  const handleUnassign = useCallback(async () => {
    if (!vehicle) return;
    try {
      await unassignFleetVehicle(vehicle.driverID);
      toast.success("Vehicle unassigned.");
    } catch {
      toast.error("Could not unassign the vehicle.");
    }
  }, [vehicle]);

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
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant={vehicle ? "secondary" : "outline"}
                  className={vehicle ? "text-muted-foreground" : undefined}>
                  Assign
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {vehicles.length ? (
                  vehicles.map((v) => {
                    const assignedToThis = effectiveChauffeurUserId(v) === user.id;
                    return (
                      <DropdownMenuItem
                        key={v.driverID}
                        disabled={assignedToThis}
                        onClick={() => handleAssign(v.driverID)}>
                        {vehicleMakeModel(v)}
                        {v.licensePlate?.trim() ? (
                          <span className="text-muted-foreground ml-2">{v.licensePlate}</span>
                        ) : null}
                      </DropdownMenuItem>
                    );
                  })
                ) : (
                  <DropdownMenuItem disabled>No fleet vehicles available</DropdownMenuItem>
                )}
                {vehicle ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => void handleUnassign()}>
                      Unassign vehicle
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>
        <CardContent>
          {vehicle ? (
            <Link
              href={`/dashboard/fleet/${vehicle.driverID}`}
              className="hover:bg-muted/50 -mx-2 flex items-center gap-4 rounded-lg px-2 py-1 transition-colors">
              <VehicleMakeAvatar make={vehicle.make} className="size-12 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{vehicleMakeModel(vehicle)}</p>
                <p className="text-muted-foreground truncate text-sm">{classLabel ?? "—"}</p>
              </div>
            </Link>
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
