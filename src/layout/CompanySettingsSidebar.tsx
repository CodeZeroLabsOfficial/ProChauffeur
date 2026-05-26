"use client";

import { useCompanySettingsScroll } from "@/context/CompanySettingsScrollContext";
import {
  companyNavSections,
  isCompanyNavActive,
} from "@/lib/prochauffeur/companyNav";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

type CompanySettingsSidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

export default function CompanySettingsSidebar({
  onNavigate,
  className = "",
}: CompanySettingsSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeSection, scrollToSection } = useCompanySettingsScroll();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  const currentSection =
    pathname === "/company" ? activeSection : hash.replace(/^#/, "");

  function handleSectionClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string
  ) {
    event.preventDefault();
    onNavigate?.();

    if (pathname === "/company") {
      scrollToSection(sectionId);
      const nextUrl = `${window.location.pathname}${window.location.search}#${sectionId}`;
      window.history.pushState(null, "", nextUrl);
      setHash(`#${sectionId}`);
      return;
    }

    router.push(`/company#${sectionId}`);
  }

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
                  const active =
                    pathname === "/company"
                      ? currentSection === item.sectionId
                      : isCompanyNavActive(item.sectionId, hash);
                  return (
                    <li key={item.sectionId}>
                      <Link
                        href={item.href}
                        onClick={(event) =>
                          handleSectionClick(event, item.sectionId)
                        }
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
