"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon, PencilIcon } from "lucide-react";

import { useInvoices, useTrips, useUsers, useVehicles } from "@/hooks/use-collections";
import { fetchUser } from "@/lib/services/firebase-service";
import { formatCurrency } from "@/lib/format";
import type { User } from "@/lib/models";
import { driverOverviewMetrics } from "@/app/dashboard/drivers/lib/driver-profile-metrics";
import { DriverProfileSidebar } from "@/app/dashboard/drivers/components/driver-profile-sidebar";
import { DriverProfileOverviewTab } from "@/app/dashboard/drivers/components/driver-profile-overview-tab";
import { DriverProfileTripsTab } from "@/app/dashboard/drivers/components/driver-profile-trips-tab";
import { DriverProfileFinancialsTab } from "@/app/dashboard/drivers/components/driver-profile-financials-tab";
import { DriverProfileComplianceTab } from "@/app/dashboard/drivers/components/driver-profile-compliance-tab";
import { DriverProfileOperationsTab } from "@/app/dashboard/drivers/components/driver-profile-operations-tab";
import { DriverEditSheet } from "@/app/dashboard/drivers/driver-edit-sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PROFILE_TABS = [
  "overview",
  "trips",
  "financials",
  "compliance",
  "operations"
] as const;

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

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const loadUser = useCallback(() => {
    return fetchUser(driverId).then((loaded) => {
      setUser(loaded);
      return loaded;
    });
  }, [driverId]);

  useEffect(() => {
    loadUser().finally(() => setLoading(false));
  }, [loadUser]);

  const candidates = useMemo(
    () => users.filter((u) => u.role !== "driver"),
    [users]
  );

  const metrics = useMemo(
    () => driverOverviewMetrics(trips, invoices, driverId),
    [trips, invoices, driverId]
  );

  const vehicle = useMemo(
    () => vehicles.find((v) => v.driverID === driverId),
    [vehicles, driverId]
  );

  const setTab = (tab: ProfileTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const q = params.toString();
    router.replace(`/dashboard/drivers/${driverId}${q ? `?${q}` : ""}`, { scroll: false });
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading chauffeur profile…</p>;
  }

  if (!user || user.role !== "driver") {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">Chauffeur not found.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/drivers">
            <ChevronLeftIcon />
            Back to drivers
          </Link>
        </Button>
      </div>
    );
  }

  const revenueLabel =
    metrics.totalRevenue >= 1000
      ? formatCurrency(metrics.totalRevenue).replace(/\.\d{2}$/, "")
      : formatCurrency(metrics.totalRevenue);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-row items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Driver profile</h1>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <PencilIcon />
            Edit
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setTab(v as ProfileTab)}
          className="gap-4">
          <TabsList className="[&_[data-slot=tabs-trigger]]:flex-none">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trips">Trips</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
          </TabsList>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-1 xl:sticky xl:top-4 xl:self-start">
              <DriverProfileSidebar
                user={user}
                statTrips={metrics.totalTrips}
                statCompleted={metrics.completed}
                statRevenueLabel={revenueLabel}
              />
            </div>

            <div className="space-y-4 xl:col-span-2">
              <TabsContent value="overview" className="mt-0">
                <DriverProfileOverviewTab
                  trips={metrics.driverTrips}
                  totalTrips={metrics.totalTrips}
                  completed={metrics.completed}
                  active={metrics.active}
                  monthRevenue={metrics.monthRevenue}
                />
              </TabsContent>
              <TabsContent value="trips" className="mt-0">
                <DriverProfileTripsTab trips={metrics.driverTrips} />
              </TabsContent>
              <TabsContent value="financials" className="mt-0">
                <DriverProfileFinancialsTab invoices={metrics.driverInvoices} />
              </TabsContent>
              <TabsContent value="compliance" className="mt-0">
                <DriverProfileComplianceTab user={user} />
              </TabsContent>
              <TabsContent value="operations" className="mt-0">
                <DriverProfileOperationsTab user={user} vehicle={vehicle} />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      <DriverEditSheet
        user={user}
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
