"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { fetchGlobalLimits, saveGlobalLimits } from "@/lib/services/firebase-service";
import { UNLIMITED, unlimitedLimits, type AppGlobalLimits } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function toField(value: number): string {
  return value >= UNLIMITED ? "" : String(value);
}
function fromField(raw: string): number {
  const v = parseInt(raw, 10);
  return raw.trim() === "" || Number.isNaN(v) ? UNLIMITED : v;
}

export default function LicensePage() {
  const [limits, setLimits] = useState<AppGlobalLimits>(unlimitedLimits);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGlobalLimits()
      .then(setLimits)
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: AppGlobalLimits = {
      maxAdmins: fromField(String(form.get("maxAdmins") ?? "")),
      maxDrivers: fromField(String(form.get("maxDrivers") ?? "")),
      maxLocations: fromField(String(form.get("maxLocations") ?? "")),
      subscriptionTier: String(form.get("subscriptionTier") ?? "").trim()
    };
    setSaving(true);
    try {
      await saveGlobalLimits(data);
      setLimits(data);
      toast.success("License limits saved.");
    } catch {
      toast.error("Could not save license limits.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>License & limits</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="max-w-lg space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subscriptionTier">Subscription tier</Label>
            <Input
              id="subscriptionTier"
              name="subscriptionTier"
              defaultValue={limits.subscriptionTier}
              placeholder="e.g. Professional"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="maxAdmins">Max admins</Label>
              <Input id="maxAdmins" name="maxAdmins" type="number" min={0} defaultValue={toField(limits.maxAdmins)} placeholder="∞" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxDrivers">Max drivers</Label>
              <Input id="maxDrivers" name="maxDrivers" type="number" min={0} defaultValue={toField(limits.maxDrivers)} placeholder="∞" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxLocations">Max locations</Label>
              <Input id="maxLocations" name="maxLocations" type="number" min={0} defaultValue={toField(limits.maxLocations)} placeholder="∞" />
            </div>
          </div>
          <p className="text-muted-foreground text-xs">Leave a limit blank for unlimited.</p>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save limits"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
