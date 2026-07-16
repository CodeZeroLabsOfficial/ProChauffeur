import type { Branch } from "@/lib/models";
import { Badge } from "@/components/ui/badge";
import {
  ProfileV2TabBar,
  ProfileV2TabTrigger
} from "@/components/layout/profile-tab-bar";

export function LocationDetailCard({ branch }: { branch: Branch }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-4 py-5 sm:px-6 md:px-8 md:py-6">
        <div className="min-w-0 space-y-3">
          <h2 className="text-xl font-bold tracking-tight lg:text-2xl">{branch.name}</h2>
          {branch.isActive ? (
            <Badge variant="secondary">Active</Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          )}
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
