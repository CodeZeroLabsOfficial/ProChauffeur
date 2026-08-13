"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MinusIcon, PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { assignedVehicle } from "@/app/dashboard/bookings/lib/chauffeur-assignment";
import {
  formatScheduleDays,
  ScheduleEditSheet
} from "@/app/dashboard/locations/components/schedule-edit-sheet";
import { branchDriverToProfile } from "@/app/dashboard/drivers/lib/roster-chauffeurs";
import {
  effectiveChauffeurUserId,
  vehicleDisplayName,
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
import { getCachedOperatorLocale } from "@/lib/services/operator-config-cache";
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

function vehicleMakeModel(vehicle: Vehicle): string {
  return vehicleDisplayName(vehicle) || "Vehicle";
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
  const { branchId } = useActiveBranch();
  const profile = branchDriverToProfile(roster);
  const { vehicleClasses } = useVehicleClasses();
  const [timezoneLabel, setTimezoneLabel] = useState<string | null>(null);
  const vehicle = assignedVehicle(vehicles, user.id);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FleetWeeklyOperatingSchedule | null>(null);

  const classesById = useMemo(
    () => new Map(vehicleClasses.map((c) => [c.id, c.displayName])),
    [vehicleClasses]
  );

  useEffect(() => {
    let cancelled = false;
    getCachedOperatorLocale(branchId)
      .then((locale) => {
        if (!cancelled) setTimezoneLabel(locale.timezone);
      })
      .catch(() => {
        if (!cancelled) setTimezoneLabel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  const classLabel = vehicle?.details?.vehicleClassId
    ? (classesById.get(vehicle.details.vehicleClassId) ?? vehicle.details.vehicleClassId)
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
            <div className="space-y-1">
              <CardTitle>Availability schedules</CardTitle>
              {timezoneLabel ? (
                <p className="text-muted-foreground text-xs font-normal">
                  Times are in {timezoneLabel}.
                </p>
              ) : null}
            </div>
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
                          {!schedule.isEnabled ? <Badge variant="outline">Disabled</Badge> : null}
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

        <Card>
          <CardHeader>
            <CardTitle>Fleet vehicle</CardTitle>
            <CardAction>
              {vehicle ? (
                <Button size="sm" variant="outline" onClick={() => void handleUnassign()}>
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
                        <DropdownMenuItem key={v.driverID} onClick={() => handleAssign(v.driverID)}>
                          {vehicleMakeModel(v)}
                          {v.registration?.registrationNumber?.trim() ? (
                            <span className="text-muted-foreground ml-2">
                              {v.registration.registrationNumber}
                            </span>
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
                <VehicleMakeAvatar make={vehicle.details?.make} className="size-12 shrink-0" />
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
      </div>

      <ScheduleEditSheet
        schedule={editingSchedule}
        schedules={profile.availabilitySchedules}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        allowDelete
        defaultLocationId={profile.preferredOfficeLocationId ?? null}
        activeHelpText="Inactive schedules are excluded when checking chauffeur availability."
        timezoneLabel={timezoneLabel}
        onPersist={persistSchedules}
        onSaved={() => onUserUpdated?.()}
      />
    </>
  );
}
