import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAdminSessionUser } from "@/lib/firebase/session";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { FirebaseAuthProvider } from "@/components/providers/firebase-auth-provider";
import { DashboardCollectionsProvider } from "@/components/providers/dashboard-collections-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getAdminSessionUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SessionProvider user={user}>
      <FirebaseAuthProvider>
        <DashboardCollectionsProvider>
        <SidebarProvider
          defaultOpen={defaultOpen}
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 64)",
              "--header-height": "calc(var(--spacing) * 14)"
            } as React.CSSProperties
          }>
          <AppSidebar variant="inset" />
          <SidebarInset className="min-h-0 overflow-hidden">
            <SiteHeader />
            <div className="bg-muted/40 flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="@container/main flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
                {children}
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
        </DashboardCollectionsProvider>
      </FirebaseAuthProvider>
    </SessionProvider>
  );
}
