import React from "react";

type CompanySettingsSectionProps = {
  id: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export default function CompanySettingsSection({
  id,
  title,
  description,
  actions,
  banner,
  children,
  className,
}: CompanySettingsSectionProps) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <section id={id} className="scroll-mt-6">
      {banner}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        {hasHeader ? (
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between lg:mb-7">
            <div className="min-w-0">
              {title ? (
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {title}
                </h3>
              ) : null}
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
        ) : null}

        {className ? <div className={className}>{children}</div> : children}
      </div>
    </section>
  );
}
