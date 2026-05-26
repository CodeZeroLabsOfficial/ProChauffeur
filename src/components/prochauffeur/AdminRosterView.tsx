"use client";

import CompanySettingsSection from "@/components/company-profile/CompanySettingsSection";
import AdminAccountDetails from "@/components/prochauffeur/AdminAccountDetails";
import FormModal from "@/components/prochauffeur/FormModal";
import { useSettingsScroll } from "@/context/SettingsScrollContext";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import { useAdminOperations } from "@/context/AdminOperationsContext";
import { useModal } from "@/hooks/useModal";
import { capLabel, displayNameForUser } from "@/lib/prochauffeur/display";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

export default function AdminRosterView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { scrollToSection } = useSettingsScroll();
  const { users } = useAdminDashboard();
  const { limits, hasReceivedOperationsSnapshot } = useAdminOperations();
  const { isOpen, openModal, closeModal } = useModal();
  const [selectedAdminId, setSelectedAdminId] = useState<string | undefined>();
  const handledAdminRef = useRef<string | null>(null);

  const admins = users
    .filter((u) => u.role === "admin")
    .sort((a, b) =>
      displayNameForUser(a, a.id).localeCompare(
        displayNameForUser(b, b.id),
        undefined,
        { sensitivity: "base" }
      )
    );

  function openAdminModal(userId: string) {
    setSelectedAdminId(userId);
    openModal();
  }

  function closeAdminModal() {
    closeModal();
    setSelectedAdminId(undefined);
    if (searchParams.get("admin")) {
      router.replace("/settings#administrators", { scroll: false });
    }
  }

  useEffect(() => {
    const adminId = searchParams.get("admin");
    if (!adminId || handledAdminRef.current === adminId) return;

    handledAdminRef.current = adminId;
    scrollToSection("administrators");
    openAdminModal(adminId);
  }, [searchParams, scrollToSection]);

  const selectedAdmin = selectedAdminId
    ? users.find((user) => user.id === selectedAdminId)
    : undefined;

  return (
    <>
      <CompanySettingsSection
        id="administrators"
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
              <button
                key={admin.id}
                type="button"
                onClick={() => openAdminModal(admin.id)}
                className="block w-full rounded-2xl border border-gray-200 p-5 text-left transition hover:border-brand-300 dark:border-gray-800 dark:hover:border-brand-800"
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
              </button>
            ))}
          </div>
        )}
      </CompanySettingsSection>

      <FormModal
        isOpen={isOpen}
        onClose={closeAdminModal}
        title={
          selectedAdmin
            ? displayNameForUser(selectedAdmin, selectedAdmin.id)
            : "Administrator"
        }
        className="max-w-2xl p-5 lg:p-10"
      >
        {selectedAdminId ? (
          <AdminAccountDetails userId={selectedAdminId} />
        ) : null}
      </FormModal>
    </>
  );
}
