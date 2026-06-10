"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon } from "lucide-react";

import { useInvoices, useTrips, useUsers, useVehicles } from "@/hooks/use-collections";
import { fetchVehicle, fetchVehicleClasses } from "@/lib/services/firebase-service";
import type { VehicleClass } from "@/lib/models";
import { formatCurrency } from "@/lib/format";
import { effectiveChauffeurUserId, type Vehicle } from "@/lib/models";
import { vehicleOverviewMetrics } from "@/app/dashboard/fleet/lib/vehicle-profile-metrics";
import type { DriverOverviewPeriod } from "@/app/dashboard/drivers/lib/driver-profile-overview-period";
import { DriverProfileTripsTab } from "@/app/dashboard/drivers/components/driver-profile-trips-tab";
import { VehicleProfileSidebar } from "@/app/dashboard/fleet/components/vehicle-profile-sidebar";
import { VehicleProfileOverviewTab } from "@/app/dashboard/fleet/components/vehicle-profile-overview-tab";
import { VehicleProfileFinancialsTab } from "@/app/dashboard/fleet/components/vehicle-profile-financials-tab";
import { VehicleProfileComplianceTab } from "@/app/dashboard/fleet/components/vehicle-profile-compliance-tab";
import { VehicleProfileOperationsTab } from "@/app/dashboard/fleet/components/vehicle-profile-operations-tab";
import { VehicleEditSheet } from "@/app/dashboard/fleet/vehicle-edit-sheet";
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

export function VehicleProfilePage({ vehicleDocumentId }: { vehicleDocumentId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ProfileTab = isProfileTab(tabParam) ? tabParam : "overview";

  const { trips } = useTrips();
  const { invoices } = useInvoices();
  const { users } = useUsers();
  const { vehicles } = useVehicles();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [overviewPeriod, setOverviewPeriod] = useState<DriverOverviewPeriod>("30d");

  const loadVehicle = useCallback(() => {
    return fetchVehicle(vehicleDocumentId).then((loaded) => {
      setVehicle(loaded);
      return loaded;
    });
  }, [vehicleDocumentId]);

  useEffect(() => {
    loadVehicle().finally(() => setLoading(false));
  }, [loadVehicle]);

  useEffect(() => {
    fetchVehicleClasses().then(setVehicleClasses).catch(() => setVehicleClasses([]));
  }, []);

  useEffect(() => {
    const live = vehicles.find((v) => v.driverID === vehicleDocumentId);
    if (live) setVehicle(live);
  }, [vehicles, vehicleDocumentId]);

  const metrics = useMemo(
    () => (vehicle ? vehicleOverviewMetrics(trips, invoices, vehicle) : null),
    [trips, invoices, vehicle]
  );

  const vehicleClassLabel = useMemo(() => {
    if (!vehicle?.vehicleClassId) return null;
    return vehicleClasses.find((c) => c.id === vehicle.vehicleClassId)?.displayName ?? vehicle.vehicleClassId;
  }, [vehicle, vehicleClasses]);

  const assignedChauffeur = useMemo(() => {
    if (!vehicle) return undefined;
    const chauffeurId = effectiveChauffeurUserId(vehicle);
    if (!chauffeurId) return undefined;
    return users.find((u) => u.id === chauffeurId);
  }, [vehicle, users]);

  const setTab = (tab: ProfileTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const q = params.toString();
    router.replace(`/dashboard/fleet/${vehicleDocumentId}${q ? `?${q}` : ""}`, { scroll: false });
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading vehicle profile…</p>;
  }

  if (!vehicle || !metrics) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">Vehicle not found.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/fleet">
            <ChevronLeftIcon />
            Back to fleet
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
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Vehicle profile</h1>

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
              <VehicleProfileSidebar
                vehicle={vehicle}
                assignedChauffeur={assignedChauffeur}
                statTrips={metrics.totalTrips}
                statCompleted={metrics.completed}
                statRevenueLabel={revenueLabel}
                vehicleClassLabel={vehicleClassLabel}
                onEditClick={() => setEditOpen(true)}
              />
            </div>

            <div className="space-y-4 xl:col-span-2">
              <TabsContent value="overview" className="mt-0">
                <VehicleProfileOverviewTab
                  trips={metrics.vehicleTrips}
                  invoices={metrics.vehicleInvoices}
                  vehicleDocumentId={vehicleDocumentId}
                  period={overviewPeriod}
                  onPeriodChange={setOverviewPeriod}
                />
              </TabsContent>
              <TabsContent value="trips" className="mt-0">
                <DriverProfileTripsTab trips={metrics.vehicleTrips} />
              </TabsContent>
              <TabsContent value="financials" className="mt-0">
                <VehicleProfileFinancialsTab />
              </TabsContent>
              <TabsContent value="compliance" className="mt-0">
                <VehicleProfileComplianceTab
                  vehicle={vehicle}
                  onVehicleUpdated={() => void loadVehicle()}
                />
              </TabsContent>
              <TabsContent value="operations" className="mt-0">
                <VehicleProfileOperationsTab
                  vehicle={vehicle}
                  assignedChauffeur={assignedChauffeur}
                />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      <VehicleEditSheet
        vehicle={vehicle}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) void loadVehicle();
        }}
        nested={false}
      />
    </>
  );
}
