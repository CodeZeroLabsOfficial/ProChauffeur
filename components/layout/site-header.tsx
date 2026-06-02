"use client";

import { usePathname } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { navGroups } from "@/components/layout/nav-config";

function currentTitle(pathname: string): string {
  let best = "Dashboard";
  let bestLen = -1;
  for (const group of navGroups) {
    for (const item of group.items) {
      const candidates = [item, ...(item.items ?? [])];
      for (const c of candidates) {
        if (
          (pathname === c.href || pathname.startsWith(`${c.href}/`)) &&
          c.href.length > bestLen
        ) {
          best = "title" in c ? c.title : best;
          bestLen = c.href.length;
        }
      }
    }
  }
  return best;
}

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="bg-background sticky top-0 z-30 flex h-(--header-height) items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <h1 className="text-base font-semibold">{currentTitle(pathname)}</h1>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
