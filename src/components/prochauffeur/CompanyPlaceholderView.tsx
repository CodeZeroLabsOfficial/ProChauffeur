"use client";

import CompanySettingsPage from "@/components/company-profile/CompanySettingsPage";
import React from "react";

type CompanyPlaceholderViewProps = {
  title: string;
  message: string;
  description?: string;
};

export default function CompanyPlaceholderView({
  title,
  message,
  description,
}: CompanyPlaceholderViewProps) {
  return (
    <CompanySettingsPage title={title} description={description}>
      <p className="max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {message}
      </p>
    </CompanySettingsPage>
  );
}
