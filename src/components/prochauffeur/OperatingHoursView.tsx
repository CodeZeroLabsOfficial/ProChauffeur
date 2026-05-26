"use client";

import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import CompanySettingsPage from "@/components/company-profile/CompanySettingsPage";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import {
  formatScheduleWindow,
  formatWeekdayNumbers,
} from "@/lib/prochauffeur/display";
import type { FleetWeeklyOperatingSchedule } from "@/lib/prochauffeur/types";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const WEEKDAY_OPTIONS = [
  { value: 2, label: "Mon" },
  { value: 3, label: "Tue" },
  { value: 4, label: "Wed" },
  { value: 5, label: "Thu" },
  { value: 6, label: "Fri" },
  { value: 7, label: "Sat" },
  { value: 1, label: "Sun" },
];

function makeSchedule(): FleetWeeklyOperatingSchedule {
  return {
    id: crypto.randomUUID(),
    isEnabled: true,
    weekdayNumbers: [2, 3, 4, 5, 6],
    startTime: null,
    endTime: null,
  };
}

export default function OperatingHoursView() {
  const router = useRouter();
  const {
    operatingHours,
    saveOperatingHours,
    isSaving,
    actionError,
    clearActionError,
  } = useAdminOperations();

  const [timeZoneIdentifier, setTimeZoneIdentifier] = useState("");
  const [schedules, setSchedules] = useState<FleetWeeklyOperatingSchedule[]>(
    []
  );

  useEffect(() => {
    setTimeZoneIdentifier(operatingHours.timeZoneIdentifier ?? "");
    setSchedules(operatingHours.schedules);
  }, [operatingHours]);

  function updateSchedule(
    id: string,
    patch: Partial<FleetWeeklyOperatingSchedule>
  ) {
    setSchedules((current) =>
      current.map((schedule) =>
        schedule.id === id ? { ...schedule, ...patch } : schedule
      )
    );
  }

  function toggleWeekday(scheduleId: string, weekday: number) {
    setSchedules((current) =>
      current.map((schedule) => {
        if (schedule.id !== scheduleId) return schedule;
        const hasDay = schedule.weekdayNumbers.includes(weekday);
        const weekdayNumbers = hasDay
          ? schedule.weekdayNumbers.filter((n) => n !== weekday)
          : [...schedule.weekdayNumbers, weekday];
        return { ...schedule, weekdayNumbers };
      })
    );
  }

  async function handleSave() {
    const ok = await saveOperatingHours({
      timeZoneIdentifier: timeZoneIdentifier.trim() || null,
      schedules,
    });
    if (ok) router.push("/company");
  }

  return (
    <CompanySettingsPage
      title="Operating hours"
      description="Define when your fleet dispatches trips and which time zone applies."
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSchedules((current) => [...current, makeSchedule()])}
        >
          Add pattern
        </Button>
      }
      banner={
        actionError ? (
          <AdminActionBanner
            message={actionError}
            onDismiss={clearActionError}
          />
        ) : null
      }
      className="max-w-3xl space-y-6"
    >
        <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
          <Label>Fleet time zone (IANA)</Label>
          <Input
            value={timeZoneIdentifier}
            onChange={(e) => setTimeZoneIdentifier(e.target.value)}
            placeholder="Australia/Sydney"
          />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Used for dispatch scheduling and weekly patterns.
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
            Weekly patterns
          </h4>

        {schedules.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No operating patterns yet. Add one to define when the fleet dispatches.
          </p>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={schedule.isEnabled}
                      onChange={(e) =>
                        updateSchedule(schedule.id, {
                          isEnabled: e.target.checked,
                        })
                      }
                    />
                    Enabled
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setSchedules((current) =>
                        current.filter((item) => item.id !== schedule.id)
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>

                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  {formatWeekdayNumbers(schedule.weekdayNumbers)} ·{" "}
                  {formatScheduleWindow(schedule.startTime, schedule.endTime)}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((day) => {
                    const active = schedule.weekdayNumbers.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        className={`rounded-lg px-3 py-1.5 text-sm ${
                          active
                            ? "bg-brand-500 text-white"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                        onClick={() => toggleWeekday(schedule.id, day.value)}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Start time</Label>
                    <Input
                      type="time"
                      value={schedule.startTime ?? ""}
                      onChange={(e) =>
                        updateSchedule(schedule.id, {
                          startTime: e.target.value || null,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>End time</Label>
                    <Input
                      type="time"
                      value={schedule.endTime ?? ""}
                      onChange={(e) =>
                        updateSchedule(schedule.id, {
                          endTime: e.target.value || null,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        </div>

        <div className="flex gap-3">
          <Button disabled={isSaving} onClick={handleSave}>
            {isSaving ? "Saving…" : "Save operating hours"}
          </Button>
          <Button variant="outline" disabled={isSaving} onClick={() => router.push("/company")}>
            Cancel
          </Button>
        </div>
    </CompanySettingsPage>
  );
}
