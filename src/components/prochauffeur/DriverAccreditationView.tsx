"use client";

import CompanySettingsSection from "@/components/company-profile/CompanySettingsSection";
import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { resolvedDriverProfile } from "@/lib/prochauffeur/display";
import React, { useEffect, useState } from "react";

export default function DriverAccreditationView({ userId }: { userId: string }) {
  const { userById } = useAdminDashboard();
  const { actionError, clearActionError, isSaving, saveDriverProfiles } =
    useAdminOperations();

  const driver = userById.get(userId);
  const [accreditationNumber, setAccreditationNumber] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [expiry, setExpiry] = useState("");

  useEffect(() => {
    if (!driver) return;
    const profile = resolvedDriverProfile(driver);
    setAccreditationNumber(profile.operatorAccreditationNumber ?? "");
    setIssuingAuthority(profile.operatorAccreditationIssuingAuthority ?? "");
    setExpiry(
      profile.operatorAccreditationExpiry
        ? profile.operatorAccreditationExpiry.toISOString().slice(0, 10)
        : ""
    );
  }, [driver]);

  async function handleSave() {
    if (!driver) return;

    const driverProfile = {
      ...resolvedDriverProfile(driver),
      operatorAccreditationNumber: accreditationNumber.trim() || null,
      operatorAccreditationIssuingAuthority: issuingAuthority.trim() || null,
      operatorAccreditationExpiry: expiry ? new Date(expiry) : null,
    };

    await saveDriverProfiles(userId, driver.profile, driverProfile);
  }

  if (!driver) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Driver not found.
      </p>
    );
  }

  return (
    <CompanySettingsSection
      id="accreditation"
      title="Accreditation"
      description="Operator accreditation and certification for this chauffeur."
      banner={
        actionError ? (
          <AdminActionBanner
            message={actionError}
            onDismiss={clearActionError}
          />
        ) : null
      }
    >
      <div className="max-w-2xl space-y-5">
        <div>
          <Label>Accreditation number</Label>
          <Input
            value={accreditationNumber}
            onChange={(e) => setAccreditationNumber(e.target.value)}
            placeholder="Accreditation number"
          />
        </div>
        <div>
          <Label>Issuing authority</Label>
          <Input
            value={issuingAuthority}
            onChange={(e) => setIssuingAuthority(e.target.value)}
            placeholder="Issuing authority"
          />
        </div>
        <div>
          <Label>Expiry date</Label>
          <Input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
          />
        </div>

        <Button disabled={isSaving} onClick={handleSave}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </CompanySettingsSection>
  );
}
