"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { useFleetLocations } from "@/hooks/use-collections";
import { fetchOperatingHours, saveOperatingHours } from "@/lib/services/firebase-service";
import {
  BRANCH_OFFICE_FLEET_LOCATION_ID,
  emptyOperatingHours,
  type AppFleetOperatingHours,
  type FleetLocation,
  type FleetWeeklyOperatingSchedule
} from "@/lib/models";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { ScheduleEditSheet, formatScheduleDays } from "@/app/dashboard/company/operating-hours/schedule-edit-sheet";

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed || "Not set";
}

function formatScheduleName(schedule: FleetWeeklyOperatingSchedule): string {
  const name = schedule.name?.trim();
  if (name) return name;
  return schedule.isEnabled ? "Unnamed schedule" : "Unnamed schedule (disabled)";
}

function formatScheduleHours(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string {
  const start = startTime?.trim();
  const end = endTime?.trim();
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  if (end) return end;
  return "Not set";
}

function resolveLocation(
  locationId: string | null | undefined,
  locationsById: Map<string, FleetLocation>
): FleetLocation | undefined {
  if (!locationId) return undefined;
  return locationsById.get(locationId);
}

export default function OperatingHoursPage() {
  const { activeBranch } = useActiveBranch();
  const { locations, loading: locationsLoading } = useFleetLocations();
  const [operatingHours, setOperatingHours] = useState<AppFleetOperatingHours>(emptyOperatingHours);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FleetWeeklyOperatingSchedule | null>(null);

  const locationsById = useMemo(
    () => new Map(locations.map((loc) => [loc.id, loc])),
    [locations]
  );

  const branchTimeZone = activeBranch?.timeZoneIdentifier?.trim() || null;

  const loadData = useCallback(() => {
    return fetchOperatingHours().then(setOperatingHours);
  }, []);

  useEffect(() => {
    loadData()
      .catch(() => setOperatingHours(emptyOperatingHours))
      .finally(() => setLoading(false));
  }, [loadData]);

  function openAddSheet() {
    setEditingSchedule(null);
    setSheetOpen(true);
  }

  function openEditSheet(schedule: FleetWeeklyOperatingSchedule) {
    setEditingSchedule(schedule);
    setSheetOpen(true);
  }

  async function removeSchedule(id: string) {
    const schedules = operatingHours.schedules.filter((s) => s.id !== id);
    try {
      await saveOperatingHours({ ...operatingHours, schedules });
      setOperatingHours((prev) => ({ ...prev, schedules }));
      toast.success("Schedule removed.");
    } catch {
      toast.error("Could not remove schedule.");
    }
  }

  const tableLoading = loading || locationsLoading;

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Weekly schedules</CardTitle>
            <Button variant="outline" size="sm" onClick={openAddSheet}>
              <PlusIcon /> Add schedule
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Schedule name</TableHead>
                  <TableHead>Schedule days</TableHead>
                  <TableHead>Schedule hours</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead>Time zone</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                      Loading schedules…
                    </TableCell>
                  </TableRow>
                ) : operatingHours.schedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                      No schedules configured.
                    </TableCell>
                  </TableRow>
                ) : (
                  operatingHours.schedules.map((s) => {
                    const location = resolveLocation(s.locationId, locationsById);
                    return (
                      <TableRow
                        key={s.id}
                        className={cn(!s.isEnabled && "text-muted-foreground")}>
                        <TableCell className="font-medium">{formatScheduleName(s)}</TableCell>
                        <TableCell>{formatScheduleDays(s.weekdayNumbers)}</TableCell>
                        <TableCell className="tabular-nums">
                          {formatScheduleHours(s.startTime, s.endTime)}
                        </TableCell>
                        <TableCell>
                          {location?.name ??
                            (s.locationId === BRANCH_OFFICE_FLEET_LOCATION_ID
                              ? "Office"
                              : "Not assigned")}
                        </TableCell>
                        <TableCell>
                          {displayValue(location?.timeZoneIdentifier ?? branchTimeZone)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => removeSchedule(s.id)}>
                              <Trash2Icon className="size-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditSheet(s)}>
                              <PencilIcon className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ScheduleEditSheet
        schedule={editingSchedule}
        operatingHours={operatingHours}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSaved={(schedules) => setOperatingHours((prev) => ({ ...prev, schedules }))}
      />
    </>
  );
}
