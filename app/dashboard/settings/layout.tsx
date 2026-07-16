import { SectionLayout } from "@/components/layout/sub-nav";

const items = [
  { title: "Profile", href: "/dashboard/settings/profile" },
  { title: "Account", href: "/dashboard/settings/account" },
  { title: "Appearance", href: "/dashboard/settings/appearance" },
  { title: "Locale", href: "/dashboard/settings/locale" },
  { title: "License", href: "/dashboard/settings/license" },
  { title: "Locations", href: "/dashboard/settings/locations" },
  { title: "Admins", href: "/dashboard/settings/admins" },
  { title: "Integrations", href: "/dashboard/settings/integrations" }
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SectionLayout title="Settings" items={items}>
      {children}
    </SectionLayout>
  );
}
