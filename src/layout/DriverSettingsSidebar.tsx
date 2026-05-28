"use client";

import { useAdminDashboard } from "@/context/AdminDashboardContext";
import {
  displayNameForUser,
  resolvedDriverProfile,
} from "@/lib/prochauffeur/display";
import {
  driverNavSections,
  isDriverNavActive,
} from "@/lib/prochauffeur/driverNav";
import {
  CHAUFFEUR_CATEGORY_LABELS,
  type ChauffeurCategory,
} from "@/lib/prochauffeur/types";
import { ChevronLeftIcon } from "@/icons/index";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

type DriverSettingsSidebarProps = {
  userId: string;
  onNavigate?: () => void;
  className?: string;
};

export default function DriverSettingsSidebar({
  userId,
  onNavigate,
  className = "",
}: DriverSettingsSidebarProps) {
  const pathname = usePathname();
  const { userById } = useAdminDashboard();
  const driver = userById.get(userId);
  const driverProfile = resolvedDriverProfile(driver);

  return (
    <aside
      className={`flex w-full shrink-0 flex-col border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:w-[290px] lg:border-r ${className}`}
    >
      <div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
        <Link
          href="/drivers"
          onClick={onNavigate}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
        >
          <ChevronLeftIcon />
          All drivers
        </Link>
        {driver ? (
          <>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              {displayNameForUser(driver, driver.id)}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {CHAUFFEUR_CATEGORY_LABELS[
                driverProfile.chauffeurCategory as ChauffeurCategory
              ] ?? driverProfile.chauffeurCategory}
            </p>
          </>
        ) : (
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Driver
          </h2>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-5 pt-6 pb-6">
        <div className="space-y-6">
          {driverNavSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active = isDriverNavActive(
                    pathname,
                    userId,
                    item.segment
                  );
                  return (
                    <li key={item.segment || "overview"}>
                      <Link
                        href={item.href(userId)}
                        onClick={onNavigate}
                        className={`menu-item ${
                          active ? "menu-item-active" : "menu-item-inactive"
                        }`}
                      >
                        <span
                          className={
                            active
                              ? "menu-item-icon-active"
                              : "menu-item-icon-inactive"
                          }
                        >
                          {item.icon}
                        </span>
                        <span className="menu-item-text">{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}
