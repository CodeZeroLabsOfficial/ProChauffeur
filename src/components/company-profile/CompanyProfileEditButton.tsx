import { PencilIcon } from "@/icons/index";
import React from "react";

const editIconButtonClassName =
  "rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200";

export default function CompanyProfileEditButton({
  onClick,
  ariaLabel = "Edit",
  className = "",
}: {
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`${editIconButtonClassName} ${className}`.trim()}
    >
      <PencilIcon className="h-4 w-4 fill-current" />
    </button>
  );
}
