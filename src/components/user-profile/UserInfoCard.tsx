"use client";

import CompanyProfileEditButton from "@/components/company-profile/CompanyProfileEditButton";
import EditPersonalInformationModal from "@/components/user-profile/EditPersonalInformationModal";
import { splitDisplayName } from "@/components/user-profile/profileDisplay";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/hooks/useModal";
import React from "react";

export default function UserInfoCard() {
  const { appUser } = useAuth();
  const { isOpen, openModal, closeModal } = useModal();

  const displayName =
    appUser?.profile.displayName.trim() || appUser?.email || "Administrator";
  const { firstName, lastName } = splitDisplayName(displayName);
  const email = appUser?.email ?? "—";
  const phone = appUser?.profile.phoneNumber?.trim() || "—";

  const displayFirst = firstName || "—";
  const displayLast = lastName || "—";

  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
            Personal Information
          </h4>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                First Name
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {displayFirst}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Last Name
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {displayLast}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Email address
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {email}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Phone
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {phone}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Bio
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                Fleet Administrator
              </p>
            </div>
          </div>
        </div>

        <div className="self-end lg:self-auto">
          <CompanyProfileEditButton onClick={openModal} />
        </div>
      </div>

      <EditPersonalInformationModal isOpen={isOpen} onClose={closeModal} />
    </div>
  );
}
