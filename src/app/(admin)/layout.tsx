"use client";

import { useSidebar } from "@/context/SidebarContext";
import AdminAuthGuard from "@/components/prochauffeur/AdminAuthGuard";
import { AdminDashboardProvider } from "@/context/AdminDashboardContext";
import { AdminOperationsProvider } from "@/context/AdminOperationsContext";
import { isCompanySectionPath } from "@/lib/prochauffeur/companyNav";
import { isDriverSectionPath } from "@/lib/prochauffeur/driverNav";
import { isSettingsSectionPath } from "@/lib/prochauffeur/settingsNav";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { usePathname } from "next/navigation";
import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const pathname = usePathname();
  const isFullHeightSection =
    isCompanySectionPath(pathname) ||
    isSettingsSectionPath(pathname) ||
    isDriverSectionPath(pathname);

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  return (
    <AdminAuthGuard>
      <AdminDashboardProvider>
        <AdminOperationsProvider>
          <div className="min-h-screen xl:flex">
            <AppSidebar />
            <Backdrop />
            <div
              className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ease-in-out ${mainContentMargin}`}
            >
              <AppHeader />
              {isFullHeightSection ? (
                <div className="flex h-[calc(100dvh-4.5rem)] min-h-0 flex-col overflow-hidden lg:h-[calc(100dvh-5rem)]">
                  {children}
                </div>
              ) : (
                <div className="mx-auto w-full max-w-(--breakpoint-2xl) flex-1 p-4 md:p-6">
                  {children}
                </div>
              )}
            </div>
          </div>
        </AdminOperationsProvider>
      </AdminDashboardProvider>
    </AdminAuthGuard>
  );
}
