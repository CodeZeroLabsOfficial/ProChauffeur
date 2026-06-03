"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  fetchOperatingHours,
  fetchOperatorLocale,
  saveOperatingHours
} from "@/lib/services/firebase-service";
import { emptyOperatingHours, type AppFleetOperatingHours, type FleetWeeklyOperatingSchedule } from "@/lib/models";
import { appConfig } from "@/lib/env";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScheduleEditSheet, WEEKDAYS } from "@/app/dashboard/company/operating-hours/schedule-edit-sheet";

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed || "Not set";
}

function formatTime(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return "Not set";
  return trimmed;
}

export default function OperatingHoursPage() {
  const [operatingHours, setOperatingHours] = useState<AppFleetOperatingHours>(emptyOperatingHours);
  const [timezone, setTimezone] = useState(appConfig.timezone);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FleetWeeklyOperatingSchedule | null>(null);

  const loadData = useCallback(() => {
    return Promise.all([fetchOperatingHours(), fetchOperatorLocale()]).then(([hours, locale]) => {
      setOperatingHours(hours);
      setTimezone(locale.timezone || hours.timeZoneIdentifier || appConfig.timezone);
    });
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

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Time zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-muted-foreground text-sm">IANA time zone</p>
              <p className="font-medium">{displayValue(timezone)}</p>
            </div>
            <p className="text-muted-foreground text-xs">
              Configure in{" "}
              <Link href="/dashboard/settings/locale" className="underline hover:text-foreground">
                Settings → Locale
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Weekly schedules</CardTitle>
            <Button variant="outline" size="sm" onClick={openAddSheet}>
              <PlusIcon /> Add schedule
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {operatingHours.schedules.length === 0 ? (
              <p className="text-muted-foreground text-sm">No schedules configured.</p>
            ) : (
              operatingHours.schedules.map((s) => (
                <div key={s.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.isEnabled ? "Active" : "Disabled"}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditSheet(s)}>
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => removeSchedule(s.id)}>
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((d) => (
                      <span
                        key={d.num}
                        className={cn(
                          "flex h-8 w-11 items-center justify-center rounded-md border text-sm",
                          s.weekdayNumbers.includes(d.num)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        )}>
                        {d.label}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:max-w-xs text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Start</p>
                      <p className="font-medium">{formatTime(s.startTime)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">End</p>
                      <p className="font-medium">{formatTime(s.endTime)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
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
