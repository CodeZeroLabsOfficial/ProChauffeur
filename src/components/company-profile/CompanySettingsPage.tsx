import React from "react";

type CompanySettingsPageProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export default function CompanySettingsPage({
  title,
  description,
  actions,
  banner,
  children,
  className,
}: CompanySettingsPageProps) {
  return (
    <div>
      {banner}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between lg:mb-7">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              {actions}
            </div>
          ) : null}
        </div>

        {className ? <div className={className}>{children}</div> : children}
      </div>
    </div>
  );
}
