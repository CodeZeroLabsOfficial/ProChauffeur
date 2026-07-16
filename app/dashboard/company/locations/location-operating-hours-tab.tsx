"use client";

import { useCallback, useEffect, useState } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  ScheduleEditSheet,
  formatScheduleDays
} from "@/app/dashboard/company/operating-hours/schedule-edit-sheet";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { emptyOperatingHours, type AppFleetOperatingHours, type FleetWeeklyOperatingSchedule } from "@/lib/models";
import { fetchOperatingHours, saveOperatingHours } from "@/lib/services/firebase-service";
import { cn } from "@/lib/utils";

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

export function LocationOperatingHoursTab({
  branchId,
  timeZoneIdentifier
}: {
  branchId: string;
  timeZoneIdentifier: string | null | undefined;
}) {
  const [operatingHours, setOperatingHours] = useState<AppFleetOperatingHours>(emptyOperatingHours);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FleetWeeklyOperatingSchedule | null>(null);

  const loadData = useCallback(() => {
    return fetchOperatingHours(branchId).then(setOperatingHours);
  }, [branchId]);

  useEffect(() => {
    setLoading(true);
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
      await saveOperatingHours({ ...operatingHours, schedules }, branchId);
      setOperatingHours((prev) => ({ ...prev, schedules }));
      toast.success("Schedule removed.");
    } catch {
      toast.error("Could not remove schedule.");
    }
  }

  const tz = timeZoneIdentifier?.trim() || "Not set";

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-sm">
            Weekly operating windows for this location ({tz}).
          </p>
          <Button type="button" variant="outline" size="sm" onClick={openAddSheet}>
            <PlusIcon /> Add schedule
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Schedule name</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-10 text-center">
                  Loading schedules…
                </TableCell>
              </TableRow>
            ) : operatingHours.schedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-10 text-center">
                  No schedules configured.
                </TableCell>
              </TableRow>
            ) : (
              operatingHours.schedules.map((s) => (
                <TableRow key={s.id} className={cn(!s.isEnabled && "text-muted-foreground")}>
                  <TableCell className="font-medium">{formatScheduleName(s)}</TableCell>
                  <TableCell>{formatScheduleDays(s.weekdayNumbers)}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatScheduleHours(s.startTime, s.endTime)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeSchedule(s.id)}>
                        <Trash2Icon className="size-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEditSheet(s)}>
                        <PencilIcon className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ScheduleEditSheet
        schedule={editingSchedule}
        operatingHours={operatingHours}
        branchId={branchId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        nested
        onSaved={(schedules) => setOperatingHours((prev) => ({ ...prev, schedules }))}
      />
    </>
  );
}
