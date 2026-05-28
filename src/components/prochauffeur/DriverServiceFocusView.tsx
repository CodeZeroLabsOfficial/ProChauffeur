"use client";

import CompanySettingsSection from "@/components/company-profile/CompanySettingsSection";
import PageStub from "@/components/prochauffeur/PageStub";
import { stubs } from "@/lib/prochauffeur/stubs";

export default function DriverServiceFocusView() {
  const config = stubs.driverServiceFocus;

  return (
    <CompanySettingsSection
      id="service-focus"
      title="Service focus"
      description={config.description}
    >
      <PageStub {...config} />
    </CompanySettingsSection>
  );
}
