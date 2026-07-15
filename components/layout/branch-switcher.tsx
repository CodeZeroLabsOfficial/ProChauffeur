"use client";

import { ChevronsUpDown, MapPin } from "lucide-react";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { LogoMark } from "@/components/layout/logo";
import type { Appearance } from "@/lib/models";

type BranchSwitcherProps = {
  appearance?: Appearance | null;
};

export function BranchSwitcher({ appearance }: BranchSwitcherProps) {
  const { isMobile } = useSidebar();
  const { branchId, branches, setBranchId, activeBranch, branchesLoading } = useActiveBranch();
  const portalName = appearance?.portalName ?? "ProChauffeur";
  const label = activeBranch?.name ?? (branchesLoading ? "Loading…" : portalName);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="hover:text-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              tooltip={label}>
              <LogoMark logoUrl={appearance?.logoUrl} className="size-8 shrink-0" />
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{label}</span>
                <span className="text-muted-foreground truncate text-xs">{portalName}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}>
            <DropdownMenuLabel className="text-muted-foreground text-xs">Branches</DropdownMenuLabel>
            {branches.length === 0 ? (
              <DropdownMenuItem disabled className="text-muted-foreground">
                No branches yet — run the backfill script
              </DropdownMenuItem>
            ) : (
              branches.map((branch) => (
                <DropdownMenuItem
                  key={branch.id}
                  className="gap-2 p-2"
                  onClick={() => setBranchId(branch.id)}>
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <MapPin className="size-3.5 shrink-0" />
                  </div>
                  <span className="font-medium">{branch.name}</span>
                  {branch.id === branchId ? (
                    <span className="text-muted-foreground ml-auto text-xs">Active</span>
                  ) : null}
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-muted-foreground text-xs">
              Switch branch to change ops context
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
