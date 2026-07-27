"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon } from "lucide-react";

import { AccountBillingTab } from "@/app/dashboard/accounts/components/account-billing-tab";
import { AccountDetailCard } from "@/app/dashboard/accounts/components/account-detail-card";
import { AccountMembersTab } from "@/app/dashboard/accounts/components/account-members-tab";
import { AccountOverviewTab } from "@/app/dashboard/accounts/components/account-overview-tab";
import { AccountPolicyTab } from "@/app/dashboard/accounts/components/account-policy-tab";
import { AccountRatesTab } from "@/app/dashboard/accounts/components/account-rates-tab";
import { AccountEditSheet } from "@/app/dashboard/accounts/account-edit-sheet";
import {
  invoicesForCorporateAccount,
  tripsForCorporateAccount
} from "@/app/dashboard/accounts/lib/account-profile-metrics";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useInvoices, useTrips, useUsers } from "@/hooks/use-collections";
import { useFeatureEnabled } from "@/hooks/use-feature-enabled";
import { corporateMonthlySpend } from "@/lib/bookings/corporate-policy";
import type { CorporateAccount, User } from "@/lib/models";
import type { ProfileOverviewPeriod } from "@/lib/profile/overview-period";
import { fetchCorporateAccount, fetchUser } from "@/lib/services/firebase-service";

const PROFILE_TABS = ["overview", "members", "rates", "policy", "billing"] as const;
type ProfileTab = (typeof PROFILE_TABS)[number];

function isProfileTab(value: string | null): value is ProfileTab {
  return PROFILE_TABS.includes(value as ProfileTab);
}

export function AccountProfilePage({ accountId }: { accountId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ProfileTab = isProfileTab(tabParam) ? tabParam : "overview";
  const { ready, enabled } = useFeatureEnabled("corporateAccounts");
  const { trips } = useTrips();
  const { invoices } = useInvoices();
  const { users } = useUsers();

  const [account, setAccount] = useState<CorporateAccount | null>(null);
  const [manager, setManager] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [overviewPeriod, setOverviewPeriod] = useState<ProfileOverviewPeriod>("30d");

  const loadAccount = useCallback(() => {
    return fetchCorporateAccount(accountId).then((loaded) => {
      setAccount(loaded);
      return loaded;
    });
  }, [accountId]);

  useEffect(() => {
    setLoading(true);
    loadAccount()
      .catch(() => setAccount(null))
      .finally(() => setLoading(false));
  }, [loadAccount]);

  useEffect(() => {
    const id = account?.accountManagerUserId?.trim();
    if (!id) {
      setManager(null);
      return;
    }
    let cancelled = false;
    fetchUser(id)
      .then((user) => {
        if (!cancelled) setManager(user?.role === "admin" ? user : null);
      })
      .catch(() => {
        if (!cancelled) setManager(null);
      });
    return () => {
      cancelled = true;
    };
  }, [account?.accountManagerUserId]);

  const memberCustomerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const user of users) {
      if (user.role === "customer" && user.corporateAccountId === accountId) {
        ids.add(user.id);
      }
    }
    return ids;
  }, [users, accountId]);

  const accountTrips = useMemo(
    () => tripsForCorporateAccount(trips, accountId, memberCustomerIds),
    [trips, accountId, memberCustomerIds]
  );
  const accountInvoices = useMemo(
    () => invoicesForCorporateAccount(invoices, accountId, memberCustomerIds),
    [invoices, accountId, memberCustomerIds]
  );

  const mtdSpend = useMemo(
    () => (account ? corporateMonthlySpend(trips, account.id) : 0),
    [account, trips]
  );

  const setTab = (tab: ProfileTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const q = params.toString();
    router.replace(`/dashboard/accounts/${accountId}${q ? `?${q}` : ""}`, { scroll: false });
  };

  if (!ready || loading) {
    return <p className="text-muted-foreground text-sm">Loading account…</p>;
  }

  if (!enabled) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">Accounts are not enabled on this license.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/settings/license">Open License</Link>
        </Button>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="icon" className="bg-background/50 rounded-full">
          <Link href="/dashboard/accounts" aria-label="Back to accounts">
            <ChevronLeftIcon />
          </Link>
        </Button>
        <p className="text-muted-foreground text-sm">Account not found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setTab(v as ProfileTab)} className="gap-4">
          <AccountDetailCard account={account} onEditClick={() => setEditOpen(true)} />

          <TabsContent value="overview" className="mt-0 space-y-4">
            <AccountOverviewTab
              account={account}
              manager={manager}
              membersCount={memberCustomerIds.size}
              mtdSpend={mtdSpend}
              trips={accountTrips}
              invoices={accountInvoices}
              period={overviewPeriod}
              onPeriodChange={setOverviewPeriod}
            />
          </TabsContent>

          <TabsContent value="members" className="mt-0 space-y-4">
            <AccountMembersTab accountId={account.id} />
          </TabsContent>

          <TabsContent value="rates" className="mt-0 space-y-4">
            <AccountRatesTab account={account} onSaved={setAccount} />
          </TabsContent>

          <TabsContent value="policy" className="mt-0 space-y-4">
            <AccountPolicyTab account={account} onSaved={setAccount} />
          </TabsContent>

          <TabsContent value="billing" className="mt-0 space-y-4">
            <AccountBillingTab />
          </TabsContent>
        </Tabs>
      </div>

      <AccountEditSheet
        account={account}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) void loadAccount();
        }}
        onSaved={(next) => setAccount(next)}
        onDeleted={() => router.push("/dashboard/accounts")}
      />
    </>
  );
}
