"use client";

import CompanyPlaceholderView from "@/components/prochauffeur/CompanyPlaceholderView";
import AdminRosterView from "@/components/prochauffeur/AdminRosterView";
import LicenseManagementView from "@/components/prochauffeur/LicenseManagementView";
import React from "react";

export default function SettingsView() {
  return (
    <div className="space-y-6">
      <LicenseManagementView />
      <AdminRosterView />
      <CompanyPlaceholderView
        id="integrations"
        title="Integrations"
        description="Connect calendars, payments, telematics, and partner APIs."
        message="Connect calendars, payments, telematics, and partner APIs. Chauffeur operations rarely run on a single system — this hub will host those links when ready."
      />
    </div>
  );
}
