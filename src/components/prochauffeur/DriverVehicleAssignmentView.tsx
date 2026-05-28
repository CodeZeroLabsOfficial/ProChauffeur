"use client";

import CompanySettingsSection from "@/components/company-profile/CompanySettingsSection";
import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import Button from "@/components/ui/button/Button";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { vehicleDisplayName } from "@/lib/prochauffeur/vehicleHelpers";
import { VEHICLE_TYPE_LABELS } from "@/lib/prochauffeur/types";
import React, { useState } from "react";

export default function DriverVehicleAssignmentView({
  userId,
}: {
  userId: string;
}) {
  const {
    vehicles,
    actionError,
    clearActionError,
    assignVehicle,
    unassignVehicle,
    isSaving,
    vehicleForChauffeur,
  } = useAdminOperations();
  const [showPicker, setShowPicker] = useState(false);
  const [confirmUnassign, setConfirmUnassign] = useState(false);

  const currentVehicle = vehicleForChauffeur(userId);

  async function handleAssign(vehicleDocumentId: string) {
    const ok = await assignVehicle(vehicleDocumentId, userId);
    if (ok) setShowPicker(false);
  }

  async function handleUnassign() {
    const ok = await unassignVehicle(userId);
    if (ok) {
      setConfirmUnassign(false);
    }
  }

  return (
    <>
      <CompanySettingsSection
        id="vehicle"
        title="Vehicle assignment"
        description="Link a fleet vehicle to this chauffeur for dispatch and customer apps."
        banner={
          actionError ? (
            <AdminActionBanner
              message={actionError}
              onDismiss={clearActionError}
            />
          ) : null
        }
      >
        {currentVehicle ? (
          <div>
            <h4 className="text-base font-semibold text-gray-800 dark:text-white/90">
              {vehicleDisplayName(currentVehicle)}
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {VEHICLE_TYPE_LABELS[currentVehicle.pricingVehicleType]} ·{" "}
              {currentVehicle.licensePlate}
            </p>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              {currentVehicle.passengerCapacity} passengers · Wi‑Fi:{" "}
              {currentVehicle.wifiServiceDescription}
            </p>

            {!confirmUnassign ? (
              <Button
                className="mt-6 !bg-error-500 hover:!bg-error-600"
                size="sm"
                onClick={() => setConfirmUnassign(true)}
              >
                Unassign vehicle
              </Button>
            ) : (
              <div className="mt-6 flex gap-3">
                <Button
                  className="!bg-error-500 hover:!bg-error-600"
                  size="sm"
                  disabled={isSaving}
                  onClick={handleUnassign}
                >
                  {isSaving ? "Unassigning…" : "Confirm unassign"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => setConfirmUnassign(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 px-6 py-16 text-center dark:border-gray-800">
            <h4 className="font-semibold text-gray-800 dark:text-white/90">
              No vehicle assigned
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Choose a fleet vehicle to link to this chauffeur.
            </p>
            <Button className="mt-6" size="sm" onClick={() => setShowPicker(true)}>
              Assign vehicle
            </Button>
          </div>
        )}
      </CompanySettingsSection>

      {showPicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Choose a vehicle
              </h3>
              <button
                type="button"
                className="text-sm text-gray-500"
                onClick={() => setShowPicker(false)}
              >
                Close
              </button>
            </div>
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <button
                  key={vehicle.driverID}
                  type="button"
                  disabled={isSaving}
                  className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-brand-300 dark:border-gray-700 dark:hover:border-brand-800"
                  onClick={() => handleAssign(vehicle.driverID)}
                >
                  <div className="font-medium text-gray-800 dark:text-white/90">
                    {vehicleDisplayName(vehicle)}
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {vehicle.licensePlate}
                  </div>
                </button>
              ))}
              {vehicles.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Add fleet vehicles first under Fleet.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
