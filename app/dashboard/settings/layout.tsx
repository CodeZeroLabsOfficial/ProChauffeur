import { SectionLayout } from "@/components/layout/sub-nav";

const items = [
  { title: "Branding", href: "/dashboard/settings" },
  { title: "Locale", href: "/dashboard/settings/locale" },
  { title: "License", href: "/dashboard/settings/license" },
  { title: "Admins", href: "/dashboard/settings/admins" },
  { title: "Integrations", href: "/dashboard/settings/integrations" }
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SectionLayout
      title="Settings"
      description="Portal branding, locale, licensing, administrators and integrations."
      items={items}>
      {children}
    </SectionLayout>
  );
}
