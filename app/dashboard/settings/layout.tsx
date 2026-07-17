import { SectionLayout } from "@/components/layout/sub-nav";

const items = [
  { title: "Account", href: "/dashboard/settings/account" },
  { title: "Appearance", href: "/dashboard/settings/appearance" },
  { title: "Company", href: "/dashboard/settings/company" },
  { title: "Integrations", href: "/dashboard/settings/integrations" },
  { title: "License", href: "/dashboard/settings/license" },
  { title: "Locale", href: "/dashboard/settings/locale" },
  { title: "Profile", href: "/dashboard/settings/profile" },
  { title: "Team", href: "/dashboard/settings/team" }
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SectionLayout title="Settings" items={items}>
      {children}
    </SectionLayout>
  );
}
