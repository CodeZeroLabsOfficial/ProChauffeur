"use client";

import CompanySettingsSection from "@/components/company-profile/CompanySettingsSection";
import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import {
  CHAUFFEUR_CATEGORY_LABELS,
  type ChauffeurCategory,
} from "@/lib/prochauffeur/types";
import { resolvedDriverProfile } from "@/lib/prochauffeur/display";
import { vehicleDisplayName } from "@/lib/prochauffeur/vehicleHelpers";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const categories = Object.entries(CHAUFFEUR_CATEGORY_LABELS) as [
  ChauffeurCategory,
  string,
][];

export default function DriverProfileEditView({ userId }: { userId: string }) {
  const router = useRouter();
  const { appUser: sessionUser } = useAuth();
  const { userById } = useAdminDashboard();
  const {
    actionError,
    clearActionError,
    deleteDriver,
    isSaving,
    saveDriverProfiles,
    vehicleForChauffeur,
  } = useAdminOperations();

  const driver = userById.get(userId);
  const assignedVehicle = vehicleForChauffeur(userId);
  const canDelete =
    driver?.role === "driver" && driver.id !== sessionUser?.id;

  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [category, setCategory] = useState<ChauffeurCategory>("chauffeur");
  const [bioStatement, setBioStatement] = useState("");
  const [visibleOnCustomerApp, setVisibleOnCustomerApp] = useState(true);
  const [acceptsDispatchAssignments, setAcceptsDispatchAssignments] =
    useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!driver) return;
    const profile = resolvedDriverProfile(driver);
    setDisplayName(driver.profile.displayName);
    setPhoneNumber(driver.profile.phoneNumber ?? "");
    setDateOfBirth(
      driver.profile.dateOfBirth
        ? driver.profile.dateOfBirth.toISOString().slice(0, 10)
        : ""
    );
    setCategory(profile.chauffeurCategory);
    setBioStatement(profile.bioStatement);
    setVisibleOnCustomerApp(profile.visibleOnCustomerApp);
    setAcceptsDispatchAssignments(profile.acceptsDispatchAssignments);
  }, [driver]);

  async function handleSave() {
    if (!driver) return;
    if (!displayName.trim()) {
      setLocalError("Display name is required.");
      return;
    }
    if (!bioStatement.trim()) {
      setLocalError("Bio for clients is required.");
      return;
    }
    setLocalError(null);

    const profile = {
      ...driver.profile,
      displayName: displayName.trim(),
      phoneNumber: phoneNumber.trim() || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
    };
    const driverProfile = {
      ...resolvedDriverProfile(driver),
      chauffeurCategory: category,
      bioStatement: bioStatement.trim(),
      visibleOnCustomerApp,
      acceptsDispatchAssignments,
    };

    await saveDriverProfiles(userId, profile, driverProfile);
  }

  async function handleDelete() {
    const ok = await deleteDriver(userId);
    if (ok) router.push("/drivers");
  }

  if (!driver) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Driver not found.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <CompanySettingsSection
        id="overview"
        title="Overview"
        description="Contact details, role, bio, and dispatch preferences."
        banner={
          actionError || localError ? (
            <AdminActionBanner
              message={localError ?? actionError ?? ""}
              onDismiss={() => {
                setLocalError(null);
                clearActionError();
              }}
            />
          ) : null
        }
      >
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          {driver.email}
          {assignedVehicle
            ? ` · ${vehicleDisplayName(assignedVehicle)} (${assignedVehicle.licensePlate})`
            : " · No fleet vehicle assigned"}
        </p>

        <div className="max-w-2xl space-y-5">
          <div>
            <Label>Display name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
            />
          </div>
          <div>
            <Label>Phone number</Label>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Phone number"
            />
          </div>
          <div>
            <Label>Date of birth</Label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>
          <div>
            <Label>Chauffeur role</Label>
            <select
              className="h-11 w-full rounded-lg border border-gray-300 px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              value={category}
              onChange={(e) => setCategory(e.target.value as ChauffeurCategory)}
            >
              {categories.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Bio for clients</Label>
            <TextArea
              rows={4}
              value={bioStatement}
              onChange={(v) => setBioStatement(v)}
              placeholder="Bio for clients"
            />
          </div>
          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={visibleOnCustomerApp}
              onChange={(e) => setVisibleOnCustomerApp(e.target.checked)}
            />
            Visible on customer app
          </label>
          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={acceptsDispatchAssignments}
              onChange={(e) => setAcceptsDispatchAssignments(e.target.checked)}
            />
            Accepts dispatch assignments
          </label>

          <Button disabled={isSaving} onClick={handleSave}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CompanySettingsSection>

      {canDelete ? (
        <div className="rounded-2xl border border-error-500/20 bg-error-500/5 p-5 lg:p-6">
          <h3 className="font-medium text-error-500">Delete driver</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Removes the driver Auth account, user document, and linked vehicle
            document via the deleteDriverAuth Cloud Function.
          </p>
          {!confirmDelete ? (
            <Button
              className="mt-4 !bg-error-500 hover:!bg-error-600"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              Delete driver
            </Button>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                className="!bg-error-500 hover:!bg-error-600"
                size="sm"
                disabled={isSaving}
                onClick={handleDelete}
              >
                {isSaving ? "Deleting…" : "Confirm delete"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isSaving}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
