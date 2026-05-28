"use client";

import CompanySettingsSection from "@/components/company-profile/CompanySettingsSection";
import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import BrandingAssetField from "@/components/prochauffeur/BrandingAssetField";
import Button from "@/components/ui/button/Button";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { BRANDING_SECTIONS } from "@/lib/prochauffeur/brandingAssets";
import type { AppFleetBrandingSettings } from "@/lib/prochauffeur/types";
import React, { useEffect, useState } from "react";

const brandingAssets = BRANDING_SECTIONS.flatMap((section) => section.assets);

export default function BrandingSettingsView() {
  const {
    fleetBranding,
    saveFleetBranding,
    isSaving,
    actionError,
    clearActionError,
  } = useAdminOperations();

  const [draft, setDraft] = useState<AppFleetBrandingSettings>(fleetBranding);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (isSaving) return;
    setDraft(fleetBranding);
  }, [fleetBranding, isSaving]);

  function updateAsset(key: keyof AppFleetBrandingSettings, value: string) {
    setUploadError(null);
    clearActionError();
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleCancel() {
    setDraft(fleetBranding);
    setUploadError(null);
    clearActionError();
  }

  async function handleSave() {
    setUploadError(null);
    clearActionError();
    await saveFleetBranding(draft);
  }

  const bannerMessage = uploadError ?? actionError;

  return (
    <CompanySettingsSection
      id="branding"
      title="Branding"
      description="Customize the favicon and logos shown across your web admin and customer-facing experiences."
      banner={
        bannerMessage ? (
          <AdminActionBanner
            message={bannerMessage}
            onDismiss={() => {
              setUploadError(null);
              clearActionError();
            }}
          />
        ) : null
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {brandingAssets.map((asset) => (
          <BrandingAssetField
            key={asset.key}
            id={`branding-${asset.key}`}
            label={asset.label}
            value={draft[asset.key]}
            preview={asset.preview}
            onChange={(value) => updateAsset(asset.key, value)}
            onUploadError={setUploadError}
          />
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
        <Button variant="outline" disabled={isSaving} onClick={handleCancel}>
          Cancel
        </Button>
        <Button disabled={isSaving} onClick={() => void handleSave()}>
          {isSaving ? "Saving…" : "Save branding"}
        </Button>
      </div>
    </CompanySettingsSection>
  );
}
