import {
  BarChart3Icon,
  Building2Icon,
  CalendarCheckIcon,
  CarFrontIcon,
  ContactIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  SettingsIcon,
  UsersIcon,
  WaypointsIcon,
  type LucideIcon
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon?: LucideIcon;
  items?: { title: string; href: string }[];
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

/** ProChauffeur operations portal navigation (admin surface). */
export const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
      { title: "Dispatch", href: "/dashboard/dispatch", icon: WaypointsIcon },
      { title: "Reports", href: "/dashboard/reports", icon: BarChart3Icon }
    ]
  },
  {
    title: "Operations",
    items: [
      { title: "Bookings", href: "/dashboard/bookings", icon: CalendarCheckIcon },
      { title: "Customers", href: "/dashboard/customers", icon: ContactIcon },
      { title: "Drivers", href: "/dashboard/drivers", icon: UsersIcon },
      { title: "Fleet", href: "/dashboard/fleet", icon: CarFrontIcon },
      { title: "Billing", href: "/dashboard/billing", icon: ReceiptIcon }
    ]
  },
  {
    title: "Configuration",
    items: [
      {
        title: "Company",
        href: "/dashboard/company",
        icon: Building2Icon,
        items: [
          { title: "Overview", href: "/dashboard/company" },
          { title: "Operating Hours", href: "/dashboard/company/operating-hours" },
          { title: "Garages", href: "/dashboard/company/locations" },
          { title: "Pricing", href: "/dashboard/company/pricing" },
          { title: "Vehicle Classes", href: "/dashboard/company/vehicle-classes" }
        ]
      },
      {
        title: "Settings",
        href: "/dashboard/settings/appearance",
        icon: SettingsIcon,
        items: [
          { title: "Profile", href: "/dashboard/settings/profile" },
          { title: "Account", href: "/dashboard/settings/account" },
          { title: "Appearance", href: "/dashboard/settings/appearance" },
          { title: "Locale", href: "/dashboard/settings/locale" },
          { title: "License", href: "/dashboard/settings/license" },
          { title: "Admins", href: "/dashboard/settings/admins" },
          { title: "Integrations", href: "/dashboard/settings/integrations" }
        ]
      }
    ]
  }
];
