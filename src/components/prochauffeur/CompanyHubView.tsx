"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import Link from "next/link";
import React from "react";

const quickLinks = [
  {
    href: "/company/details",
    label: "Edit company details",
    description: "Name, contact info, logo, and public bio",
  },
  {
    href: "/company/hours",
    label: "Operating hours",
    description: "Fleet timezone and weekly dispatch windows",
  },
  {
    href: "/company/admins",
    label: "Administrator roster",
    description: "Accounts and seat usage",
  },
];

export default function CompanyHubView() {
  const { companyProfile } = useAdminOperations();
  const name = companyProfile.displayName.trim() || "Your company";

  return (
    <div>
      <PageBreadcrumb pageTitle="Overview" />

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {name}
        </h3>
        {companyProfile.address ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {companyProfile.address}
          </p>
        ) : (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Add your address and contact details to complete your company
            profile.
          </p>
        )}
        {companyProfile.phone || companyProfile.email ? (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {[companyProfile.phone, companyProfile.email]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        {companyProfile.bio ? (
          <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {companyProfile.bio}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Quick actions
        </h3>
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800"
          >
            <p className="font-medium text-gray-800 dark:text-white/90">
              {link.label}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {link.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
