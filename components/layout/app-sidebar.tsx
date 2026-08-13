"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from "@/components/ui/sidebar";
import { BranchSwitcher } from "@/components/layout/branch-switcher";
import { navGroups, type NavGroup, type NavItem } from "@/components/layout/nav-config";
import { useSessionUser } from "@/components/providers/session-provider";
import { useLicenseEntitlements } from "@/hooks/use-feature-enabled";
import { canUsePath } from "@/lib/auth/staff-access";
import type { Appearance, FeatureId, StaffRole } from "@/lib/models";

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function featureAllowed(
  featureId: FeatureId | undefined,
  ready: boolean,
  isEnabled: (feature: FeatureId) => boolean
): boolean {
  if (!featureId) return true;
  if (!ready) return false;
  return isEnabled(featureId);
}

function filterNavGroups(
  groups: NavGroup[],
  ready: boolean,
  isEnabled: (feature: FeatureId) => boolean,
  staffRole: StaffRole | null
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => {
          if (item.items?.length) {
            const items = item.items.filter((sub) => canUsePath(staffRole, sub.href));
            return { ...item, items };
          }
          return item;
        })
        .filter((item) => {
          if (item.items) return item.items.length > 0;
          return featureAllowed(item.featureId, ready, isEnabled) && canUsePath(staffRole, item.href);
        })
    }))
    .filter((group) => group.items.length > 0);
}

function NavMenuItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const hasChildren = Array.isArray(item.items) && item.items.length > 0;

  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive(pathname, item.href)} tooltip={item.title}>
          <Link href={item.href}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const childActive = item.items!.some((s) => pathname === s.href);
  const parentActive = isActive(pathname, item.href);

  return (
    <Collapsible defaultOpen={parentActive || childActive} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items!.map((sub) => (
              <SidebarMenuSubItem key={sub.href}>
                <SidebarMenuSubButton asChild isActive={pathname === sub.href}>
                  <Link href={sub.href}>
                    <span>{sub.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function AppSidebar({
  appearance,
  ...props
}: React.ComponentProps<typeof Sidebar> & { appearance?: Appearance | null }) {
  const pathname = usePathname();
  const session = useSessionUser();
  const { ready, isEnabled } = useLicenseEntitlements();
  const groups = React.useMemo(
    () => filterNavGroups(navGroups, ready, isEnabled, session.staffRole),
    [ready, isEnabled, session.staffRole]
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <BranchSwitcher appearance={appearance} />
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavMenuItem key={item.href} item={item} pathname={pathname} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
