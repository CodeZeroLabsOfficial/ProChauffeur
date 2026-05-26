"use client";

import CompanyAddressCard from "@/components/company-profile/CompanyAddressCard";
import CompanyDetailsCard from "@/components/company-profile/CompanyDetailsCard";
import CompanySettingsPage from "@/components/company-profile/CompanySettingsPage";
import AdminActionBanner from "@/components/prochauffeur/AdminActionBanner";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import React from "react";

export default function CompanyHubView() {
  const { actionError, clearActionError } = useAdminOperations();

  return (
    <CompanySettingsPage
      title="Overview"
      description="Company profile, contact details, and registered address."
      banner={
        actionError ? (
          <AdminActionBanner
            message={actionError}
            onDismiss={clearActionError}
          />
        ) : null
      }
    >
      <div className="space-y-6">
        <CompanyDetailsCard />
        <CompanyAddressCard />
      </div>
    </CompanySettingsPage>
  );
}
