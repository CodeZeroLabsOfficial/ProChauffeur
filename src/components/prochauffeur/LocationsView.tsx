"use client";

import CompanySettingsPage from "@/components/company-profile/CompanySettingsPage";
import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import Button from "@/components/ui/button/Button";
import FormModal from "@/components/prochauffeur/FormModal";
import LocationFormView from "@/components/prochauffeur/LocationFormView";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { useModal } from "@/hooks/useModal";
import { capLabel } from "@/lib/prochauffeur/display";
import Link from "next/link";
import React, { useState } from "react";

export default function LocationsView() {
  const {
    locations,
    limits,
    hasReceivedOperationsSnapshot,
    actionError,
    clearActionError,
  } = useAdminOperations();
  const { isOpen, openModal, closeModal } = useModal();
  const [addLocationKey, setAddLocationKey] = useState(0);

  function openAddLocationModal() {
    setAddLocationKey((key) => key + 1);
    openModal();
  }

  return (
    <>
      <CompanySettingsPage
        title="Locations"
        description={`${locations.length}/${capLabel(limits.maxLocations)} dispatch locations`}
        actions={
          <Button size="sm" onClick={openAddLocationModal}>
            Add location
          </Button>
        }
        banner={
          actionError ? (
            <div className="mb-4">
              <AdminActionBanner
                message={actionError}
                onDismiss={clearActionError}
              />
            </div>
          ) : null
        }
      >
        {!hasReceivedOperationsSnapshot ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Loading locations…
          </p>
        ) : locations.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 px-6 py-16 text-center dark:border-gray-800">
            <h4 className="font-semibold text-gray-800 dark:text-white/90">
              No locations yet
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Add yards, offices, or satellite bases used by dispatch.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((location) => (
              <Link
                key={location.id}
                href={`/company/locations/${location.id}`}
                className="block rounded-2xl border border-gray-200 p-5 transition hover:border-brand-300 dark:border-gray-800 dark:hover:border-brand-800"
              >
                <h4 className="font-semibold text-gray-800 dark:text-white/90">
                  {location.name}
                </h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {location.addressLine}
                </p>
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </CompanySettingsPage>

      <FormModal
        isOpen={isOpen}
        onClose={closeModal}
        title="Add location"
        className="max-w-2xl p-5 lg:p-10"
      >
        <LocationFormView
          key={addLocationKey}
          variant="modal"
          onSuccess={closeModal}
          onCancel={closeModal}
        />
      </FormModal>
    </>
  );
}
