"use client";

import CompanySettingsSection from "@/components/company-profile/CompanySettingsSection";
import SettingsEditableCard from "@/components/company-profile/SettingsEditableCard";
import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import Button from "@/components/ui/button/Button";
import FormModal from "@/components/prochauffeur/FormModal";
import LocationFormView from "@/components/prochauffeur/LocationFormView";
import { useCompanySettingsScroll } from "@/context/CompanySettingsScrollContext";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { useModal } from "@/hooks/useModal";
import { capLabel } from "@/lib/prochauffeur/display";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

export default function LocationsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { scrollToSection } = useCompanySettingsScroll();
  const {
    locations,
    limits,
    hasReceivedOperationsSnapshot,
    actionError,
    clearActionError,
  } = useAdminOperations();
  const { isOpen, openModal, closeModal } = useModal();
  const [formKey, setFormKey] = useState(0);
  const [editingLocationId, setEditingLocationId] = useState<string | undefined>();

  const handledEditLocationRef = useRef<string | null>(null);

  function openAddLocationModal() {
    setEditingLocationId(undefined);
    setFormKey((key) => key + 1);
    openModal();
  }

  function openEditLocationModal(locationId: string) {
    setEditingLocationId(locationId);
    setFormKey((key) => key + 1);
    openModal();
  }

  function closeLocationModal() {
    closeModal();
    setEditingLocationId(undefined);
    if (searchParams.get("editLocation")) {
      router.replace("/company#locations", { scroll: false });
    }
  }

  useEffect(() => {
    const editLocationId = searchParams.get("editLocation");
    if (!editLocationId || handledEditLocationRef.current === editLocationId) {
      return;
    }

    handledEditLocationRef.current = editLocationId;
    scrollToSection("locations");
    openEditLocationModal(editLocationId);
  }, [searchParams, scrollToSection]);

  return (
    <>
      <CompanySettingsSection
        id="locations"
        title="Locations"
        description={`${locations.length}/${capLabel(limits.maxLocations)} dispatch locations`}
        actions={
          <Button size="sm" onClick={openAddLocationModal}>
            Add location
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
              <SettingsEditableCard
                key={location.id}
                onEdit={() => openEditLocationModal(location.id)}
                editAriaLabel={`Edit ${location.name}`}
                className="lg:p-5"
              >
                <h4 className="pe-10 font-semibold text-gray-800 dark:text-white/90">
                  {location.name}
                </h4>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {location.addressLine}
                </p>
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </p>
              </SettingsEditableCard>
            ))}
          </div>
        )}
      </CompanySettingsSection>

      <FormModal
        isOpen={isOpen}
        onClose={closeLocationModal}
        title={editingLocationId ? "Edit location" : "Add location"}
        className="max-w-2xl p-5 lg:p-10"
      >
        <LocationFormView
          key={formKey}
          locationId={editingLocationId}
          variant="modal"
          onSuccess={closeLocationModal}
          onCancel={closeLocationModal}
        />
      </FormModal>
    </>
  );
}
