"use client";

import CompanySettingsSection from "@/components/company-profile/CompanySettingsSection";
import Button from "@/components/ui/button/Button";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { capLabel } from "@/lib/prochauffeur/display";
import React from "react";

function usagePercent(current: number, cap: number): number {
  if (!Number.isFinite(cap) || cap <= 0 || cap >= Number.MAX_SAFE_INTEGER / 2) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((current / cap) * 100)));
}

function UsageRow({
  title,
  current,
  cap,
}: {
  title: string;
  current: number;
  cap: number;
}) {
  const capped = cap < Number.MAX_SAFE_INTEGER / 2;
  const label = capped ? `${current} / ${cap}` : `${current} / Unlimited`;
  const percent = usagePercent(current, cap);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{label}</p>
      </div>
      {capped ? (
        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-brand-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function LicenseManagementView() {
  const { users } = useAdminDashboard();
  const { limits, locations } = useAdminOperations();

  let admins = 0;
  let drivers = 0;
  for (const user of users) {
    if (user.role === "admin") admins += 1;
    if (user.role === "driver") drivers += 1;
  }

  const tier = limits.subscriptionTier.trim() || "Not configured";

  return (
    <CompanySettingsSection
      id="license"
      title=""
    >
      <div className="overflow-hidden">
        <div className="flex flex-col gap-4 pb-5 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold text-gray-800 dark:text-white/90">
              You&apos;re on {tier} plan
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              License usage and account capacity for your current subscription.
            </p>
          </div>
          <Button variant="outline" disabled>
            Manage plan
          </Button>
        </div>

        <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/60 sm:p-5">
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              License limits
            </p>
            <div className="mt-3 space-y-4">
              <UsageRow title="Admin accounts" current={admins} cap={limits.maxAdmins} />
              <UsageRow title="Drivers" current={drivers} cap={limits.maxDrivers} />
              <UsageRow
                title="Dispatch locations"
                current={locations.length}
                cap={limits.maxLocations}
              />
            </div>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Caps: admins {capLabel(limits.maxAdmins)}, drivers{" "}
              {capLabel(limits.maxDrivers)}, locations{" "}
              {capLabel(limits.maxLocations)}.
            </p>
          </div>
        </div>
      </div>
    </CompanySettingsSection>
  );
}
