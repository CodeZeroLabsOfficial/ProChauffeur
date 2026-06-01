"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { fetchPricingConfiguration, savePricingConfiguration } from "@/lib/services/firebase-service";
import {
  defaultPricingConfig,
  vehicleTypeTitle,
  type PricingConfig,
  type VehicleTier
} from "@/lib/models";
import { appConfig } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

const baseFields: { key: keyof PricingConfig; label: string; step?: string }[] = [
  { key: "minimumFare", label: "Minimum fare" },
  { key: "baseFare", label: "Base fare" },
  { key: "distanceRatePerKm", label: "Per km", step: "0.01" },
  { key: "timeRatePerHour", label: "Per hour" },
  { key: "waitingFeeFlat", label: "Waiting fee" },
  { key: "peakOrWeekendMultiplier", label: "Peak multiplier", step: "0.01" },
  { key: "returnToBaseFee", label: "Return-to-base fee" }
];

export default function PricingPage() {
  const [config, setConfig] = useState<PricingConfig>(defaultPricingConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPricingConfiguration()
      .then(setConfig)
      .catch(() => setConfig(defaultPricingConfig))
      .finally(() => setLoading(false));
  }, []);

  function setBase(key: keyof PricingConfig, value: number) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  function setTier(type: string, patch: Partial<VehicleTier>) {
    setConfig((c) => ({
      ...c,
      vehicles: c.vehicles.map((v) => (v.type === type ? { ...v, ...patch } : v))
    }));
  }

  async function save() {
    setSaving(true);
    try {
      await savePricingConfiguration(config);
      toast.success("Pricing saved.");
    } catch {
      toast.error("Could not save pricing.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Base fare ({appConfig.currency})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {baseFields.map((f) => (
            <div key={f.key} className="space-y-2">
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input
                id={f.key}
                type="number"
                step={f.step ?? "1"}
                value={config[f.key] as number}
                onChange={(e) => setBase(f.key, parseFloat(e.target.value) || 0)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle tiers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier</TableHead>
                <TableHead>Multiplier</TableHead>
                <TableHead>Min. hours</TableHead>
                <TableHead>Display from</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.vehicles.map((v) => (
                <TableRow key={v.type}>
                  <TableCell className="font-medium">{vehicleTypeTitle[v.type]}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      className="w-28"
                      value={v.multiplier}
                      onChange={(e) => setTier(v.type, { multiplier: parseFloat(e.target.value) || 0 })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-24"
                      value={v.minimumBookedHours}
                      onChange={(e) =>
                        setTier(v.type, { minimumBookedHours: parseInt(e.target.value) || 0 })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-28"
                      value={v.displayHourlyFrom ?? ""}
                      onChange={(e) =>
                        setTier(v.type, {
                          displayHourlyFrom: e.target.value ? parseFloat(e.target.value) : null
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save pricing"}
        </Button>
      </div>
    </div>
  );
}
