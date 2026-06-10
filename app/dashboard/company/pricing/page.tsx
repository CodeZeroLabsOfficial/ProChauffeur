"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useVehicleClasses } from "@/hooks/use-collections";
import {
  fetchPricingConfiguration,
  savePricingConfiguration
} from "@/lib/services/firebase-service";
import {
  getCachedOperatorLocale
} from "@/lib/services/operator-config-cache";
import {
  QUOTE_ROUNDING,
  buildInitialPricingConfig,
  tripTypeTitle,
  type PricingAddon,
  type PricingConfig
} from "@/lib/models";
import { distanceUnitLabel } from "@/lib/pricing/distance";
import { ConfigError } from "@/lib/pricing/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

type GlobalField = {
  key: keyof Pick<
    PricingConfig,
    | "minimumFare"
    | "baseFare"
    | "distanceRatePerUnit"
    | "timeRatePerHour"
    | "waitingFeeFlat"
    | "waitingFeePerMinute"
    | "waitingGraceMinutes"
    | "returnToBaseFee"
  >;
  label: string;
  step?: string;
};

export default function PricingPage() {
  const { vehicleClasses } = useVehicleClasses();
  const [config, setConfig] = useState<PricingConfig>(buildInitialPricingConfig());
  const [distanceUnit, setDistanceUnit] = useState("km");
  const [currency, setCurrency] = useState("AUD");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    Promise.all([
      getCachedOperatorLocale().then((locale) => {
        setDistanceUnit(locale.distanceUnit);
        setCurrency(locale.currency);
      }),
      fetchPricingConfiguration()
        .then((pricing) => {
          setConfig(pricing);
          setConfigured(true);
        })
        .catch((err) => {
          if (!(err instanceof ConfigError)) {
            toast.error("Could not load pricing.");
          }
          setConfigured(false);
        })
    ])
      .catch((err) => {
        if (err instanceof ConfigError) return;
        toast.error("Could not load pricing configuration.");
      })
      .finally(() => setLoading(false));
  }, []);

  function setGlobal<K extends keyof PricingConfig>(key: K, value: PricingConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function setAddon(id: string, patch: Partial<PricingAddon>) {
    setConfig((current) => ({
      ...current,
      addons: current.addons.map((addon) => (addon.id === id ? { ...addon, ...patch } : addon))
    }));
  }

  function toggleAddonClass(addonId: string, classId: string) {
    setConfig((current) => ({
      ...current,
      addons: current.addons.map((addon) => {
        if (addon.id !== addonId) return addon;
        const selected = new Set(addon.vehicleClassIds);
        if (selected.has(classId)) selected.delete(classId);
        else selected.add(classId);
        return { ...addon, vehicleClassIds: [...selected] };
      })
    }));
  }

  function addAddon() {
    setConfig((current) => ({
      ...current,
      addons: [
        ...current.addons,
        {
          id: crypto.randomUUID(),
          title: "New add-on",
          price: 0,
          isEnabled: true,
          tripTypes: ["transfer", "hourly"],
          vehicleClassIds: vehicleClasses.map((vehicleClass) => vehicleClass.id)
        }
      ]
    }));
  }

  function removeAddon(id: string) {
    setConfig((current) => ({
      ...current,
      addons: current.addons.filter((addon) => addon.id !== id)
    }));
  }

  async function save() {
    setSaving(true);
    try {
      await savePricingConfiguration({ ...config, schemaVersion: 2 });
      setConfigured(true);
      toast.success("Pricing saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save pricing.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  const unit = distanceUnitLabel(distanceUnit as "km" | "mile");
  const globalFields: GlobalField[] = [
    { key: "minimumFare", label: "Minimum fare" },
    { key: "baseFare", label: "Base fare" },
    { key: "distanceRatePerUnit", label: `Default rate per ${unit}`, step: "0.01" },
    { key: "timeRatePerHour", label: "Default hourly rate" },
    { key: "waitingFeeFlat", label: "Waiting fee (flat)" },
    { key: "waitingFeePerMinute", label: "Waiting fee / min", step: "0.01" },
    { key: "waitingGraceMinutes", label: "Waiting grace (min)" },
    { key: "returnToBaseFee", label: "Return-to-base fee" }
  ];

  return (
    <div className="space-y-4">
      {!configured ? (
        <Card>
          <CardHeader>
            <CardTitle>Pricing not configured</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Vehicle class rate cards live under Company → Vehicle Classes. Save global pricing
              here once vehicle classes are configured.
            </p>
            <Button type="button" variant="outline" onClick={() => setConfig(buildInitialPricingConfig())}>
              Reset template
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Global defaults ({currency})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {globalFields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                type="number"
                step={field.step ?? "1"}
                value={config[field.key] as number}
                onChange={(e) => setGlobal(field.key, parseFloat(e.target.value) || 0)}
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="quoteRounding">Quote rounding</Label>
            <Select
              value={config.quoteRounding}
              onValueChange={(value) => setGlobal("quoteRounding", value as PricingConfig["quoteRounding"])}>
              <SelectTrigger id="quoteRounding">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUOTE_ROUNDING.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {mode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Add-ons</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addAddon}>
            Add add-on
          </Button>
        </CardHeader>
        <CardContent>
          {config.addons.length === 0 ? (
            <p className="text-muted-foreground text-sm">No add-ons configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Trip types</TableHead>
                  <TableHead>Vehicle classes</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.addons.map((addon) => (
                  <TableRow key={addon.id}>
                    <TableCell>
                      <Input
                        value={addon.title}
                        onChange={(e) => setAddon(addon.id, { title: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="w-28"
                        value={addon.price}
                        onChange={(e) => setAddon(addon.id, { price: parseFloat(e.target.value) || 0 })}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {addon.tripTypes.map((t) => tripTypeTitle[t]).join(", ")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {vehicleClasses.map((vehicleClass) => {
                          const selected = addon.vehicleClassIds.includes(vehicleClass.id);
                          return (
                            <Button
                              key={vehicleClass.id}
                              type="button"
                              size="sm"
                              variant={selected ? "default" : "outline"}
                              onClick={() => toggleAddonClass(addon.id, vehicleClass.id)}>
                              {vehicleClass.displayName}
                            </Button>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={addon.isEnabled}
                        onCheckedChange={(checked) => setAddon(addon.id, { isEnabled: checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeAddon(addon.id)}>
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : configured ? "Save pricing" : "Initialize pricing"}
        </Button>
      </div>
    </div>
  );
}
