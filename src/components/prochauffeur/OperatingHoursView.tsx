"use client";

import CompanySettingsSection from "@/components/company-profile/CompanySettingsSection";
import SettingsEditableCard from "@/components/company-profile/SettingsEditableCard";
import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import OperatingHoursPatternModal from "@/components/prochauffeur/OperatingHoursPatternModal";
import FormModal from "@/components/prochauffeur/FormModal";
import Button from "@/components/ui/button/Button";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { useModal } from "@/hooks/useModal";
import {
  formatBusinessDays,
  formatBusinessHours,
  formatTimeZoneLabel,
  formatWeekStartsOn,
} from "@/lib/prochauffeur/operatingHoursDisplay";
import type { FleetWeeklyOperatingSchedule } from "@/lib/prochauffeur/types";
import React, { useState } from "react";

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="text-sm font-medium text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}

type PatternCardProps = {
  schedule: FleetWeeklyOperatingSchedule;
  timeZoneLabel: string;
  weekStartsOn: number;
  onEdit: () => void;
};

function OperatingHoursPatternCard({
  schedule,
  timeZoneLabel,
  weekStartsOn,
  onEdit,
}: PatternCardProps) {
  const businessDays = schedule.isEnabled
    ? formatBusinessDays(schedule.weekdayNumbers)
    : "Disabled";

  const businessHours = schedule.isEnabled
    ? formatBusinessHours(schedule.startTime, schedule.endTime)
    : "—";

  return (
    <SettingsEditableCard
      onEdit={onEdit}
      editAriaLabel="Edit operating pattern"
      className="lg:p-5"
    >
      <div className="grid grid-cols-1 gap-4 pe-10 sm:grid-cols-2 sm:gap-6">
        <SummaryField label="Business days" value={businessDays} />
        <SummaryField label="Business hours" value={businessHours} />
        <SummaryField label="Timezone" value={timeZoneLabel} />
        <SummaryField
          label="Week starts on"
          value={formatWeekStartsOn(weekStartsOn)}
        />
      </div>
    </SettingsEditableCard>
  );
}

export default function OperatingHoursView() {
  const {
    operatingHours,
    fleetLocale,
    saveOperatingHours,
    isSaving,
    actionError,
    clearActionError,
  } = useAdminOperations();

  const { isOpen, openModal, closeModal } = useModal();
  const [formKey, setFormKey] = useState(0);
  const [editingScheduleId, setEditingScheduleId] = useState<string | undefined>();

  const timeZoneLabel = formatTimeZoneLabel(
    fleetLocale.timeZoneIdentifier ?? operatingHours.timeZoneIdentifier
  );

  const editingSchedule =
    editingScheduleId != null
      ? (operatingHours.schedules.find((s) => s.id === editingScheduleId) ??
        null)
      : null;

  function openAddPatternModal() {
    setEditingScheduleId(undefined);
    setFormKey((key) => key + 1);
    openModal();
  }

  function openEditPatternModal(scheduleId: string) {
    setEditingScheduleId(scheduleId);
    setFormKey((key) => key + 1);
    openModal();
  }

  function closePatternModal() {
    closeModal();
    setEditingScheduleId(undefined);
  }

  async function persistSchedules(
    schedules: FleetWeeklyOperatingSchedule[],
    weekStartsOn: number
  ) {
    return saveOperatingHours({
      timeZoneIdentifier: operatingHours.timeZoneIdentifier,
      weekStartsOn,
      schedules,
    });
  }

  async function handleSavePattern(
    schedule: FleetWeeklyOperatingSchedule,
    weekStartsOn: number
  ) {
    clearActionError();
    const schedules =
      editingScheduleId == null
        ? [...operatingHours.schedules, schedule]
        : operatingHours.schedules.map((item) =>
            item.id === schedule.id ? schedule : item
          );
    return persistSchedules(schedules, weekStartsOn);
  }

  async function handleDeletePattern() {
    if (editingScheduleId == null) return false;
    clearActionError();
    const schedules = operatingHours.schedules.filter(
      (item) => item.id !== editingScheduleId
    );
    return persistSchedules(schedules, operatingHours.weekStartsOn);
  }

  return (
    <>
      <CompanySettingsSection
        id="operating-hours"
        title="Operating hours"
        description="Define when your fleet dispatches trips."
        actions={
          <Button size="sm" onClick={openAddPatternModal}>
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
      >
        {operatingHours.schedules.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 px-6 py-16 text-center dark:border-gray-800">
            <h4 className="font-semibold text-gray-800 dark:text-white/90">
              No patterns yet
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Add a weekly pattern to define when the fleet dispatches.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {operatingHours.schedules.map((schedule) => (
              <OperatingHoursPatternCard
                key={schedule.id}
                schedule={schedule}
                timeZoneLabel={timeZoneLabel}
                weekStartsOn={operatingHours.weekStartsOn}
                onEdit={() => openEditPatternModal(schedule.id)}
              />
            ))}
          </div>
        )}
      </CompanySettingsSection>

      <FormModal
        isOpen={isOpen}
        onClose={closePatternModal}
        title={editingScheduleId ? "Edit pattern" : "Add pattern"}
        className="max-w-2xl p-5 lg:p-10"
      >
        <OperatingHoursPatternModal
          key={formKey}
          schedule={editingSchedule}
          weekStartsOn={operatingHours.weekStartsOn}
          isSaving={isSaving}
          actionError={actionError}
          clearActionError={clearActionError}
          onSave={handleSavePattern}
          onDelete={
            editingScheduleId == null ? undefined : handleDeletePattern
          }
          onCancel={closePatternModal}
        />
      </FormModal>
    </>
  );
}
