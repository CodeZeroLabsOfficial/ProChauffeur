"use client";

import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
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
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <PageBreadcrumb pageTitle="Locations" />
        <Button size="sm" onClick={openAddLocationModal}>
          Add location
        </Button>
      </div>

      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {locations.length}/{capLabel(limits.maxLocations)} dispatch locations
      </p>

      {actionError ? (
        <AdminActionBanner message={actionError} onDismiss={clearActionError} />
      ) : null}

      {!hasReceivedOperationsSnapshot ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading locations…
        </p>
      ) : locations.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="font-semibold text-gray-800 dark:text-white/90">
            No locations yet
          </h3>
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
              className="block rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800"
            >
              <h3 className="font-semibold text-gray-800 dark:text-white/90">
                {location.name}
              </h3>
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
    </div>
  );
}
