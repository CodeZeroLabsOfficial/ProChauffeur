"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon } from "lucide-react";

import { useInvoices, useTrips } from "@/hooks/use-collections";
import { fetchUser } from "@/lib/services/firebase-service";
import { formatCurrency } from "@/lib/format";
import type { User } from "@/lib/models";
import { customerOverviewMetrics } from "@/app/dashboard/customers/lib/customer-profile-metrics";
import type { DriverOverviewPeriod } from "@/app/dashboard/drivers/lib/driver-profile-overview-period";
import { CustomerProfileSidebar } from "@/app/dashboard/customers/components/customer-profile-sidebar";
import { CustomerProfileOverviewTab } from "@/app/dashboard/customers/components/customer-profile-overview-tab";
import { CustomerProfileTripsTab } from "@/app/dashboard/customers/components/customer-profile-trips-tab";
import { CustomerProfileBillingTab } from "@/app/dashboard/customers/components/customer-profile-billing-tab";
import { CustomerEditSheet } from "@/app/dashboard/customers/customer-edit-sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PROFILE_TABS = ["overview", "trips", "billing"] as const;

type ProfileTab = (typeof PROFILE_TABS)[number];

function isProfileTab(value: string | null): value is ProfileTab {
  return PROFILE_TABS.includes(value as ProfileTab);
}

export function CustomerProfilePage({ customerId }: { customerId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ProfileTab = isProfileTab(tabParam) ? tabParam : "overview";

  const { trips } = useTrips();
  const { invoices } = useInvoices();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [overviewPeriod, setOverviewPeriod] = useState<DriverOverviewPeriod>("30d");

  const loadUser = useCallback(() => {
    return fetchUser(customerId).then((loaded) => {
      setUser(loaded);
      return loaded;
    });
  }, [customerId]);

  useEffect(() => {
    loadUser().finally(() => setLoading(false));
  }, [loadUser]);

  const metrics = useMemo(
    () => customerOverviewMetrics(trips, invoices, customerId),
    [trips, invoices, customerId]
  );

  const setTab = (tab: ProfileTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const q = params.toString();
    router.replace(`/dashboard/customers/${customerId}${q ? `?${q}` : ""}`, { scroll: false });
  };

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading customer profile…</p>;
  }

  if (!user || user.role !== "customer") {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">Customer not found.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/customers">
            <ChevronLeftIcon />
            Back to customers
          </Link>
        </Button>
      </div>
    );
  }

  const spendLabel =
    metrics.totalRevenue >= 1000
      ? formatCurrency(metrics.totalRevenue).replace(/\.\d{2}$/, "")
      : formatCurrency(metrics.totalRevenue);

  return (
    <>
      <div className="space-y-4">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Customer profile</h1>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setTab(v as ProfileTab)}
          className="gap-4">
          <TabsList className="[&_[data-slot=tabs-trigger]]:flex-none">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trips">Trips</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-1 xl:sticky xl:top-4 xl:self-start">
              <CustomerProfileSidebar
                user={user}
                statTrips={metrics.totalTrips}
                statCompleted={metrics.completed}
                statSpendLabel={spendLabel}
                onEditClick={() => setEditOpen(true)}
              />
            </div>

            <div className="space-y-4 xl:col-span-2">
              <TabsContent value="overview" className="mt-0">
                <CustomerProfileOverviewTab
                  trips={metrics.customerTrips}
                  invoices={metrics.customerInvoices}
                  customerId={customerId}
                  period={overviewPeriod}
                  onPeriodChange={setOverviewPeriod}
                />
              </TabsContent>
              <TabsContent value="trips" className="mt-0">
                <CustomerProfileTripsTab trips={metrics.customerTrips} />
              </TabsContent>
              <TabsContent value="billing" className="mt-0">
                <CustomerProfileBillingTab invoices={metrics.customerInvoices} />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      <CustomerEditSheet
        user={user}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) void loadUser();
        }}
      />
    </>
  );
}
