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
import { ProfilePageShell } from "@/components/layout/profile-page-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useInvoices, useTrips, useUsers } from "@/hooks/use-collections";
import { useFeatureEnabled } from "@/hooks/use-feature-enabled";
import { corporateMonthlySpend } from "@/lib/bookings/corporate-policy";
import type { CorporateAccount, User } from "@/lib/models";
import type { ProfileOverviewPeriod } from "@/lib/profile/overview-period";
import { fetchCorporateAccount, fetchUser } from "@/lib/services/firebase-service";

const PROFILE_TABS = ["overview", "billing", "members", "policy", "rates"] as const;
type ProfileTab = (typeof PROFILE_TABS)[number];

function isProfileTab(value: string | null): value is ProfileTab {
  return PROFILE_TABS.includes(value as ProfileTab);
}

export function AccountProfilePage({ accountId }: { accountId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  // Legacy ?tab=invoices deep links open Billing → Invoices.
  const legacyInvoicesTab = tabParam === "invoices";
  const activeTab: ProfileTab = isProfileTab(tabParam)
    ? tabParam
    : legacyInvoicesTab
      ? "billing"
      : "overview";
  const billingDefaultSection = legacyInvoicesTab ? "invoices" : "unbilled";
  const { ready, enabled } = useFeatureEnabled("corporateAccounts");
  const { trips } = useTrips();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { users } = useUsers();

  const [account, setAccount] = useState<CorporateAccount | null>(null);
  const [primaryContact, setPrimaryContact] = useState<User | null>(null);
  const [billingContact, setBillingContact] = useState<User | null>(null);
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
    const id = account?.primaryContactUserId?.trim();
    if (!id) {
      setPrimaryContact(null);
      return;
    }
    let cancelled = false;
    fetchUser(id)
      .then((user) => {
        if (!cancelled) setPrimaryContact(user?.role === "customer" ? user : null);
      })
      .catch(() => {
        if (!cancelled) setPrimaryContact(null);
      });
    return () => {
      cancelled = true;
    };
  }, [account?.primaryContactUserId]);

  useEffect(() => {
    const id = account?.billingContactUserId?.trim();
    if (!id) {
      setBillingContact(null);
      return;
    }
    let cancelled = false;
    fetchUser(id)
      .then((user) => {
        if (!cancelled) setBillingContact(user?.role === "customer" ? user : null);
      })
      .catch(() => {
        if (!cancelled) setBillingContact(null);
      });
    return () => {
      cancelled = true;
    };
  }, [account?.billingContactUserId]);

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

  useEffect(() => {
    if (!legacyInvoicesTab) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "billing");
    const q = params.toString();
    router.replace(`/dashboard/accounts/${accountId}?${q}`, { scroll: false });
  }, [accountId, legacyInvoicesTab, router, searchParams]);

  const setTab = (tab: ProfileTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const q = params.toString();
    router.replace(`/dashboard/accounts/${accountId}${q ? `?${q}` : ""}`, { scroll: false });
  };

  if (!ready || loading) {
    return (
      <ProfilePageShell>
        <p className="text-muted-foreground text-sm">Loading account…</p>
      </ProfilePageShell>
    );
  }

  if (!enabled) {
    return (
      <ProfilePageShell>
        <p className="text-muted-foreground text-sm">Accounts are not enabled on this license.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/settings/license">Open License</Link>
        </Button>
      </ProfilePageShell>
    );
  }

  if (!account) {
    return (
      <ProfilePageShell>
        <Button asChild variant="ghost" size="icon" className="bg-background/50 rounded-full">
          <Link href="/dashboard/accounts" aria-label="Back to accounts">
            <ChevronLeftIcon />
          </Link>
        </Button>
        <p className="text-muted-foreground text-sm">Account not found.</p>
      </ProfilePageShell>
    );
  }

  return (
    <>
      <ProfilePageShell>
        <Tabs value={activeTab} onValueChange={(v) => setTab(v as ProfileTab)} className="gap-4">
          <AccountDetailCard account={account} onEditClick={() => setEditOpen(true)} />

          <TabsContent value="overview" className="mt-0 space-y-4">
            <AccountOverviewTab
              account={account}
              primaryContact={primaryContact}
              billingContact={billingContact}
              membersCount={memberCustomerIds.size}
              mtdSpend={mtdSpend}
              trips={accountTrips}
              invoices={accountInvoices}
              period={overviewPeriod}
              onPeriodChange={setOverviewPeriod}
            />
          </TabsContent>

          <TabsContent value="billing" className="mt-0 space-y-4">
            <AccountBillingTab
              account={account}
              trips={trips}
              invoices={accountInvoices}
              invoicesLoading={invoicesLoading}
              defaultSection={billingDefaultSection}
            />
          </TabsContent>

          <TabsContent value="members" className="mt-0 space-y-4">
            <AccountMembersTab account={account} onSaved={setAccount} />
          </TabsContent>

          <TabsContent value="policy" className="mt-0 space-y-4">
            <AccountPolicyTab account={account} onSaved={setAccount} />
          </TabsContent>

          <TabsContent value="rates" className="mt-0 space-y-4">
            <AccountRatesTab account={account} onSaved={setAccount} />
          </TabsContent>
        </Tabs>
      </ProfilePageShell>

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
