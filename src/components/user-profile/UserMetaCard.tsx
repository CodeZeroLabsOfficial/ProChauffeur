"use client";

import CompanyProfileEditButton from "@/components/company-profile/CompanyProfileEditButton";
import EditPersonalInformationModal from "@/components/user-profile/EditPersonalInformationModal";
import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/hooks/useModal";
import Image from "next/image";
import React from "react";

export default function UserMetaCard() {
  const { appUser } = useAuth();
  const { isOpen, openModal, closeModal } = useModal();

  const displayName =
    appUser?.profile.displayName.trim() || appUser?.email || "Administrator";
  const phone = appUser?.profile.phoneNumber?.trim() || "—";
  const photoURL = appUser?.profile.photoURL?.trim();
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex w-full flex-col items-center gap-6 xl:flex-row">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 dark:border-gray-800">
              {photoURL ? (
                <Image
                  width={80}
                  height={80}
                  src={photoURL}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-brand-500 text-xl font-semibold text-white">
                  {avatarInitial}
                </span>
              )}
            </div>
            <div className="order-3 xl:order-2">
              <h4 className="mb-2 text-center text-lg font-semibold text-gray-800 dark:text-white/90 xl:text-left">
                {displayName}
              </h4>
              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Fleet Administrator
                </p>
                <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {phone}
                </p>
              </div>
            </div>
          </div>
          <div className="self-end xl:self-auto">
            <CompanyProfileEditButton onClick={openModal} />
          </div>
        </div>
      </div>

      <EditPersonalInformationModal isOpen={isOpen} onClose={closeModal} />
    </>
  );
}
