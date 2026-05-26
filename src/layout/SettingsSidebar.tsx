"use client";

import { useSettingsScroll } from "@/context/SettingsScrollContext";
import {
  isSettingsNavActive,
  settingsNavSections,
} from "@/lib/prochauffeur/settingsNav";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

type SettingsSidebarProps = {
  onNavigate?: () => void;
  className?: string;
};

export default function SettingsSidebar({
  onNavigate,
  className = "",
}: SettingsSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeSection, scrollToSection } = useSettingsScroll();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  const currentSection =
    pathname === "/settings" ? activeSection : hash.replace(/^#/, "");

  function handleSectionClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string
  ) {
    event.preventDefault();
    onNavigate?.();

    if (pathname === "/settings") {
      scrollToSection(sectionId);
      const nextUrl = `${window.location.pathname}${window.location.search}#${sectionId}`;
      window.history.pushState(null, "", nextUrl);
      setHash(`#${sectionId}`);
      return;
    }

    router.push(`/settings#${sectionId}`);
  }

  return (
    <aside
      className={`flex w-full shrink-0 flex-col border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:w-[290px] lg:border-r ${className}`}
    >
      <nav className="flex-1 overflow-y-auto px-5 pt-6 pb-6">
        <div className="space-y-6">
          {settingsNavSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active =
                    pathname === "/settings"
                      ? currentSection === item.sectionId
                      : isSettingsNavActive(item.sectionId, hash);
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
