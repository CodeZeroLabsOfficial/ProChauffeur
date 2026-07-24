"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { MinusIcon, PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { assignedVehicle } from "@/app/dashboard/bookings/lib/chauffeur-assignment";
import {
  formatScheduleDays,
  ScheduleEditSheet
} from "@/app/dashboard/locations/components/schedule-edit-sheet";
import { branchDriverToProfile } from "@/app/dashboard/drivers/lib/roster-chauffeurs";
import {
  effectiveChauffeurUserId,
  type BranchDriver,
  type FleetWeeklyOperatingSchedule,
  type User,
  type Vehicle
} from "@/lib/models";
import {
  assignFleetVehicle,
  unassignFleetVehicle,
  saveDriverProfile
} from "@/lib/services/firebase-service";
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
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

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

function formatScheduleHours(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string {
  const start = startTime?.trim();
  const end = endTime?.trim();
  if (start && end) return `${start}–${end}`;
  if (start) return start;
  if (end) return end;
  return "";
}

export function DriverProfileOperationsTab({
  user,
  roster,
  vehicles,
  onUserUpdated
}: {
  user: User;
  roster: BranchDriver;
  vehicles: Vehicle[];
  onUserUpdated?: () => void;
}) {
  const profile = branchDriverToProfile(roster);
  const { vehicleClasses } = useVehicleClasses();
  const vehicle = assignedVehicle(vehicles, user.id);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FleetWeeklyOperatingSchedule | null>(
    null
  );

  const classesById = useMemo(
    () => new Map(vehicleClasses.map((c) => [c.id, c.displayName])),
    [vehicleClasses]
  );

  const classLabel = vehicle?.vehicleClassId
    ? (classesById.get(vehicle.vehicleClassId) ?? vehicle.vehicleClassId)
    : null;

  const availableVehicles = useMemo(
    () => vehicles.filter((v) => !effectiveChauffeurUserId(v)),
    [vehicles]
  );

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

  function openAddSheet() {
    setEditingSchedule(null);
    setSheetOpen(true);
  }

  function openEditSheet(schedule: FleetWeeklyOperatingSchedule) {
    setEditingSchedule(schedule);
    setSheetOpen(true);
  }

  const persistSchedules = useCallback(
    async (schedules: FleetWeeklyOperatingSchedule[]) => {
      await saveDriverProfile(user.id, {
        ...profile,
        availabilitySchedules: schedules
      });
    },
    [profile, user.id]
  );

  return (
    <>
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
              {vehicle ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleUnassign()}>
                  <MinusIcon /> Unassign
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <PlusIcon /> Assign
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {availableVehicles.length ? (
                      availableVehicles.map((v) => (
                        <DropdownMenuItem
                          key={v.driverID}
                          onClick={() => handleAssign(v.driverID)}>
                          {vehicleMakeModel(v)}
                          {v.licensePlate?.trim() ? (
                            <span className="text-muted-foreground ml-2">{v.licensePlate}</span>
                          ) : null}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>No fleet vehicles available</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
            <CardAction>
              <Button type="button" variant="outline" size="sm" onClick={openAddSheet}>
                <PlusIcon /> Add schedule
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {profile.availabilitySchedules.length ? (
              <ul className="space-y-3">
                {profile.availabilitySchedules.map((schedule) => {
                  const hours = formatScheduleHours(schedule.startTime, schedule.endTime);
                  return (
                    <li
                      key={schedule.id}
                      className="flex items-start gap-3 rounded-md border p-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 font-medium">
                          {schedule.name?.trim() || "Schedule"}
                          {!schedule.isEnabled ? (
                            <Badge variant="outline">Disabled</Badge>
                          ) : null}
                        </div>
                        <p className="text-muted-foreground mt-1">
                          {formatScheduleDays(schedule.weekdayNumbers)}
                          {hours ? ` · ${hours}` : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => openEditSheet(schedule)}
                        aria-label="Edit schedule">
                        <PencilIcon />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No availability schedules configured.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <ScheduleEditSheet
        schedule={editingSchedule}
        schedules={profile.availabilitySchedules}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        allowDelete
        defaultLocationId={profile.preferredGarageLocationId ?? null}
        activeHelpText="Inactive schedules are excluded when checking chauffeur availability."
        onPersist={persistSchedules}
        onSaved={() => onUserUpdated?.()}
      />
    </>
  );
}
