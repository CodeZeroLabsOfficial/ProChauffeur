import CompanySettingsLayout from "@/layout/CompanySettingsLayout";
import React from "react";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CompanySettingsLayout>{children}</CompanySettingsLayout>;
}
