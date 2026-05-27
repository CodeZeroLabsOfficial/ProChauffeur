"use client";

import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import type { FleetWeeklyOperatingSchedule } from "@/lib/prochauffeur/types";
import { formatWeekStartsOn } from "@/lib/prochauffeur/operatingHoursDisplay";
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

const WEEK_START_OPTIONS = [2, 3, 4, 5, 6, 7, 1].map((value) => ({
  value,
  label: formatWeekStartsOn(value),
}));

const selectClassName =
  "h-11 w-full appearance-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800";

type OperatingHoursPatternModalProps = {
  schedule: FleetWeeklyOperatingSchedule | null;
  weekStartsOn: number;
  isSaving: boolean;
  actionError: string | null;
  clearActionError: () => void;
  onSave: (
    schedule: FleetWeeklyOperatingSchedule,
    weekStartsOn: number
  ) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
  onCancel: () => void;
};

export default function OperatingHoursPatternModal({
  schedule,
  weekStartsOn,
  isSaving,
  actionError,
  clearActionError,
  onSave,
  onDelete,
  onCancel,
}: OperatingHoursPatternModalProps) {
  const isNew = schedule == null;

  const [draft, setDraft] = useState<FleetWeeklyOperatingSchedule | null>(null);
  const [draftWeekStartsOn, setDraftWeekStartsOn] = useState(2);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setDraft(
      schedule ?? {
        id: crypto.randomUUID(),
        isEnabled: true,
        weekdayNumbers: [2, 3, 4, 5, 6],
        startTime: "09:00",
        endTime: "17:00",
      }
    );
    setDraftWeekStartsOn(weekStartsOn);
    setConfirmDelete(false);
  }, [schedule, weekStartsOn]);

  if (!draft) return null;

  function toggleWeekday(weekday: number) {
    setDraft((current) => {
      if (!current) return current;
      const hasDay = current.weekdayNumbers.includes(weekday);
      const weekdayNumbers = hasDay
        ? current.weekdayNumbers.filter((n) => n !== weekday)
        : [...current.weekdayNumbers, weekday];
      return { ...current, weekdayNumbers };
    });
  }

  async function handleSave() {
    if (!draft) return;
    const ok = await onSave(draft, draftWeekStartsOn);
    if (ok) onCancel();
  }

  async function handleDelete() {
    if (!onDelete) return;
    const ok = await onDelete();
    if (ok) onCancel();
  }

  return (
    <div className="space-y-5">
      {actionError ? (
        <AdminActionBanner message={actionError} onDismiss={clearActionError} />
      ) : null}

      <div>
        <Label htmlFor="week-starts-on">Week starts on</Label>
        <select
          id="week-starts-on"
          className={selectClassName}
          value={draftWeekStartsOn}
          onChange={(e) => setDraftWeekStartsOn(Number(e.target.value))}
        >
          {WEEK_START_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={draft.isEnabled}
          onChange={(e) => setDraft({ ...draft, isEnabled: e.target.checked })}
        />
        Pattern enabled
      </label>

      <div>
        <Label>Business days</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {WEEKDAY_OPTIONS.map((day) => {
            const active = draft.weekdayNumbers.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  active
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                }`}
                onClick={() => toggleWeekday(day.value)}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Start time</Label>
          <Input
            type="time"
            value={draft.startTime ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                startTime: e.target.value || null,
              })
            }
          />
        </div>
        <div>
          <Label>End time</Label>
          <Input
            type="time"
            value={draft.endTime ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                endTime: e.target.value || null,
              })
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap gap-3">
          {!isNew && onDelete ? (
            !confirmDelete ? (
              <Button
                className="!bg-error-500 hover:!bg-error-600"
                size="sm"
                disabled={isSaving}
                onClick={() => setConfirmDelete(true)}
              >
                Delete pattern
              </Button>
            ) : (
              <>
                <Button
                  className="!bg-error-500 hover:!bg-error-600"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => void handleDelete()}
                >
                  Confirm delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel delete
                </Button>
              </>
            )
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            size="sm"
            variant="outline"
            disabled={isSaving}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={isSaving || confirmDelete}
            onClick={() => void handleSave()}
          >
            {isSaving ? "Saving…" : "Save pattern"}
          </Button>
        </div>
      </div>
    </div>
  );
}
