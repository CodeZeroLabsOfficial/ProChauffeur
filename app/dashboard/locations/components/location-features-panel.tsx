"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useLicenseEntitlements } from "@/hooks/use-feature-enabled";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  LOCATION_OPS_FEATURE_COPY,
  LOCATION_OPS_FEATURE_IDS,
  locationOpsFeatureField,
  type Branch,
  type LocationOpsFeatureId
} from "@/lib/models";
import { upsertBranch } from "@/lib/services/firebase-service";

export function LocationFeaturesPanel({
  branch,
  onSaved
}: {
  branch: Branch;
  onSaved: (branch: Branch) => void;
}) {
  const { ready, isEnabled } = useLicenseEntitlements();
  const [savingFeature, setSavingFeature] = useState<LocationOpsFeatureId | null>(null);

  async function setFeatureEnabled(feature: LocationOpsFeatureId, enabled: boolean) {
    const field = locationOpsFeatureField(feature);
    if (branch[field] === enabled) return;
    if (enabled && !isEnabled(feature)) {
      toast.error("This feature is not included on your plan.");
      return;
    }

    setSavingFeature(feature);
    try {
      const updated: Branch = {
        ...branch,
        [field]: enabled,
        updatedAt: new Date()
      };
      await upsertBranch(updated, "features");
      onSaved(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSavingFeature(null);
    }
  }

  return (
    <section className="grid gap-4 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-10">
      <div className="space-y-1">
        <h3 className="text-sm font-medium leading-none">Features</h3>
        <p className="text-muted-foreground text-sm text-pretty">
          Turn on ops tools this Location is allowed to use.
        </p>
      </div>
      <div className="min-w-0 space-y-4">
        {LOCATION_OPS_FEATURE_IDS.map((feature) => {
          const copy = LOCATION_OPS_FEATURE_COPY[feature];
          const field = locationOpsFeatureField(feature);
          const entitled = ready && isEnabled(feature);
          const active = branch[field] === true;
          const saving = savingFeature === feature;
          const switchId = `location-feature-${feature}`;
          return (
            <Card key={feature} className="gap-0 py-0">
              <CardHeader className="gap-2 px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{copy.title}</CardTitle>
                  <DetailSheetIconBadge icon={Sparkles}>Premium</DetailSheetIconBadge>
                </div>
                <CardDescription>{copy.description}</CardDescription>
              </CardHeader>
              <CardFooter className="border-t px-6 py-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id={switchId}
                    checked={active}
                    disabled={saving || (!entitled && !active)}
                    onCheckedChange={(checked) => void setFeatureEnabled(feature, checked)}
                  />
                  <Label htmlFor={switchId} className="text-sm font-medium">
                    Activate
                  </Label>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
