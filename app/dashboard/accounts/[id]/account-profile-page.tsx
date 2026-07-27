"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon } from "lucide-react";

import { AccountBillingTab } from "@/app/dashboard/accounts/components/account-billing-tab";
import { AccountMembersTab } from "@/app/dashboard/accounts/components/account-members-tab";
import { AccountOverviewTab } from "@/app/dashboard/accounts/components/account-overview-tab";
import { AccountPolicyTab } from "@/app/dashboard/accounts/components/account-policy-tab";
import { AccountProfileSidebar } from "@/app/dashboard/accounts/components/account-profile-sidebar";
import { AccountRatesTab } from "@/app/dashboard/accounts/components/account-rates-tab";
import { AccountEditSheet } from "@/app/dashboard/accounts/account-edit-sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInvoices, useTrips, useUsers } from "@/hooks/use-collections";
import { useFeatureEnabled } from "@/hooks/use-feature-enabled";
import {
  corporateMonthlySpend,
  corporateOpenExposure
} from "@/lib/bookings/corporate-policy";
import type { CorporateAccount, User } from "@/lib/models";
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
  const [membersCount, setMembersCount] = useState(0);

  const loadAccount = useCallback(() => {
    return fetchCorporateAccount(accountId).then((loaded) => {
      setAccount(loaded);
      return loaded;
    });
  }, [accountId]);

  useEffect(() => {
    loadAccount().finally(() => setLoading(false));
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

  useEffect(() => {
    const count = users.filter(
      (u) => u.role === "customer" && u.corporateAccountId === accountId
    ).length;
    setMembersCount(count);
  }, [users, accountId]);

  const mtdSpend = useMemo(
    () => (account ? corporateMonthlySpend(trips, account.id) : 0),
    [account, trips]
  );
  const openBalance = useMemo(
    () => (account ? corporateOpenExposure(trips, invoices, account.id) : 0),
    [account, trips, invoices]
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
        <p className="text-muted-foreground text-sm">Account not found.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/accounts">
            <ChevronLeftIcon />
            Back to accounts
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/accounts">
              <ChevronLeftIcon />
              Accounts
            </Link>
          </Button>
        </div>
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">{account.name}</h1>

        <Tabs value={activeTab} onValueChange={(v) => setTab(v as ProfileTab)} className="gap-4">
          <TabsList className="[&_[data-slot=tabs-trigger]]:flex-none">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="rates">Rates</TabsTrigger>
            <TabsTrigger value="policy">Policy</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="space-y-4 xl:sticky xl:top-4 xl:col-span-1 xl:self-start">
              <AccountProfileSidebar
                account={account}
                mtdSpend={mtdSpend}
                openBalance={openBalance}
                onEditClick={() => setEditOpen(true)}
              />
            </div>

            <div className="space-y-4 xl:col-span-2">
              <TabsContent value="overview" className="mt-0">
                <AccountOverviewTab
                  account={account}
                  manager={manager}
                  membersCount={membersCount}
                />
              </TabsContent>
              <TabsContent value="members" className="mt-0">
                <AccountMembersTab accountId={account.id} onMembersChange={setMembersCount} />
              </TabsContent>
              <TabsContent value="rates" className="mt-0">
                <AccountRatesTab account={account} onSaved={setAccount} />
              </TabsContent>
              <TabsContent value="policy" className="mt-0">
                <AccountPolicyTab account={account} onSaved={setAccount} />
              </TabsContent>
              <TabsContent value="billing" className="mt-0">
                <AccountBillingTab />
              </TabsContent>
            </div>
          </div>
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
