"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon } from "lucide-react";

import {
  useInvoices,
  useRosterChauffeurs,
  useTrips,
  useUsers,
  useVehicles
} from "@/hooks/use-collections";
import { fetchUser } from "@/lib/services/firebase-service";
import { formatCurrency } from "@/lib/format";
import type { User } from "@/lib/models";
import { driverOverviewMetrics } from "@/app/dashboard/drivers/lib/driver-profile-metrics";
import type { ProfileOverviewPeriod } from "@/lib/profile/overview-period";
import { DriverDetailCard } from "@/app/dashboard/drivers/components/driver-detail-card";
import { DriverProfileOverviewTab } from "@/app/dashboard/drivers/components/driver-profile-overview-tab";
import { DriverProfileTripsTab } from "@/app/dashboard/drivers/components/driver-profile-trips-tab";
import { DriverProfileFinancialsTab } from "@/app/dashboard/drivers/components/driver-profile-financials-tab";
import { DriverProfileComplianceTab } from "@/app/dashboard/drivers/components/driver-profile-compliance-tab";
import { DriverProfileOperationsTab } from "@/app/dashboard/drivers/components/driver-profile-operations-tab";
import { DriverEditSheet } from "@/app/dashboard/drivers/driver-edit-sheet";
import { ProfilePageShell } from "@/components/layout/profile-page-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";

const PROFILE_TABS = ["overview", "trips", "financials", "compliance", "operations"] as const;

type ProfileTab = (typeof PROFILE_TABS)[number];

function isProfileTab(value: string | null): value is ProfileTab {
  return PROFILE_TABS.includes(value as ProfileTab);
}

export function DriverProfilePage({ driverId }: { driverId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ProfileTab = isProfileTab(tabParam) ? tabParam : "overview";

  const { trips } = useTrips();
  const { invoices } = useInvoices();
  const { users } = useUsers();
  const { vehicles } = useVehicles();
  const { chauffeurs, loading: rosterLoading } = useRosterChauffeurs();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [overviewPeriod, setOverviewPeriod] = useState<ProfileOverviewPeriod>("30d");

  const loadUser = useCallback(() => {
    return fetchUser(driverId).then((loaded) => {
      setUser(loaded);
      return loaded;
    });
  }, [driverId]);

  useEffect(() => {
    setLoading(true);
    loadUser().finally(() => setLoading(false));
  }, [loadUser]);

  const candidates = useMemo(() => users.filter((u) => u.role !== "driver"), [users]);

  const metrics = useMemo(
    () => driverOverviewMetrics(trips, invoices, driverId),
    [trips, invoices, driverId]
  );

  const rosterChauffeur = useMemo(
    () => chauffeurs.find((c) => c.user.id === driverId) ?? null,
    [chauffeurs, driverId]
  );

  const displayUser = rosterChauffeur?.user ?? user;
  const roster = rosterChauffeur?.roster ?? null;

  const setTab = (tab: ProfileTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const q = params.toString();
    router.replace(`/dashboard/drivers/${driverId}${q ? `?${q}` : ""}`, { scroll: false });
  };

  if (loading || rosterLoading) {
    return (
      <ProfilePageShell>
        <p className="text-muted-foreground text-sm">Loading chauffeur profile…</p>
      </ProfilePageShell>
    );
  }

  if (!displayUser || displayUser.role !== "driver" || !roster) {
    return (
      <ProfilePageShell>
        <p className="text-muted-foreground text-sm">Chauffeur not found.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/drivers">
            <ChevronLeftIcon />
            Back to drivers
          </Link>
        </Button>
      </ProfilePageShell>
    );
  }

  const revenueLabel =
    metrics.totalRevenue >= 1000
      ? formatCurrency(metrics.totalRevenue).replace(/\.\d{2}$/, "")
      : formatCurrency(metrics.totalRevenue);

  return (
    <>
      <ProfilePageShell>
        <Tabs value={activeTab} onValueChange={(v) => setTab(v as ProfileTab)} className="gap-4">
          <DriverDetailCard
            user={displayUser}
            roster={roster}
            onEditClick={() => setEditOpen(true)}
          />

          <TabsContent value="overview" className="mt-0 space-y-4">
            <DriverProfileOverviewTab
              user={displayUser}
              roster={roster}
              trips={metrics.driverTrips}
              invoices={metrics.driverInvoices}
              driverId={driverId}
              statTrips={metrics.totalTrips}
              statCompleted={metrics.completed}
              statRevenueLabel={revenueLabel}
              period={overviewPeriod}
              onPeriodChange={setOverviewPeriod}
            />
          </TabsContent>
          <TabsContent value="trips" className="mt-0 space-y-4">
            <DriverProfileTripsTab trips={metrics.driverTrips} />
          </TabsContent>
          <TabsContent value="financials" className="mt-0 space-y-4">
            <DriverProfileFinancialsTab invoices={metrics.driverInvoices} />
          </TabsContent>
          <TabsContent value="compliance" className="mt-0 space-y-4">
            <DriverProfileComplianceTab
              user={displayUser}
              roster={roster}
              onUserUpdated={() => void loadUser()}
            />
          </TabsContent>
          <TabsContent value="operations" className="mt-0 space-y-4">
            <DriverProfileOperationsTab
              user={displayUser}
              roster={roster}
              vehicles={vehicles}
              onUserUpdated={() => void loadUser()}
            />
          </TabsContent>
        </Tabs>
      </ProfilePageShell>

      <DriverEditSheet
        user={displayUser}
        roster={roster}
        candidates={candidates}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) void loadUser();
        }}
        nested={false}
      />
    </>
  );
}
