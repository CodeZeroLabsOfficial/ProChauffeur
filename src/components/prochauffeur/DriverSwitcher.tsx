"use client";

import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { useAdminDashboard } from "@/context/AdminDashboardContext";
import {
  displayNameForUser,
  resolvedDriverProfile,
} from "@/lib/prochauffeur/display";
import {
  driverPathForSection,
  driverSectionFromPathname,
} from "@/lib/prochauffeur/driverNav";
import {
  CHAUFFEUR_CATEGORY_LABELS,
  type AppUser,
  type ChauffeurCategory,
} from "@/lib/prochauffeur/types";
import {
  AngleDownIcon,
  AngleUpIcon,
  CheckLineIcon,
  PlusIcon,
} from "@/icons/index";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";

const AVATAR_COLORS = [
  "bg-brand-500",
  "bg-orange-500",
  "bg-success-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-cyan-600",
] as const;

function avatarColorClass(id: string): (typeof AVATAR_COLORS)[number] {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function DriverAvatar({ user }: { user: AppUser }) {
  const initial = displayNameForUser(user, user.id).charAt(0).toUpperCase();
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColorClass(user.id)}`}
    >
      {initial}
    </span>
  );
}

function categoryLabel(user: AppUser): string {
  const profile = resolvedDriverProfile(user);
  return (
    CHAUFFEUR_CATEGORY_LABELS[profile.chauffeurCategory as ChauffeurCategory] ??
    profile.chauffeurCategory
  );
}

type DriverSwitcherProps = {
  userId: string;
  onNavigate?: () => void;
};

export default function DriverSwitcher({
  userId,
  onNavigate,
}: DriverSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { userById, users } = useAdminDashboard();
  const [isOpen, setIsOpen] = useState(false);

  const currentDriver = userById.get(userId);
  const currentSegment = driverSectionFromPathname(pathname, userId);

  const drivers = useMemo(
    () =>
      users
        .filter((u) => u.role === "driver")
        .sort((a, b) =>
          displayNameForUser(a, a.id).localeCompare(
            displayNameForUser(b, b.id),
            undefined,
            { sensitivity: "base" }
          )
        ),
    [users]
  );

  function closeDropdown() {
    setIsOpen(false);
  }

  function selectDriver(nextUserId: string) {
    closeDropdown();
    onNavigate?.();
    if (nextUserId === userId) return;
    router.push(driverPathForSection(nextUserId, currentSegment));
  }

  const triggerName = currentDriver
    ? displayNameForUser(currentDriver, currentDriver.id)
    : "Select driver";
  const triggerSubtitle = currentDriver
    ? categoryLabel(currentDriver)
    : "Driver not found";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="dropdown-toggle flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-left transition hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-gray-700"
      >
        {currentDriver ? (
          <DriverAvatar user={currentDriver} />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            ?
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-800 dark:text-white/90">
            {triggerName}
          </span>
          <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
            {triggerSubtitle}
          </span>
        </span>
        <span className="flex shrink-0 flex-col text-gray-400 dark:text-gray-500">
          <AngleUpIcon className="h-3 w-3" />
          <AngleDownIcon className="-mt-1 h-3 w-3" />
        </span>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="left-0 right-auto mt-2 w-full overflow-hidden p-0 py-2"
      >
        <div className="max-h-[min(20rem,50vh)] overflow-y-auto px-2">
          {drivers.length === 0 ? (
            <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
              No drivers in the fleet yet.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {drivers.map((driver) => {
                const isSelected = driver.id === userId;
                return (
                  <li key={driver.id}>
                    <button
                      type="button"
                      onClick={() => selectDriver(driver.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition ${
                        isSelected
                          ? "bg-gray-100 dark:bg-white/5"
                          : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                      }`}
                    >
                      <DriverAvatar user={driver} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">
                          {displayNameForUser(driver, driver.id)}
                        </span>
                        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                          {categoryLabel(driver)}
                        </span>
                      </span>
                      {isSelected ? (
                        <CheckLineIcon className="h-5 w-5 shrink-0 text-brand-500" />
                      ) : (
                        <span className="h-5 w-5 shrink-0" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-1 border-t border-gray-200 px-2 pt-1 dark:border-gray-800">
          <Link
            href="/drivers"
            onClick={() => {
              closeDropdown();
              onNavigate?.();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <PlusIcon className="h-4 w-4" />
            </span>
            <span>All drivers</span>
          </Link>
        </div>
      </Dropdown>

    </div>
  );
}
