"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon } from "lucide-react";

import { useCompanyInvoices, useCompanyTrips } from "@/hooks/use-company-collections";
import { fetchUser } from "@/lib/services/firebase-service";
import { formatCurrency } from "@/lib/format";
import type { User } from "@/lib/models";
import { customerOverviewMetrics } from "@/app/dashboard/customers/lib/customer-profile-metrics";
import type { ProfileOverviewPeriod } from "@/lib/profile/overview-period";
import { CustomerDetailCard } from "@/app/dashboard/customers/components/customer-detail-card";
import { CustomerProfileOverviewTab } from "@/app/dashboard/customers/components/customer-profile-overview-tab";
import { CustomerProfileTripsTab } from "@/app/dashboard/customers/components/customer-profile-trips-tab";
import { CustomerProfileBillingTab } from "@/app/dashboard/customers/components/customer-profile-billing-tab";
import { CustomerEditSheet } from "@/app/dashboard/customers/customer-edit-sheet";
import { DetailPageShell } from "@/components/layout/detail-page-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";

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

  const { trips } = useCompanyTrips();
  const { invoices } = useCompanyInvoices();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [overviewPeriod, setOverviewPeriod] = useState<ProfileOverviewPeriod>("30d");

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
    return (
      <DetailPageShell>
        <p className="text-muted-foreground text-sm">Loading customer profile…</p>
      </DetailPageShell>
    );
  }

  if (!user || user.role !== "customer") {
    return (
      <DetailPageShell>
        <p className="text-muted-foreground text-sm">Customer not found.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/customers">
            <ChevronLeftIcon />
            Back to customers
          </Link>
        </Button>
      </DetailPageShell>
    );
  }

  const spendLabel =
    metrics.totalRevenue >= 1000
      ? formatCurrency(metrics.totalRevenue).replace(/\.\d{2}$/, "")
      : formatCurrency(metrics.totalRevenue);

  return (
    <>
      <DetailPageShell>
        <Tabs value={activeTab} onValueChange={(v) => setTab(v as ProfileTab)} className="gap-4">
          <CustomerDetailCard user={user} onEditClick={() => setEditOpen(true)} />

          <TabsContent value="overview" className="mt-0 space-y-4">
            <CustomerProfileOverviewTab
              user={user}
              trips={metrics.customerTrips}
              invoices={metrics.customerInvoices}
              customerId={customerId}
              statTrips={metrics.totalTrips}
              statCompleted={metrics.completed}
              statSpendLabel={spendLabel}
              period={overviewPeriod}
              onPeriodChange={setOverviewPeriod}
            />
          </TabsContent>
          <TabsContent value="trips" className="mt-0 space-y-4">
            <CustomerProfileTripsTab trips={metrics.customerTrips} />
          </TabsContent>
          <TabsContent value="billing" className="mt-0 space-y-4">
            <CustomerProfileBillingTab invoices={metrics.customerInvoices} />
          </TabsContent>
        </Tabs>
      </DetailPageShell>

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
