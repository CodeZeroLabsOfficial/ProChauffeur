import type { ReactNode } from "react";
import {
  BoxIcon,
  CalenderIcon,
  DocsIcon,
  LockIcon,
  PageIcon,
  TaskIcon,
} from "@/icons/index";

export type DriverNavItem = {
  name: string;
  segment: string;
  href: (userId: string) => string;
  icon: ReactNode;
};

export type DriverNavSection = {
  title: string;
  items: DriverNavItem[];
};

export const driverNavSections: DriverNavSection[] = [
  {
    title: "Driver",
    items: [
      {
        name: "Overview",
        segment: "",
        href: (userId) => `/drivers/${userId}`,
        icon: <BoxIcon />,
      },
      {
        name: "Availability",
        segment: "availability",
        href: (userId) => `/drivers/${userId}/availability`,
        icon: <CalenderIcon />,
      },
      {
        name: "Licence",
        segment: "license",
        href: (userId) => `/drivers/${userId}/license`,
        icon: <LockIcon />,
      },
      {
        name: "Vehicle assignment",
        segment: "vehicle",
        href: (userId) => `/drivers/${userId}/vehicle`,
        icon: <TaskIcon />,
      },
    ],
  },
  {
    title: "Compliance",
    items: [
      {
        name: "Accreditation",
        segment: "accreditation",
        href: (userId) => `/drivers/${userId}/accreditation`,
        icon: <DocsIcon />,
      },
      {
        name: "Service focus",
        segment: "service-focus",
        href: (userId) => `/drivers/${userId}/service-focus`,
        icon: <PageIcon />,
      },
    ],
  },
];

export function isDriverSectionPath(pathname: string): boolean {
  return /^\/drivers\/[^/]+(\/|$)/.test(pathname);
}

export function driverSectionFromPathname(
  pathname: string,
  userId: string
): string {
  const prefix = `/drivers/${userId}`;
  if (pathname === prefix || pathname === `${prefix}/profile`) {
    return "";
  }
  if (!pathname.startsWith(`${prefix}/`)) {
    return "";
  }
  return pathname.slice(prefix.length + 1).split("/")[0] ?? "";
}

export function isDriverNavActive(
  pathname: string,
  userId: string,
  segment: string
): boolean {
  return driverSectionFromPathname(pathname, userId) === segment;
}
