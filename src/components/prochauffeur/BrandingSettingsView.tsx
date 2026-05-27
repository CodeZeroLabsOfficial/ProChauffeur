"use client";

import CompanySettingsSection from "@/components/company-profile/CompanySettingsSection";
import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import BrandingAssetField from "@/components/prochauffeur/BrandingAssetField";
import Button from "@/components/ui/button/Button";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { BRANDING_SECTIONS } from "@/lib/prochauffeur/brandingAssets";
import type { AppFleetBrandingSettings } from "@/lib/prochauffeur/types";
import React, { useEffect, useState } from "react";

export default function BrandingSettingsView() {
  const {
    fleetBranding,
    saveFleetBranding,
    isSaving,
    actionError,
    clearActionError,
  } = useAdminOperations();

  const [draft, setDraft] = useState<AppFleetBrandingSettings>(fleetBranding);

  useEffect(() => {
    setDraft(fleetBranding);
  }, [fleetBranding]);

  function updateAsset(key: keyof AppFleetBrandingSettings, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleCancel() {
    setDraft(fleetBranding);
    clearActionError();
  }

  async function handleSave() {
    await saveFleetBranding(draft);
  }

  return (
    <CompanySettingsSection
      id="branding"
      title="Branding"
      description="Customize the favicon and logos shown across your web admin and customer-facing experiences."
      banner={
        actionError ? (
          <AdminActionBanner
            message={actionError}
            onDismiss={clearActionError}
          />
        ) : null
      }
      className="max-w-3xl"
    >
      <div className="space-y-6">
        {BRANDING_SECTIONS.map((section) => (
          <div
            key={section.id}
            className="rounded-xl border border-gray-200 bg-gray-50/60 p-5 dark:border-gray-800 dark:bg-white/[0.02] lg:p-6"
          >
            <h4 className="mb-5 text-sm font-semibold text-gray-800 dark:text-white/90">
              {section.title}
            </h4>
            <div className="space-y-6">
              {section.assets.map((asset) => (
                <BrandingAssetField
                  key={asset.key}
                  id={`branding-${asset.key}`}
                  label={asset.label}
                  usage={asset.usage}
                  value={draft[asset.key]}
                  preview={asset.preview}
                  onChange={(value) => updateAsset(asset.key, value)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
        <Button disabled={isSaving} onClick={() => void handleSave()}>
          {isSaving ? "Saving…" : "Save branding"}
        </Button>
        <Button variant="outline" disabled={isSaving} onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </CompanySettingsSection>
  );
}
