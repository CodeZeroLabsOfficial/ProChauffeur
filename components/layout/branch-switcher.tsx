"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronsUpDown, MapPin, PlusIcon } from "lucide-react";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar";
import { LogoMark } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import {
  canCreateLocation,
  unlimitedLimits,
  type Appearance,
  type AppGlobalLimits
} from "@/lib/models";
import { fetchGlobalLimits } from "@/lib/services/firebase-service";
import { cn } from "@/lib/utils";

type BranchSwitcherProps = {
  appearance?: Appearance | null;
};

export function BranchSwitcher({ appearance }: BranchSwitcherProps) {
  const { isMobile } = useSidebar();
  const { branchId, branches, setBranchId, activeBranch, branchesLoading } = useActiveBranch();
  const [limits, setLimits] = useState<AppGlobalLimits | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchGlobalLimits()
      .then(setLimits)
      .catch(() => setLimits(unlimitedLimits));
  }, []);

  const portalName = appearance?.portalName ?? "ProChauffeur";
  const locationLabel = activeBranch?.name ?? (branchesLoading ? "Loading…" : "No location");
  const resolved = limits ?? unlimitedLimits;
  const canAdd = canCreateLocation(branches.length, resolved.maxLocations);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="hover:text-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              tooltip={portalName}>
              <LogoMark logoUrl={appearance?.logoUrl} className="size-8 shrink-0" />
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{portalName}</span>
                <span className="text-muted-foreground truncate text-xs">{locationLabel}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-lg p-0"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}>
            <div className="border-border border-b px-3 py-2.5">
              <p className="text-sm font-medium">Locations</p>
            </div>

            <div className="max-h-64 overflow-y-auto p-1.5">
              {branches.length === 0 ? (
                <p className="text-muted-foreground px-2 py-3 text-xs">
                  No locations yet. Add one below.
                </p>
              ) : (
                branches.map((branch) => {
                  const isActive = branch.id === branchId;
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => {
                        setBranchId(branch.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "hover:bg-accent flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors",
                        isActive && "bg-accent/60"
                      )}>
                      <div className="bg-background flex size-8 shrink-0 items-center justify-center rounded-md border">
                        <MapPin className="size-3.5 shrink-0" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{branch.name}</p>
                        {isActive ? (
                          <p className="text-xs font-medium text-emerald-500">Active</p>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-border border-t p-2">
              {canAdd ? (
                <Button asChild className="w-full" size="sm" onClick={() => setOpen(false)}>
                  <Link href="/dashboard/locations">
                    <PlusIcon data-icon="inline-start" />
                    New location
                  </Link>
                </Button>
              ) : (
                <Button className="w-full" size="sm" disabled title="Location limit reached">
                  <PlusIcon data-icon="inline-start" />
                  New location
                </Button>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
