"use client";

import ProfileSettingRow from "@/components/user-profile/ProfileSettingRow";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import React, { useState } from "react";

export default function UserDangerZoneCard() {
  const { signOut } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleLogoutAllDevices() {
    await signOut();
    window.location.href = "/signin";
  }

  return (
    <div className="rounded-2xl border border-error-500/20 bg-error-500/5 p-5 lg:p-6">
      <h4 className="mb-6 text-lg font-semibold text-error-500">Danger Zone</h4>

      <div className="space-y-6">
        <ProfileSettingRow
          title="Logout all devices"
          description="Sign out from every active session."
          action={
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => void handleLogoutAllDevices()}
            >
              Logout
            </Button>
          }
        />

        <ProfileSettingRow
          title="Delete account"
          description="Once you delete your account, there is no going back. Please be certain."
          bordered={false}
          action={
            !confirmDelete ? (
              <Button
                size="sm"
                type="button"
                className="!bg-error-500 hover:!bg-error-600"
                onClick={() => setConfirmDelete(true)}
              >
                Delete account
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  type="button"
                  className="!bg-error-500 hover:!bg-error-600"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
                <Button size="sm" type="button" variant="outline" disabled>
                  Confirm delete
                </Button>
              </div>
            )
          }
        />
      </div>
    </div>
  );
}
