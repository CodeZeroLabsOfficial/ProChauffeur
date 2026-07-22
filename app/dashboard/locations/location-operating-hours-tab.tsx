"use client";

import { useCallback, useEffect, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  ScheduleEditSheet,
  formatScheduleDays
} from "@/app/dashboard/locations/components/schedule-edit-sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
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
  nestedSheet = false
}: {
  branchId: string;
  nestedSheet?: boolean;
}) {
  const [operatingHours, setOperatingHours] = useState<AppFleetOperatingHours>(emptyOperatingHours);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FleetWeeklyOperatingSchedule | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FleetWeeklyOperatingSchedule | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function confirmDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!pendingDelete) return;
    setDeleting(true);
    const schedules = operatingHours.schedules.filter((s) => s.id !== pendingDelete.id);
    try {
      await saveOperatingHours({ ...operatingHours, schedules }, branchId);
      setOperatingHours((prev) => ({ ...prev, schedules }));
      if (editingSchedule?.id === pendingDelete.id) {
        setSheetOpen(false);
        setEditingSchedule(null);
      }
      setPendingDelete(null);
      toast.success("Schedule removed.");
    } catch {
      toast.error("Could not remove schedule.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Operating hours</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={openAddSheet}>
            <PlusIcon /> Add schedule
          </Button>
        </CardHeader>
        <CardContent>
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
                  <TableRow
                    key={s.id}
                    className={cn("cursor-pointer", !s.isEnabled && "text-muted-foreground")}
                    onClick={() => openEditSheet(s)}>
                    <TableCell className="font-medium">{formatScheduleName(s)}</TableCell>
                    <TableCell>{formatScheduleDays(s.weekdayNumbers)}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatScheduleHours(s.startTime, s.endTime)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setPendingDelete(s)}>
                          <Trash2Icon className="size-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleting) setPendingDelete(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              {pendingDelete ? formatScheduleName(pendingDelete) : "this schedule"}. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(e) => void confirmDelete(e)}>
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ScheduleEditSheet
        schedule={editingSchedule}
        operatingHours={operatingHours}
        branchId={branchId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        nested={nestedSheet}
        onSaved={(schedules) => setOperatingHours((prev) => ({ ...prev, schedules }))}
      />
    </>
  );
}
