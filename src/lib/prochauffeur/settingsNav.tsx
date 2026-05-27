import type { ReactNode } from "react";
import {
  GroupIcon,
  LockIcon,
  PageIcon,
  PlugInIcon,
} from "@/icons/index";

export type SettingsNavItem = {
  name: string;
  sectionId: string;
  href: string;
  icon: ReactNode;
};

export type SettingsNavSection = {
  title: string;
  items: SettingsNavItem[];
};

export const defaultSettingsSectionId = "locale";

export const settingsNavSections: SettingsNavSection[] = [
  {
    title: "Settings",
    items: [
      {
        name: "Locale",
        sectionId: "locale",
        href: "/settings#locale",
        icon: <PageIcon />,
      },
      {
        name: "License",
        sectionId: "license",
        href: "/settings#license",
        icon: <LockIcon />,
      },
      {
        name: "Administrators",
        sectionId: "administrators",
        href: "/settings#administrators",
        icon: <GroupIcon />,
      },
      {
        name: "Integrations",
        sectionId: "integrations",
        href: "/settings#integrations",
        icon: <PlugInIcon />,
      },
    ],
  },
];

export const settingsNavItems = settingsNavSections.flatMap(
  (section) => section.items
);

export function isSettingsSectionPath(pathname: string): boolean {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

export function isSettingsNavActive(sectionId: string, hash: string): boolean {
  const current = hash.replace(/^#/, "") || defaultSettingsSectionId;
  return current === sectionId;
}

export function settingsHref(sectionId: string, search = ""): string {
  return `/settings${search}#${sectionId}`;
}
