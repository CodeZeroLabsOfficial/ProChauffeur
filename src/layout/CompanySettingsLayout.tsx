"use client";

import CompanySettingsSidebar from "@/layout/CompanySettingsSidebar";
import { CloseIcon } from "@/icons/index";
import React, { useState } from "react";

export default function CompanySettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="-mx-4 flex min-h-[calc(100vh-4rem)] flex-col md:-mx-6 lg:min-h-[calc(100vh-5rem)] lg:flex-row">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300"
        >
          Company settings
        </button>
      </div>

      <CompanySettingsSidebar className="hidden lg:flex" />

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-99999 lg:hidden">
          <button
            type="button"
            aria-label="Close company settings menu"
            className="absolute inset-0 bg-gray-900/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[min(100%,280px)] flex-col bg-white shadow-theme-lg dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Company settings
              </span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <CloseIcon />
              </button>
            </div>
            <CompanySettingsSidebar
              className="flex-1 border-0"
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="min-w-0 flex-1 px-4 py-4 md:px-6 md:py-6">{children}</div>
    </div>
  );
}
