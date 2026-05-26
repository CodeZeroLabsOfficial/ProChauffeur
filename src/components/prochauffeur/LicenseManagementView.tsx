"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { capLabel } from "@/lib/prochauffeur/display";
import React from "react";

function MetricCard({
  title,
  current,
  capLabelText,
}: {
  title: string;
  current: number;
  capLabelText: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
        {current}
        <span className="ml-2 text-base font-normal text-gray-500 dark:text-gray-400">
          / {capLabelText}
        </span>
      </p>
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
    <div>
      <PageBreadcrumb pageTitle="License management" />

      <div className="mb-6 rounded-2xl border border-brand-500/20 bg-brand-500/5 p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Subscription tier
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
          {tier}
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Admin accounts"
          current={admins}
          capLabelText={capLabel(limits.maxAdmins)}
        />
        <MetricCard
          title="Drivers"
          current={drivers}
          capLabelText={capLabel(limits.maxDrivers)}
        />
        <MetricCard
          title="Dispatch locations"
          current={locations.length}
          capLabelText={capLabel(limits.maxLocations)}
        />
      </div>
    </div>
  );
}
