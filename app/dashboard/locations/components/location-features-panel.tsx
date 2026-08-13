"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useLicenseEntitlements } from "@/hooks/use-feature-enabled";
import { SettingsSection } from "@/components/settings-section";
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
    <SettingsSection
      title="Features"
      description="Turn on ops tools this Location is allowed to use.">
      {LOCATION_OPS_FEATURE_IDS.map((feature) => {
        const copy = LOCATION_OPS_FEATURE_COPY[feature];
        const field = locationOpsFeatureField(feature);
        const entitled = ready && isEnabled(feature);
        const active = branch[field] === true;
        const saving = savingFeature === feature;
        const switchId = `location-feature-${feature}`;
        return (
          <div
            key={feature}
            className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label htmlFor={switchId}>{copy.title}</Label>
                <DetailSheetIconBadge icon={Sparkles}>Premium</DetailSheetIconBadge>
              </div>
              <p className="text-muted-foreground text-xs">{copy.description}</p>
            </div>
            <Switch
              id={switchId}
              checked={active}
              disabled={saving || (!entitled && !active)}
              onCheckedChange={(checked) => void setFeatureEnabled(feature, checked)}
            />
          </div>
        );
      })}
    </SettingsSection>
  );
}
