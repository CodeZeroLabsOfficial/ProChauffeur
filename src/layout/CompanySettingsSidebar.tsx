"use client";

import { useAdminOperations } from "@/context/AdminOperationsContext";
import {
  companyNavSections,
  isCompanyNavActive,
} from "@/lib/prochauffeur/companyNav";
import { AngleUpIcon, ChevronDownIcon } from "@/icons/index";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

type CompanySettingsSidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

export default function CompanySettingsSidebar({
  onNavigate,
  className = "",
}: CompanySettingsSidebarProps) {
  const pathname = usePathname();
  const { companyProfile } = useAdminOperations();
  const name = companyProfile.displayName.trim() || "Your company";

  return (
    <aside
      className={`flex w-full shrink-0 flex-col border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:w-[260px] lg:border-r ${className}`}
    >
      <div className="border-b border-gray-200 p-4 dark:border-gray-800 lg:p-5">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500/10 text-sm font-semibold text-brand-500">
            {companyProfile.logoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={companyProfile.logoURL}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
              {name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Fleet</p>
          </div>
          <span className="flex shrink-0 flex-col text-gray-400">
            <AngleUpIcon className="h-3 w-3" />
            <ChevronDownIcon className="h-3 w-3 -mt-1" />
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 lg:p-4">
        <div className="space-y-6">
          {companyNavSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active = isCompanyNavActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
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
