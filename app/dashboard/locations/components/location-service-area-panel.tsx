"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Branch } from "@/lib/models";
import { upsertBranch } from "@/lib/services/firebase-service";

function parsePostcodes(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
}

function postcodesToText(branch: Branch): string {
  const list = branch.serviceArea?.type === "postcodes" ? branch.serviceArea.postcodes : null;
  return (list ?? []).join("\n");
}

export function LocationServiceAreaPanel({
  branch,
  onSaved
}: {
  branch: Branch;
  onSaved: (branch: Branch) => void;
}) {
  const [postcodesText, setPostcodesText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPostcodesText(postcodesToText(branch));
  }, [branch]);

  async function saveServiceArea(e: React.FormEvent) {
    e.preventDefault();
    const postcodes = parsePostcodes(postcodesText);
    const serviceArea =
      postcodes.length > 0 ? { type: "postcodes" as const, postcodes } : null;

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
        <form onSubmit={saveServiceArea} className="max-w-lg space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location-postcodes">Service postcodes</Label>
            <Textarea
              id="location-postcodes"
              rows={8}
              value={postcodesText}
              onChange={(e) => setPostcodesText(e.target.value)}
              placeholder={"One per line or comma-separated\n4000\n4001"}
              disabled={saving}
            />
            <p className="text-muted-foreground text-xs">
              Used to route customer bookings when multi-location is enabled. Avoid overlapping lists
              across locations.
            </p>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
