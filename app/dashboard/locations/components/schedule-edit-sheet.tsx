"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BRANCH_OFFICE_FLEET_LOCATION_ID, type FleetWeeklyOperatingSchedule } from "@/lib/models";
import { cn } from "@/lib/utils";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

// Display order Monday→Sunday using Calendar weekday numbers (1=Sun … 7=Sat).
export const WEEKDAYS: { num: number; label: string; fullName: string }[] = [
  { num: 2, label: "Mon", fullName: "Monday" },
  { num: 3, label: "Tue", fullName: "Tuesday" },
  { num: 4, label: "Wed", fullName: "Wednesday" },
  { num: 5, label: "Thu", fullName: "Thursday" },
  { num: 6, label: "Fri", fullName: "Friday" },
  { num: 7, label: "Sat", fullName: "Saturday" },
  { num: 1, label: "Sun", fullName: "Sunday" }
];

function formatDayRun(start: (typeof WEEKDAYS)[number], end: (typeof WEEKDAYS)[number]): string {
  if (start.num === 2 && end.num === 6) return "Weekdays";
  if (start.num === 7 && end.num === 1) return "Weekends";
  if (start.num === end.num) return start.fullName;
  return `${start.fullName} - ${end.fullName}`;
}

export function formatScheduleDays(weekdayNumbers: number[]): string {
  if (weekdayNumbers.length === 0) return "Not set";
  if (weekdayNumbers.length === 7) return "Everyday";

  const selected = WEEKDAYS.filter((d) => weekdayNumbers.includes(d.num));
  const parts: string[] = [];
  let runStart = selected[0];
  let runEnd = selected[0];

  for (let i = 1; i <= selected.length; i++) {
    const current = selected[i];
    const previousIndex = WEEKDAYS.findIndex((d) => d.num === runEnd.num);
    const currentIndex = current ? WEEKDAYS.findIndex((d) => d.num === current.num) : -1;

    if (current && currentIndex === previousIndex + 1) {
      runEnd = current;
    } else {
      parts.push(formatDayRun(runStart, runEnd));
      if (current) {
        runStart = current;
        runEnd = current;
      }
    }
  }

  return parts.join(", ");
}

export function newSchedule(
  locationId: string | null = BRANCH_OFFICE_FLEET_LOCATION_ID
): FleetWeeklyOperatingSchedule {
  return {
    id: crypto.randomUUID(),
    name: null,
    locationId,
    isEnabled: true,
    weekdayNumbers: [2, 3, 4, 5, 6],
    startTime: "08:00",
    endTime: "18:00"
  };
}

function scheduleFromForm(
  form: FormData,
  id: string,
  weekdayNumbers: number[],
  isEnabled: boolean,
  locationId: string | null
): FleetWeeklyOperatingSchedule {
  return {
    id,
    name: String(form.get("name") ?? "").trim() || null,
    locationId,
    isEnabled,
    weekdayNumbers,
    startTime: String(form.get("startTime") ?? "").trim() || null,
    endTime: String(form.get("endTime") ?? "").trim() || null
  };
}

export function ScheduleEditSheet({
  schedule,
  schedules,
  open,
  onOpenChange,
  onPersist,
  onSaved,
  allowDelete = false,
  defaultLocationId = BRANCH_OFFICE_FLEET_LOCATION_ID,
  activeHelpText = "Inactive schedules are excluded when checking operating hours.",
  nested = false
}: {
  schedule: FleetWeeklyOperatingSchedule | null;
  schedules: FleetWeeklyOperatingSchedule[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersist: (schedules: FleetWeeklyOperatingSchedule[]) => Promise<void>;
  onSaved: (schedules: FleetWeeklyOperatingSchedule[]) => void;
  allowDelete?: boolean;
  defaultLocationId?: string | null;
  activeHelpText?: string;
  nested?: boolean;
}) {
  const isNew = schedule === null;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number[]>([2, 3, 4, 5, 6]);

  useEffect(() => {
    if (open) {
      setFormKey((n) => n + 1);
      setConfirmDeleteOpen(false);
      if (schedule) {
        setEnabled(schedule.isEnabled);
        setSelectedDays(schedule.weekdayNumbers);
      } else {
        setEnabled(true);
        setSelectedDays([2, 3, 4, 5, 6]);
      }
    }
  }, [open, schedule]);

  function toggleDay(day: number) {
    setSelectedDays((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const id = schedule?.id ?? crypto.randomUUID();
    const locationId = schedule?.locationId ?? defaultLocationId;
    const updated = scheduleFromForm(form, id, selectedDays, enabled, locationId ?? null);
    const next = isNew
      ? [...schedules, updated]
      : schedules.map((s) => (s.id === id ? updated : s));

    setSaving(true);
    try {
      await onPersist(next);
      onSaved(next);
      toast.success(isNew ? "Schedule added." : "Schedule updated.");
      onOpenChange(false);
    } catch {
      toast.error("Could not save schedule.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!schedule) return;
    setDeleting(true);
    const next = schedules.filter((s) => s.id !== schedule.id);
    try {
      await onPersist(next);
      onSaved(next);
      setConfirmDeleteOpen(false);
      toast.success("Schedule removed.");
      onOpenChange(false);
    } catch {
      toast.error("Could not remove schedule.");
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || deleting;
  const scheduleLabel = schedule?.name?.trim() || "this schedule";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent nested={nested} className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{isNew ? "Add schedule" : "Edit schedule"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={onSubmit} className="flex flex-1 flex-col space-y-6 px-4" key={formKey}>
            <div className="space-y-2">
              <Label htmlFor="name">Schedule name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Weekday hours"
                defaultValue={schedule?.name ?? ""}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  defaultValue={schedule?.startTime ?? "08:00"}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  defaultValue={schedule?.endTime ?? "18:00"}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Days</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d.num}
                    type="button"
                    onClick={() => toggleDay(d.num)}
                    className={cn(
                      "h-8 w-11 rounded-md border text-sm transition-colors",
                      selectedDays.includes(d.num)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    )}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="isEnabled">Active</Label>
                <p className="text-muted-foreground text-xs">{activeHelpText}</p>
              </div>
              <Switch
                id="isEnabled"
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={busy}
              />
            </div>

            <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 px-0 sm:justify-between">
              {!isNew && allowDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={busy}
                  onClick={() => setConfirmDeleteOpen(true)}>
                  Delete
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={busy || selectedDays.length === 0}>
                {saving ? "Saving…" : isNew ? "Add schedule" : "Save"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={confirmDeleteOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleting) setConfirmDeleteOpen(false);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {scheduleLabel}. This action cannot be undone.
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
    </>
  );
}
