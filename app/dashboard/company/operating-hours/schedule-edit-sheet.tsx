"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { saveOperatingHours } from "@/lib/services/firebase-service";
import type { AppFleetOperatingHours, FleetWeeklyOperatingSchedule } from "@/lib/models";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

// Display order Monday→Sunday using Calendar weekday numbers (1=Sun … 7=Sat).
export const WEEKDAYS: { num: number; label: string }[] = [
  { num: 2, label: "Mon" },
  { num: 3, label: "Tue" },
  { num: 4, label: "Wed" },
  { num: 5, label: "Thu" },
  { num: 6, label: "Fri" },
  { num: 7, label: "Sat" },
  { num: 1, label: "Sun" }
];

export function newSchedule(): FleetWeeklyOperatingSchedule {
  return {
    id: crypto.randomUUID(),
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
  isEnabled: boolean
): FleetWeeklyOperatingSchedule {
  return {
    id,
    isEnabled,
    weekdayNumbers,
    startTime: String(form.get("startTime") ?? "").trim() || null,
    endTime: String(form.get("endTime") ?? "").trim() || null
  };
}

export function ScheduleEditSheet({
  schedule,
  operatingHours,
  open,
  onOpenChange,
  onSaved
}: {
  schedule: FleetWeeklyOperatingSchedule | null;
  operatingHours: AppFleetOperatingHours;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (schedules: FleetWeeklyOperatingSchedule[]) => void;
}) {
  const isNew = schedule === null;
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number[]>([2, 3, 4, 5, 6]);

  useEffect(() => {
    if (open) {
      setFormKey((n) => n + 1);
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
    const updated = scheduleFromForm(form, id, selectedDays, enabled);
    const schedules = isNew
      ? [...operatingHours.schedules, updated]
      : operatingHours.schedules.map((s) => (s.id === id ? updated : s));

    setSaving(true);
    try {
      await saveOperatingHours({ ...operatingHours, schedules });
      onSaved(schedules);
      toast.success(isNew ? "Schedule added." : "Schedule updated.");
      onOpenChange(false);
    } catch {
      toast.error("Could not save schedule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isNew ? "Add schedule" : "Edit schedule"}</SheetTitle>
          <SheetDescription>
            {isNew
              ? "Create a weekly operating window for your fleet."
              : "Update this weekly operating window."}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-6 px-4" key={formKey}>
          <div className="flex items-center gap-2">
            <Switch id="isEnabled" checked={enabled} onCheckedChange={setEnabled} />
            <Label htmlFor="isEnabled">{enabled ? "Active" : "Disabled"}</Label>
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

          <SheetFooter className="px-0">
            <Button type="submit" disabled={saving || selectedDays.length === 0}>
              {saving ? "Saving…" : isNew ? "Add schedule" : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
