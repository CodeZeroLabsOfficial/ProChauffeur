import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import UserAddressCard from "@/components/user-profile/UserAddressCard";
import UserDangerZoneCard from "@/components/user-profile/UserDangerZoneCard";
import UserInfoCard from "@/components/user-profile/UserInfoCard";
import UserMetaCard from "@/components/user-profile/UserMetaCard";
import UserSecurityCard from "@/components/user-profile/UserSecurityCard";
import { pageTitle } from "@/lib/prochauffeur/site";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: pageTitle("Profile"),
  description: "Manage your administrator profile and account security.",
};

export default function Profile() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Profile" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Profile
        </h3>
        <div className="space-y-6">
          <UserMetaCard />
          <UserInfoCard />
          <UserAddressCard />
          <UserSecurityCard />
          <UserDangerZoneCard />
        </div>
      </div>
    </div>
  );
}
