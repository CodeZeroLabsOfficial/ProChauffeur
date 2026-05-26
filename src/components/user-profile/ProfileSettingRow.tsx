import React from "react";

type ProfileSettingRowProps = {
  title: string;
  description: string;
  action: React.ReactNode;
  bordered?: boolean;
};

export default function ProfileSettingRow({
  title,
  description,
  action,
  bordered = true,
}: ProfileSettingRowProps) {
  return (
    <div
      className={`flex flex-col justify-between gap-4 sm:flex-row sm:items-center ${
        bordered
          ? "border-b border-gray-200 pb-6 dark:border-gray-800"
          : ""
      }`}
    >
      <div>
        <h5 className="mb-1 text-base font-medium text-gray-800 dark:text-white/90">
          {title}
        </h5>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
