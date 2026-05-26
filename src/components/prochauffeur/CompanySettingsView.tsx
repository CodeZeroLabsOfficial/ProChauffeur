"use client";

import CompanyHubView from "@/components/prochauffeur/CompanyHubView";
import CompanyPlaceholderView from "@/components/prochauffeur/CompanyPlaceholderView";
import LocationsView from "@/components/prochauffeur/LocationsView";
import OperatingHoursView from "@/components/prochauffeur/OperatingHoursView";
import PricingConfigView from "@/components/prochauffeur/PricingConfigView";
import React from "react";

export default function CompanySettingsView() {
  return (
    <div className="space-y-6">
      <CompanyHubView />
      <CompanyPlaceholderView
        id="about-your-fleet"
        title="About your fleet"
        description="Public information shown to travelers booking with your fleet."
        message="Public fleet information for travelers is coming soon."
      />
      <OperatingHoursView />
      <LocationsView />
      <CompanyPlaceholderView
        id="dispatch-guides"
        title="Dispatch guides"
        description="Quick-reference playbooks for airports, venues, and VIP protocols."
        message="Publish quick-reference playbooks for airports, venues, and VIP protocols — your in-app equivalent of patient-facing articles. Content tools will plug into this library."
      />
      <PricingConfigView />
    </div>
  );
}
