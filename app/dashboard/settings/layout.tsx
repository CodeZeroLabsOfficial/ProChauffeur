"use client";

import type { ReactNode } from "react";

import { SectionLayout } from "@/components/layout/sub-nav";
import { useSessionUser } from "@/components/providers/session-provider";
import { canUsePath } from "@/lib/auth/staff-access";

const items = [
  { title: "Account", href: "/dashboard/settings/account" },
  { title: "Appearance", href: "/dashboard/settings/appearance" },
  { title: "Company", href: "/dashboard/settings/company" },
  { title: "Integrations", href: "/dashboard/settings/integrations" },
  { title: "License", href: "/dashboard/settings/license" },
  { title: "Profile", href: "/dashboard/settings/profile" },
  { title: "Team", href: "/dashboard/settings/team" }
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const session = useSessionUser();
  const visible = items.filter((item) => canUsePath(session.staffRole, item.href));
  return (
    <SectionLayout title="Settings" items={visible}>
      {children}
    </SectionLayout>
  );
}
