"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeftIcon } from "lucide-react";

import { LocationDetailCard } from "@/app/dashboard/locations/components/location-detail-card";
import { LocationOverviewPanel } from "@/app/dashboard/locations/components/location-overview-panel";
import { LocationPricingPanel } from "@/app/dashboard/locations/components/location-pricing-panel";
import { LocationServiceAreaPanel } from "@/app/dashboard/locations/components/location-service-area-panel";
import { LocationVehicleClassesPanel } from "@/app/dashboard/locations/components/location-vehicle-classes-panel";
import { LocationOperatingHoursTab } from "@/app/dashboard/locations/location-operating-hours-tab";
import { LocationEditSheet } from "@/app/dashboard/locations/location-edit-sheet";
import type { DriverOverviewPeriod } from "@/app/dashboard/drivers/lib/driver-profile-overview-period";
import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { useInvoices, useTrips } from "@/hooks/use-collections";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { Branch } from "@/lib/models";
import { fetchBranch } from "@/lib/services/firebase-service";

const LOCATION_TABS = ["overview", "service-area", "hours", "classes", "pricing"] as const;
type LocationTab = (typeof LOCATION_TABS)[number];

function isLocationTab(value: string | null): value is LocationTab {
  return LOCATION_TABS.includes(value as LocationTab);
}

export function LocationProfilePage({ locationId }: { locationId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setBranchId } = useActiveBranch();
  const { trips } = useTrips();
  const { invoices } = useInvoices();

  const tabParam = searchParams.get("tab");
  const activeTab: LocationTab = isLocationTab(tabParam) ? tabParam : "overview";

  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [overviewPeriod, setOverviewPeriod] = useState<DriverOverviewPeriod>("30d");

  const loadBranch = useCallback(() => {
    return fetchBranch(locationId).then((loaded) => {
      setBranch(loaded);
      return loaded;
    });
  }, [locationId]);

  useEffect(() => {
    setLoading(true);
    loadBranch()
      .catch(() => setBranch(null))
      .finally(() => setLoading(false));
  }, [loadBranch]);

  useEffect(() => {
    setBranchId(locationId);
  }, [locationId, setBranchId]);

  function setTab(tab: LocationTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const q = params.toString();
    router.replace(`/dashboard/locations/${locationId}${q ? `?${q}` : ""}`, { scroll: false });
  }

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading location…</p>;
  }

  if (!branch) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="icon" className="bg-background/50 rounded-full">
          <Link href="/dashboard/locations" aria-label="Back to locations">
            <ChevronLeftIcon />
          </Link>
        </Button>
        <p className="text-muted-foreground text-sm">Location not found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setTab(v as LocationTab)} className="gap-4">
          <LocationDetailCard branch={branch} onEditClick={() => setEditOpen(true)} />

          <TabsContent value="overview" className="mt-0 space-y-4">
            <LocationOverviewPanel
              branch={branch}
              trips={trips}
              invoices={invoices}
              period={overviewPeriod}
              onPeriodChange={setOverviewPeriod}
            />
          </TabsContent>

          <TabsContent value="service-area" className="mt-0 space-y-4">
            <LocationServiceAreaPanel
              branch={branch}
              onSaved={(updated) => setBranch(updated)}
            />
          </TabsContent>

          <TabsContent value="hours" className="mt-0 space-y-4">
            <LocationOperatingHoursTab branchId={branch.id} />
          </TabsContent>

          <TabsContent value="classes" className="mt-0 space-y-4">
            <LocationVehicleClassesPanel />
          </TabsContent>

          <TabsContent value="pricing" className="mt-0 space-y-4">
            <LocationPricingPanel branchId={branch.id} />
          </TabsContent>
        </Tabs>
      </div>

      <LocationEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        branch={branch}
        canCreate={false}
        onSaved={(updated) => setBranch(updated)}
      />
    </>
  );
}
