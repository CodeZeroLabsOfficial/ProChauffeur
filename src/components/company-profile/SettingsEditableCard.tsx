import CompanyProfileEditButton from "@/components/company-profile/CompanyProfileEditButton";
import React from "react";

type SettingsEditableCardProps = {
  children: React.ReactNode;
  onEdit: () => void;
  editAriaLabel?: string;
  className?: string;
};

export default function SettingsEditableCard({
  children,
  onEdit,
  editAriaLabel = "Edit",
  className = "",
}: SettingsEditableCardProps) {
  return (
    <div
      className={`relative rounded-2xl border border-gray-200 p-5 transition hover:border-brand-300 dark:border-gray-800 dark:hover:border-brand-800 lg:p-6 ${className}`.trim()}
    >
      <CompanyProfileEditButton
        onClick={onEdit}
        ariaLabel={editAriaLabel}
        className="absolute right-5 top-5 z-10"
      />
      {children}
    </div>
  );
}
