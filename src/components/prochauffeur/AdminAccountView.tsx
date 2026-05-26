"use client";

import CompanySettingsPage from "@/components/company-profile/CompanySettingsPage";
import Button from "@/components/ui/button/Button";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { displayNameForUser, formatSummaryDateTime } from "@/lib/prochauffeur/display";
import Link from "next/link";
import React from "react";

export default function AdminAccountView({ userId }: { userId: string }) {
  const { userById } = useAdminDashboard();
  const admin = userById.get(userId);

  const backAction = (
    <Link href="/company/admins">
      <Button variant="outline" size="sm">
        Back to administrators
      </Button>
    </Link>
  );

  if (!admin) {
    return (
      <CompanySettingsPage
        title="Administrator"
        description="Account details"
        actions={backAction}
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Administrator not found.
        </p>
      </CompanySettingsPage>
    );
  }

  if (admin.role !== "admin") {
    return (
      <CompanySettingsPage
        title="Administrator"
        description="Account details"
        actions={backAction}
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This user is not an administrator.
        </p>
      </CompanySettingsPage>
    );
  }

  return (
    <CompanySettingsPage
      title={displayNameForUser(admin, admin.id)}
      description="Administrator account"
      actions={backAction}
      className="max-w-2xl"
    >
      <dl className="space-y-4 text-sm">
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Email</dt>
          <dd className="mt-1 text-gray-800 dark:text-white/90">
            {admin.email}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Display name</dt>
          <dd className="mt-1 text-gray-800 dark:text-white/90">
            {admin.profile.displayName || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Phone</dt>
          <dd className="mt-1 text-gray-800 dark:text-white/90">
            {admin.profile.phoneNumber || "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">Account created</dt>
          <dd className="mt-1 text-gray-800 dark:text-white/90">
            {formatSummaryDateTime(admin.createdAt)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-gray-400">User id</dt>
          <dd className="mt-1 font-mono text-xs text-gray-600 dark:text-gray-300">
            {admin.id}
          </dd>
        </div>
      </dl>
    </CompanySettingsPage>
  );
}
