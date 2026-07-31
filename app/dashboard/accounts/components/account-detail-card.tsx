"use client";

import { Building2 } from "lucide-react";

import {
  corporateAccountStatusTitle,
  type CorporateAccount
} from "@/lib/models";
import { visibilityBadgeIcon } from "@/lib/chauffeur-badge-icons";
import { ProfileHeroCard } from "@/components/layout/profile-hero-card";
import { ProfileV2TabTrigger } from "@/components/layout/profile-tab-bar";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";

export function AccountDetailCard({
  account,
  onEditClick
}: {
  account: CorporateAccount;
  onEditClick: () => void;
}) {
  const isActive = account.status === "active";

  return (
    <ProfileHeroCard
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
        <DetailSheetIconBadge icon={visibilityBadgeIcon(isActive)}>
          {corporateAccountStatusTitle[account.status]}
        </DetailSheetIconBadge>
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
