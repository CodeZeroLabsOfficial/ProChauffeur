"use client";

import ProfileSettingRow from "@/components/user-profile/ProfileSettingRow";
import Button from "@/components/ui/button/Button";
import React, { useState } from "react";

function ProfileToggle({
  defaultChecked = false,
  onChange,
}: {
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  const [isChecked, setIsChecked] = useState(defaultChecked);

  function handleToggle() {
    const next = !isChecked;
    setIsChecked(next);
    onChange?.(next);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      onClick={handleToggle}
      className="relative block h-6 w-11 shrink-0 rounded-full transition duration-150 ease-linear focus:outline-hidden"
    >
      <span
        className={`block h-6 w-11 rounded-full transition duration-150 ease-linear ${
          isChecked ? "bg-brand-500" : "bg-gray-200 dark:bg-white/10"
        }`}
      />
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-theme-sm transition duration-150 ease-linear ${
          isChecked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function UserSecurityCard() {
  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800 lg:p-6">
      <h4 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
        Security
      </h4>

      <div className="space-y-6">
        <ProfileSettingRow
          title="Change Password"
          description="Receive real-time notifications and team alerts."
          action={
            <Button variant="outline" size="sm" type="button">
              Change Password
            </Button>
          }
        />

        <ProfileSettingRow
          title="Two-factor authentication (2FA)"
          description="Keep your account secure by enabling 2FA"
          bordered={false}
          action={<ProfileToggle />}
        />
      </div>
    </div>
  );
}
