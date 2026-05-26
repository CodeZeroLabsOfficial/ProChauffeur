import type { ReactNode } from "react";
import {
  BoxIcon,
  CalenderIcon,
  DocsIcon,
  DollarLineIcon,
  GroupIcon,
  LockIcon,
  PageIcon,
  PencilIcon,
  PieChartIcon,
  PlugInIcon,
} from "@/icons/index";

export type CompanyNavItem = {
  name: string;
  href: string;
  icon: ReactNode;
};

export type CompanyNavSection = {
  title: string;
  items: CompanyNavItem[];
};

export const companyNavSections: CompanyNavSection[] = [
  {
    title: "Company",
    items: [
      { name: "Overview", href: "/company", icon: <BoxIcon /> },
      {
        name: "Details",
        href: "/company/details",
        icon: <PencilIcon />,
      },
      {
        name: "About your fleet",
        href: "/company/about",
        icon: <PageIcon />,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        name: "Operating hours",
        href: "/company/hours",
        icon: <CalenderIcon />,
      },
      {
        name: "Locations",
        href: "/company/locations",
        icon: <PieChartIcon />,
      },
      {
        name: "Dispatch guides",
        href: "/company/guides",
        icon: <DocsIcon />,
      },
    ],
  },
  {
    title: "Billing & access",
    items: [
      {
        name: "Pricing",
        href: "/company/pricing",
        icon: <DollarLineIcon />,
      },
      {
        name: "License",
        href: "/company/license",
        icon: <LockIcon />,
      },
      {
        name: "Administrators",
        href: "/company/admins",
        icon: <GroupIcon />,
      },
    ],
  },
  {
    title: "Integrations",
    items: [
      {
        name: "Connections",
        href: "/company/integrations",
        icon: <PlugInIcon />,
      },
    ],
  },
];

export function isCompanyNavActive(pathname: string, href: string): boolean {
  if (href === "/company") {
    return pathname === "/company";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
