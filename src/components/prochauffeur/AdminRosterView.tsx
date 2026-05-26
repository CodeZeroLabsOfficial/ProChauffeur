"use client";

import CompanySettingsPage from "@/components/company-profile/CompanySettingsPage";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { capLabel, displayNameForUser } from "@/lib/prochauffeur/display";
import Link from "next/link";
import React from "react";

export default function AdminRosterView() {
  const { users } = useAdminDashboard();
  const { limits, hasReceivedOperationsSnapshot } = useAdminOperations();

  const admins = users
    .filter((u) => u.role === "admin")
    .sort((a, b) =>
      displayNameForUser(a, a.id).localeCompare(
        displayNameForUser(b, b.id),
        undefined,
        { sensitivity: "base" }
      )
    );

  return (
    <CompanySettingsPage
      title="Administrators"
      description={`${admins.length}/${capLabel(limits.maxAdmins)} admin seats used`}
    >
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Administrator accounts are provisioned via Firebase Auth. Use the iOS
        app or Firebase Console to invite new admins, then manage roles here.
      </p>

      {!hasReceivedOperationsSnapshot ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading administrators…
        </p>
      ) : admins.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 px-6 py-16 text-center dark:border-gray-800">
          <h4 className="font-semibold text-gray-800 dark:text-white/90">
            No administrators found
          </h4>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Admin users with role admin in Firestore will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => (
            <Link
              key={admin.id}
              href={`/company/admins/${admin.id}`}
              className="block rounded-2xl border border-gray-200 p-5 transition hover:border-brand-300 dark:border-gray-800 dark:hover:border-brand-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-white/90">
                    {displayNameForUser(admin, admin.id)}
                  </h4>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {admin.email}
                  </p>
                </div>
                <span className="text-sm text-brand-500">View</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </CompanySettingsPage>
  );
}
