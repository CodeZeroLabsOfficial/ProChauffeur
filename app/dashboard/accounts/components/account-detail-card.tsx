"use client";

import { Building2 } from "lucide-react";

import {
  corporateAccountStatusTitle,
  type CorporateAccount
} from "@/lib/models";
import { ProfileHeroCard } from "@/components/layout/profile-hero-card";
import { ProfileV2TabTrigger } from "@/components/layout/profile-tab-bar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AccountDetailCard({
  account,
  onEditClick
}: {
  account: CorporateAccount;
  onEditClick: () => void;
}) {
  return (
    <ProfileHeroCard
      bannerImageUrl="/images/location-header-world-map.png"
      backHref="/dashboard/accounts"
      backAriaLabel="Back to accounts"
      onEditClick={onEditClick}
      editAriaLabel="Edit account"
      avatar={
        account.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Storage download URL
          <img
            alt=""
            className="size-full object-cover"
            src={account.logoUrl}
          />
        ) : (
          <Building2 className="text-muted-foreground size-8 lg:size-10" aria-hidden />
        )
      }
      title={account.name}
      meta={
        <Badge
          variant="outline"
          className={cn(
            "font-medium",
            account.status === "active"
              ? "border-green-300 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
              : "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          )}>
          {corporateAccountStatusTitle[account.status]}
        </Badge>
      }
      tabs={
        <>
          <ProfileV2TabTrigger value="overview">Overview</ProfileV2TabTrigger>
          <ProfileV2TabTrigger value="billing">Billing</ProfileV2TabTrigger>
          <ProfileV2TabTrigger value="members">Members</ProfileV2TabTrigger>
          <ProfileV2TabTrigger value="policy">Policy</ProfileV2TabTrigger>
          <ProfileV2TabTrigger value="rates">Rates</ProfileV2TabTrigger>
        </>
      }
    />
  );
}
