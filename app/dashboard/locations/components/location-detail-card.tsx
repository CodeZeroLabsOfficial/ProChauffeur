"use client";

import { Building2 } from "lucide-react";

import type { Branch } from "@/lib/models";
import { LocationStatusBadge } from "@/components/location-status-badge";
import { ProfileHeroCard } from "@/components/layout/profile-hero-card";
import { ProfileV2TabTrigger } from "@/components/layout/profile-tab-bar";

export function LocationDetailCard({
  branch,
  onEditClick
}: {
  branch: Branch;
  onEditClick: () => void;
}) {
  const imageUrl = branch.imageUrl?.trim() || null;

  return (
    <ProfileHeroCard
      bannerImageUrl="/images/location-header-world-map.png"
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
      meta={<LocationStatusBadge isActive={branch.isActive !== false} />}
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
