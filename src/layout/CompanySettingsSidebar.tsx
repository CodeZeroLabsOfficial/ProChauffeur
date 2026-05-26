"use client";

import {
  companyNavSections,
  isCompanyNavActive,
} from "@/lib/prochauffeur/companyNav";
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

  return (
    <aside
      className={`flex w-full shrink-0 flex-col border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:w-[290px] lg:border-r ${className}`}
    >
      <nav className="flex-1 overflow-y-auto px-5 pt-6 pb-6">
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
