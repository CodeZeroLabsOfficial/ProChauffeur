import type { ReactNode } from "react";
import {
  BoxIcon,
  CalenderIcon,
  DocsIcon,
  DollarLineIcon,
  PageIcon,
  PieChartIcon,
} from "@/icons/index";

export type CompanyNavItem = {
  name: string;
  sectionId: string;
  href: string;
  icon: ReactNode;
};

export type CompanyNavSection = {
  title: string;
  items: CompanyNavItem[];
};

export const defaultCompanySectionId = "overview";

export const companyNavSections: CompanyNavSection[] = [
  {
    title: "Company",
    items: [
      {
        name: "Overview",
        sectionId: "overview",
        href: "/company#overview",
        icon: <BoxIcon />,
      },
      {
        name: "About your fleet",
        sectionId: "about-your-fleet",
        href: "/company#about-your-fleet",
        icon: <PageIcon />,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        name: "Operating hours",
        sectionId: "operating-hours",
        href: "/company#operating-hours",
        icon: <CalenderIcon />,
      },
      {
        name: "Locations",
        sectionId: "locations",
        href: "/company#locations",
        icon: <PieChartIcon />,
      },
      {
        name: "Dispatch guides",
        sectionId: "dispatch-guides",
        href: "/company#dispatch-guides",
        icon: <DocsIcon />,
      },
    ],
  },
  {
    title: "Billing",
    items: [
      {
        name: "Pricing",
        sectionId: "pricing",
        href: "/company#pricing",
        icon: <DollarLineIcon />,
      },
    ],
  },
];

export const companyNavItems = companyNavSections.flatMap(
  (section) => section.items
);

export function isCompanySectionPath(pathname: string): boolean {
  return pathname === "/company" || pathname.startsWith("/company/");
}

export function isCompanyNavActive(sectionId: string, hash: string): boolean {
  const current = hash.replace(/^#/, "") || defaultCompanySectionId;
  return current === sectionId;
}

export function companySettingsHref(
  sectionId: string,
  search = ""
): string {
  return `/company${search}#${sectionId}`;
}
