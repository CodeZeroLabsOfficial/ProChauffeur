"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronLeftIcon } from "lucide-react";

import { useInvoices, useTrips, useUsers, useVehicleClasses, useVehicles } from "@/hooks/use-collections";
import { effectiveChauffeurUserId } from "@/lib/models";
import { vehicleOverviewMetrics } from "@/app/dashboard/fleet/lib/vehicle-profile-metrics";
import type { DriverOverviewPeriod } from "@/app/dashboard/drivers/lib/driver-profile-overview-period";
import { DriverProfileTripsTab } from "@/app/dashboard/drivers/components/driver-profile-trips-tab";
import { VehicleDetailCard } from "@/app/dashboard/fleet/components/vehicle-detail-card";
import { VehicleProfileOverviewTab } from "@/app/dashboard/fleet/components/vehicle-profile-overview-tab";
import { VehicleProfileFinancialsTab } from "@/app/dashboard/fleet/components/vehicle-profile-financials-tab";
import { VehicleProfileComplianceTab } from "@/app/dashboard/fleet/components/vehicle-profile-compliance-tab";
import { VehicleProfileOperationsTab } from "@/app/dashboard/fleet/components/vehicle-profile-operations-tab";
import { VehicleEditSheet } from "@/app/dashboard/fleet/vehicle-edit-sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";

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
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { vehicleClasses } = useVehicleClasses();

  const [editOpen, setEditOpen] = useState(false);
  const [overviewPeriod, setOverviewPeriod] = useState<DriverOverviewPeriod>("30d");

  const vehicle = useMemo(
    () => vehicles.find((v) => v.driverID === vehicleDocumentId) ?? null,
    [vehicles, vehicleDocumentId]
  );
  const loading = vehiclesLoading && !vehicle;

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
        <Button asChild variant="ghost" size="icon" className="bg-background/50 rounded-full">
          <Link href="/dashboard/fleet" aria-label="Back to fleet">
            <ChevronLeftIcon />
          </Link>
        </Button>
        <p className="text-muted-foreground text-sm">Vehicle not found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setTab(v as ProfileTab)}
          className="gap-4">
          <VehicleDetailCard
            vehicle={vehicle}
            vehicleClassLabel={vehicleClassLabel}
            onEditClick={() => setEditOpen(true)}
          />

          <TabsContent value="overview" className="mt-0 space-y-4">
            <VehicleProfileOverviewTab
              vehicle={vehicle}
              assignedChauffeur={assignedChauffeur}
              trips={metrics.vehicleTrips}
              invoices={metrics.vehicleInvoices}
              vehicleDocumentId={vehicleDocumentId}
              period={overviewPeriod}
              onPeriodChange={setOverviewPeriod}
            />
          </TabsContent>

          <TabsContent value="trips" className="mt-0 space-y-4">
            <DriverProfileTripsTab trips={metrics.vehicleTrips} />
          </TabsContent>

          <TabsContent value="financials" className="mt-0 space-y-4">
            <VehicleProfileFinancialsTab />
          </TabsContent>

          <TabsContent value="compliance" className="mt-0 space-y-4">
            <VehicleProfileComplianceTab vehicle={vehicle} />
          </TabsContent>

          <TabsContent value="operations" className="mt-0 space-y-4">
            <VehicleProfileOperationsTab
              vehicle={vehicle}
              assignedChauffeur={assignedChauffeur}
            />
          </TabsContent>
        </Tabs>
      </div>

      <VehicleEditSheet
        vehicle={vehicle}
        open={editOpen}
        onOpenChange={setEditOpen}
        nested={false}
      />
    </>
  );
}
