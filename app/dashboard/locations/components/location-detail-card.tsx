import { Building2 } from "lucide-react";

import type { Branch } from "@/lib/models";
import { LocationStatusBadge } from "@/components/location-status-badge";
import {
  ProfileV2TabBar,
  ProfileV2TabTrigger
} from "@/components/layout/profile-tab-bar";

export function LocationDetailCard({ branch }: { branch: Branch }) {
  const imageUrl = branch.imageUrl?.trim() || null;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="relative">
        <div
          className="bg-muted relative aspect-3/1 w-full md:max-h-[240px]"
          aria-hidden
        />
        <div className="relative -mt-10 flex items-end gap-4 px-4 pb-5 sm:px-6 md:-mt-12 md:px-8 md:pb-6">
          <div className="border-background bg-muted relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 shadow-xs shadow-black/10 lg:size-28">
            {imageUrl ? (
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
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2 pb-1">
            <h2 className="text-xl font-bold tracking-tight lg:text-2xl">{branch.name}</h2>
            <LocationStatusBadge isActive={branch.isActive !== false} />
          </div>
        </div>
      </div>

      <ProfileV2TabBar>
        <ProfileV2TabTrigger value="overview">Overview</ProfileV2TabTrigger>
        <ProfileV2TabTrigger value="service-area">Service area</ProfileV2TabTrigger>
        <ProfileV2TabTrigger value="hours">Operating hours</ProfileV2TabTrigger>
        <ProfileV2TabTrigger value="classes">Vehicle classes</ProfileV2TabTrigger>
        <ProfileV2TabTrigger value="pricing">Pricing</ProfileV2TabTrigger>
      </ProfileV2TabBar>
    </div>
  );
}
