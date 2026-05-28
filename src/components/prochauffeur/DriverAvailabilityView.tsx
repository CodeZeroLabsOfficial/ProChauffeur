"use client";

import CompanySettingsSection from "@/components/company-profile/CompanySettingsSection";
import SettingsEditableCard from "@/components/company-profile/SettingsEditableCard";
import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import OperatingHoursPatternModal from "@/components/prochauffeur/OperatingHoursPatternModal";
import Button from "@/components/ui/button/Button";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { useModal } from "@/hooks/useModal";
import { resolvedDriverProfile } from "@/lib/prochauffeur/display";
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

function AvailabilityPatternCard({
  schedule,
  timeZoneLabel,
  weekStartsOn,
  onEdit,
}: {
  schedule: FleetWeeklyOperatingSchedule;
  timeZoneLabel: string;
  weekStartsOn: number;
  onEdit: () => void;
}) {
  const businessDays = schedule.isEnabled
    ? formatBusinessDays(schedule.weekdayNumbers)
    : "Disabled";
  const businessHours = schedule.isEnabled
    ? formatBusinessHours(schedule.startTime, schedule.endTime)
    : "—";

  return (
    <SettingsEditableCard
      onEdit={onEdit}
      editAriaLabel="Edit availability pattern"
      className="lg:p-5"
    >
      <div className="grid grid-cols-1 gap-4 pe-10 sm:grid-cols-2 sm:gap-6">
        <SummaryField label="Work days" value={businessDays} />
        <SummaryField label="Work hours" value={businessHours} />
        <SummaryField label="Timezone" value={timeZoneLabel} />
        <SummaryField
          label="Week starts on"
          value={formatWeekStartsOn(weekStartsOn)}
        />
      </div>
    </SettingsEditableCard>
  );
}

export default function DriverAvailabilityView({ userId }: { userId: string }) {
  const { userById } = useAdminDashboard();
  const {
    operatingHours,
    fleetLocale,
    saveDriverProfiles,
    isSaving,
    actionError,
    clearActionError,
  } = useAdminOperations();

  const driver = userById.get(userId);
  const driverProfile = resolvedDriverProfile(driver);
  const schedules = driverProfile.availabilitySchedules;
  const weekStartsOn = operatingHours.weekStartsOn;

  const timeZoneLabel = formatTimeZoneLabel(
    driverProfile.timeZoneIdentifier ??
      fleetLocale.timeZoneIdentifier ??
      operatingHours.timeZoneIdentifier
  );

  const { isOpen, openModal, closeModal } = useModal();
  const [formKey, setFormKey] = useState(0);
  const [editingScheduleId, setEditingScheduleId] = useState<string | undefined>();

  const editingSchedule =
    editingScheduleId != null
      ? (schedules.find((s) => s.id === editingScheduleId) ?? null)
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

  async function persistSchedules(nextSchedules: FleetWeeklyOperatingSchedule[]) {
    if (!driver) return false;
    clearActionError();
    const timeZoneIdentifier =
      driverProfile.timeZoneIdentifier ??
      fleetLocale.timeZoneIdentifier ??
      operatingHours.timeZoneIdentifier;
    return saveDriverProfiles(userId, driver.profile, {
      ...driverProfile,
      availabilitySchedules: nextSchedules,
      timeZoneIdentifier,
    });
  }

  async function handleSavePattern(
    schedule: FleetWeeklyOperatingSchedule,
    _nextWeekStartsOn: number
  ) {
    const nextSchedules =
      editingScheduleId == null
        ? [...schedules, schedule]
        : schedules.map((item) => (item.id === schedule.id ? schedule : item));
    return persistSchedules(nextSchedules);
  }

  async function handleDeletePattern() {
    if (editingScheduleId == null) return false;
    const nextSchedules = schedules.filter(
      (item) => item.id !== editingScheduleId
    );
    return persistSchedules(nextSchedules);
  }

  if (!driver) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Driver not found.
      </p>
    );
  }

  return (
    <>
      <CompanySettingsSection
        id="availability"
        title="Availability"
        description="Define when this chauffeur is available for dispatch."
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
        {schedules.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 px-6 py-16 text-center dark:border-gray-800">
            <h4 className="font-semibold text-gray-800 dark:text-white/90">
              No patterns yet
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Add a weekly pattern to define when this driver can take trips.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <AvailabilityPatternCard
                key={schedule.id}
                schedule={schedule}
                timeZoneLabel={timeZoneLabel}
                weekStartsOn={weekStartsOn}
                onEdit={() => openEditPatternModal(schedule.id)}
              />
            ))}
          </div>
        )}
      </CompanySettingsSection>

      <OperatingHoursPatternModal
        key={formKey}
        isOpen={isOpen}
        onClose={closePatternModal}
        title={editingScheduleId ? "Edit pattern" : "Add pattern"}
        schedule={editingSchedule}
        weekStartsOn={weekStartsOn}
        isSaving={isSaving}
        actionError={actionError}
        clearActionError={clearActionError}
        onSave={handleSavePattern}
        onDelete={
          editingScheduleId == null ? undefined : handleDeletePattern
        }
      />
    </>
  );
}
