"use client";

import { Building2 } from "lucide-react";

import type { Branch } from "@/lib/models";
import {
  visibilityBadgeIcon,
  visibilityStatusLabel
} from "@/lib/chauffeur-badge-icons";
import { ProfileHeroCard } from "@/components/layout/profile-hero-card";
import { ProfileV2TabTrigger } from "@/components/layout/profile-tab-bar";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";

export function LocationDetailCard({
  branch,
  onEditClick
}: {
  branch: Branch;
  onEditClick: () => void;
}) {
  const imageUrl = branch.imageUrl?.trim() || null;
  const isActive = branch.isActive !== false;

  return (
    <ProfileHeroCard
      backHref="/dashboard/locations"
      backAriaLabel="Back to locations"
      onEditClick={onEditClick}
      editAriaLabel="Edit location"
      avatar={
        imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Storage download URL
          <img
            alt=""
            src={imageUrl}
            className="size-full object-cover"
            width={112}
            height={112}
          />
        ) : (
          <Building2 className="text-muted-foreground size-8 lg:size-10" aria-hidden />
        )
      }
      title={branch.name}
      meta={
        <DetailSheetIconBadge icon={visibilityBadgeIcon(isActive)}>
          {visibilityStatusLabel(isActive)}
        </DetailSheetIconBadge>
      }
      tabs={
        <>
          <ProfileV2TabTrigger value="overview">Overview</ProfileV2TabTrigger>
          <ProfileV2TabTrigger value="service-area">Service area</ProfileV2TabTrigger>
          <ProfileV2TabTrigger value="hours">Operating hours</ProfileV2TabTrigger>
          <ProfileV2TabTrigger value="classes">Vehicle classes</ProfileV2TabTrigger>
          <ProfileV2TabTrigger value="pricing">Pricing</ProfileV2TabTrigger>
        </>
      }
    />
  );
}
