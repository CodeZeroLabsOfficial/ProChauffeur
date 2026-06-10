"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { fetchOperatorLocale, fetchPricingConfiguration, savePricingConfiguration } from "@/lib/services/firebase-service";
import {
  QUOTE_ROUNDING,
  TRIP_TYPES,
  VEHICLE_TYPES,
  buildInitialPricingConfig,
  tripTypeTitle,
  vehicleTypeTitle,
  type HourlyPricingRates,
  type PricingAddon,
  type PricingConfig,
  type TransferPricingRates,
  type VehicleTier,
  type VehicleType
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

const transferFields: { key: keyof TransferPricingRates; label: string; step?: string }[] = [
  { key: "minimumBaseRate", label: "Minimum base rate" },
  { key: "baseFare", label: "Base fare" },
  { key: "deadheadRatePerUnit", label: "Deadhead rate", step: "0.01" },
  { key: "tripRatePerUnit", label: "Trip rate", step: "0.01" },
  { key: "returnToBaseFee", label: "Return-to-base fee" },
  { key: "waitingFeeFlat", label: "Waiting fee" }
];

const hourlyFields: { key: keyof HourlyPricingRates; label: string; step?: string }[] = [
  { key: "weekdayHourlyRate", label: "Weekday hourly rate" },
  { key: "weekendHourlyRate", label: "Weekend hourly rate" },
  { key: "weekdayMinimumHours", label: "Weekday min. hours", step: "0.5" },
  { key: "weekendMinimumHours", label: "Weekend min. hours", step: "0.5" },
  { key: "freeDeadheadMinutes", label: "Free deadhead (min)" },
  { key: "deadheadRatePerMinute", label: "Deadhead / min", step: "0.01" },
  { key: "displayHourlyFrom", label: "Display from" }
];

export default function PricingPage() {
  const [config, setConfig] = useState<PricingConfig>(buildInitialPricingConfig());
  const [distanceUnit, setDistanceUnit] = useState("km");
  const [currency, setCurrency] = useState("AUD");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchOperatorLocale().then((locale) => {
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
        toast.error("Could not load locale for pricing labels.");
      })
      .finally(() => setLoading(false));
  }, []);

  function setGlobal<K extends keyof PricingConfig>(key: K, value: PricingConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function setTier(type: VehicleType, patch: Partial<VehicleTier>) {
    setConfig((current) => ({
      ...current,
      vehicles: current.vehicles.map((tier) => (tier.type === type ? { ...tier, ...patch } : tier))
    }));
  }

  function setTransferField(type: VehicleType, key: keyof TransferPricingRates, value: number) {
    setConfig((current) => ({
      ...current,
      vehicles: current.vehicles.map((tier) =>
        tier.type === type ? { ...tier, transfer: { ...tier.transfer, [key]: value } } : tier
      )
    }));
  }

  function setHourlyField(type: VehicleType, key: keyof HourlyPricingRates, value: number) {
    setConfig((current) => ({
      ...current,
      vehicles: current.vehicles.map((tier) =>
        tier.type === type ? { ...tier, hourly: { ...tier.hourly, [key]: value } } : tier
      )
    }));
  }

  function setAddon(id: string, patch: Partial<PricingAddon>) {
    setConfig((current) => ({
      ...current,
      addons: current.addons.map((addon) => (addon.id === id ? { ...addon, ...patch } : addon))
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
          vehicleTypes: [...VEHICLE_TYPES]
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
      await savePricingConfiguration(config);
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
              Review the template below, then save to store pricing in{" "}
              <code className="text-xs">operator/pricing</code>.
            </p>
            <Button type="button" variant="outline" onClick={() => setConfig(buildInitialPricingConfig())}>
              Reset template
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            Global defaults ({currency})
          </CardTitle>
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

      {config.vehicles.map((tier) => (
        <Card key={tier.type}>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>{vehicleTypeTitle[tier.type]}</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor={`enabled-${tier.type}`} className="text-sm font-normal">
                Enabled
              </Label>
              <Switch
                id={`enabled-${tier.type}`}
                checked={tier.isEnabled}
                onCheckedChange={(checked) => setTier(tier.type, { isEnabled: checked })}
              />
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Transfer</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {transferFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>
                      {field.key.includes("PerUnit")
                        ? field.label.replace("rate", `rate / ${unit}`)
                        : field.label}
                    </Label>
                    <Input
                      type="number"
                      step={field.step ?? "1"}
                      value={tier.transfer[field.key]}
                      onChange={(e) =>
                        setTransferField(tier.type, field.key, parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Hourly</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {hourlyFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label}</Label>
                    <Input
                      type="number"
                      step={field.step ?? "1"}
                      value={tier.hourly[field.key]}
                      onChange={(e) =>
                        setHourlyField(tier.type, field.key, parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

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
                      <Switch
                        checked={addon.isEnabled}
                        onCheckedChange={(checked) => setAddon(addon.id, { isEnabled: checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAddon(addon.id)}>
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
