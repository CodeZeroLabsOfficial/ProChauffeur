"use client";

import CompanySettingsSection from "@/components/company-profile/CompanySettingsSection";
import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { resolvedDriverProfile } from "@/lib/prochauffeur/display";
import React, { useEffect, useState } from "react";

export default function DriverLicenseView({ userId }: { userId: string }) {
  const { userById } = useAdminDashboard();
  const { actionError, clearActionError, isSaving, saveDriverProfiles } =
    useAdminOperations();

  const driver = userById.get(userId);
  const [summary, setSummary] = useState("");
  const [number, setNumber] = useState("");
  const [classOrType, setClassOrType] = useState("");
  const [conditions, setConditions] = useState("");
  const [conditionCodes, setConditionCodes] = useState("");
  const [jurisdictionCode, setJurisdictionCode] = useState("");
  const [expiry, setExpiry] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!driver) return;
    const profile = resolvedDriverProfile(driver);
    setSummary(profile.driversLicenseSummary ?? "");
    setNumber(profile.driversLicenseNumber ?? "");
    setClassOrType(profile.driversLicenseClassOrType ?? "");
    setConditions(profile.driversLicenseConditions ?? "");
    setConditionCodes(profile.driversLicenseConditionCodes ?? "");
    setJurisdictionCode(profile.driversLicenseJurisdictionCode ?? "");
    setExpiry(
      profile.driversLicenseExpiry
        ? profile.driversLicenseExpiry.toISOString().slice(0, 10)
        : ""
    );
  }, [driver]);

  async function handleSave() {
    if (!driver) return;
    setLocalError(null);

    const driverProfile = {
      ...resolvedDriverProfile(driver),
      driversLicenseSummary: summary.trim() || null,
      driversLicenseNumber: number.trim() || null,
      driversLicenseClassOrType: classOrType.trim() || null,
      driversLicenseConditions: conditions.trim() || null,
      driversLicenseConditionCodes: conditionCodes.trim() || null,
      driversLicenseJurisdictionCode: jurisdictionCode.trim() || null,
      driversLicenseExpiry: expiry ? new Date(expiry) : null,
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
      id="license"
      title="Licence"
      description="Store licence details for compliance and dispatch checks."
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
      <div className="max-w-2xl space-y-5">
        <div>
          <Label>Summary</Label>
          <TextArea
            rows={2}
            value={summary}
            onChange={setSummary}
            placeholder="Short summary for admin lists"
          />
        </div>
        <div>
          <Label>Licence number</Label>
          <Input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Licence number"
          />
        </div>
        <div>
          <Label>Class or type</Label>
          <Input
            value={classOrType}
            onChange={(e) => setClassOrType(e.target.value)}
            placeholder="e.g. C, HR"
          />
        </div>
        <div>
          <Label>Conditions</Label>
          <TextArea
            rows={2}
            value={conditions}
            onChange={setConditions}
            placeholder="Conditions on the licence"
          />
        </div>
        <div>
          <Label>Condition codes</Label>
          <Input
            value={conditionCodes}
            onChange={(e) => setConditionCodes(e.target.value)}
            placeholder="e.g. A, B"
          />
        </div>
        <div>
          <Label>Jurisdiction</Label>
          <Input
            value={jurisdictionCode}
            onChange={(e) => setJurisdictionCode(e.target.value)}
            placeholder="State or territory code"
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
