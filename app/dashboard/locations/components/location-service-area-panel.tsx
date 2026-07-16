"use client";

import { useState } from "react";
import { toast } from "sonner";

import { LocationServiceAreaForm } from "@/app/dashboard/locations/components/location-service-area-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Branch } from "@/lib/models";
import { upsertBranch } from "@/lib/services/firebase-service";

export function LocationServiceAreaPanel({
  branch,
  onSaved
}: {
  branch: Branch;
  onSaved: (branch: Branch) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function saveServiceArea(serviceArea: Branch["serviceArea"]) {
    setSaving(true);
    try {
      const updated: Branch = {
        ...branch,
        serviceArea,
        updatedAt: new Date()
      };
      await upsertBranch(updated);
      onSaved(updated);
      toast.success("Service area saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the service area.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service area</CardTitle>
      </CardHeader>
      <CardContent>
        <LocationServiceAreaForm branch={branch} saving={saving} onSave={saveServiceArea} />
      </CardContent>
    </Card>
  );
}
