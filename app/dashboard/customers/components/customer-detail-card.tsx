"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { User } from "@/lib/models";
import { customerDisplayName } from "@/lib/users/customer-display";
import { useFeatureEnabled } from "@/hooks/use-feature-enabled";
import { fetchCorporateAccount } from "@/lib/services/firebase-service";
import { generateAvatarFallback, cn } from "@/lib/utils";
import { ProfileHeroCard } from "@/components/layout/profile-hero-card";
import { ProfileV2TabTrigger } from "@/components/layout/profile-tab-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function CustomerDetailCard({
  user,
  onEditClick
}: {
  user: User;
  onEditClick: () => void;
}) {
  const displayName = customerDisplayName(user);
  const { enabled: corporateAccountsEnabled } = useFeatureEnabled("corporateAccounts");
  const [corporateAccountName, setCorporateAccountName] = useState<string | null>(null);
  const isCorporate = corporateAccountsEnabled && Boolean(user.corporateAccountId?.trim());

  useEffect(() => {
    const accountId = user.corporateAccountId?.trim();
    if (!accountId || !corporateAccountsEnabled) {
      setCorporateAccountName(null);
      return;
    }
    let cancelled = false;
    fetchCorporateAccount(accountId)
      .then((account) => {
        if (!cancelled) setCorporateAccountName(account?.name?.trim() || null);
      })
      .catch(() => {
        if (!cancelled) setCorporateAccountName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user.corporateAccountId, corporateAccountsEnabled]);

  return (
    <ProfileHeroCard
      backHref="/dashboard/customers"
      backAriaLabel="Back to customers"
      onEditClick={onEditClick}
      editAriaLabel="Edit customer"
      avatar={
        <Avatar className="size-full rounded-none">
          <AvatarImage src={user.profile.photoURL ?? undefined} alt={displayName} />
          <AvatarFallback className="rounded-none">{generateAvatarFallback(displayName)}</AvatarFallback>
        </Avatar>
      }
      title={displayName}
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "font-medium",
              isCorporate
                ? "border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                : "border-teal-300 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300"
            )}>
            {isCorporate ? "Corporate" : "Individual"}
          </Badge>
          {isCorporate && user.corporateAccountId && corporateAccountName ? (
            <Badge variant="outline" asChild>
              <Link
                href={`/dashboard/accounts/${user.corporateAccountId}`}
                className="font-medium">
                {corporateAccountName}
              </Link>
            </Badge>
          ) : null}
        </div>
      }
      tabs={
        <>
          <ProfileV2TabTrigger value="overview">Overview</ProfileV2TabTrigger>
          <ProfileV2TabTrigger value="trips">Trips</ProfileV2TabTrigger>
          <ProfileV2TabTrigger value="billing">Billing</ProfileV2TabTrigger>
        </>
      }
    />
  );
}
