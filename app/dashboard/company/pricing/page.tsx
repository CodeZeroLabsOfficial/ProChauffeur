"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useVehicleClasses } from "@/hooks/use-collections";
import {
  fetchPricingConfiguration,
  savePricingConfiguration
} from "@/lib/services/firebase-service";
import {
  QUOTE_ROUNDING,
  buildInitialPricingConfig,
  preparePricingConfigForSave,
  tripTypeTitle,
  type PricingAddon,
  type PricingConfig,
  type WeekdayNumber
} from "@/lib/models";
import { ConfigError } from "@/lib/pricing/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const WEEKEND_WEEKDAY_OPTIONS: { value: WeekdayNumber; label: string }[] = [
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" }
];

export default function PricingPage() {
  const { vehicleClasses } = useVehicleClasses();
  const [config, setConfig] = useState<PricingConfig>(buildInitialPricingConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
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
      .catch((err) => {
        if (err instanceof ConfigError) return;
        toast.error("Could not load pricing configuration.");
      })
      .finally(() => setLoading(false));
  }, []);

  function setGlobal<K extends keyof PricingConfig>(key: K, value: PricingConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  function toggleWeekendWeekday(weekday: WeekdayNumber) {
    setConfig((current) => {
      const selected = new Set(current.weekendWeekdays);
      if (selected.has(weekday)) selected.delete(weekday);
      else selected.add(weekday);
      return { ...current, weekendWeekdays: [...selected].sort((a, b) => a - b) };
    });
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
      const payload = preparePricingConfigForSave(config);
      await savePricingConfiguration(payload);
      setConfig(payload);
      setConfigured(true);
      toast.success("Pricing saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save pricing.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      {!configured ? (
        <Card>
          <CardHeader>
            <CardTitle>Pricing not configured</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Set company-wide add-ons and rules here. Transfer and hourly rates are configured per
              vehicle class.
            </p>
            <Button type="button" variant="outline" onClick={() => setConfig(buildInitialPricingConfig())}>
              Reset template
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Global pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label htmlFor="minimumFare">Minimum fare (transfer floor)</Label>
            <Input
              id="minimumFare"
              type="number"
              step="1"
              className="max-w-xs"
              value={config.minimumFare}
              onChange={(e) => setGlobal("minimumFare", parseFloat(e.target.value) || 0)}
            />
            <p className="text-muted-foreground text-xs">
              Applied after the vehicle class total if this amount is higher. Set per-class minimums
              on each vehicle class as well.
            </p>
          </div>

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

          <div className="space-y-2 sm:col-span-2">
            <Label>Weekend days (hourly)</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKEND_WEEKDAY_OPTIONS.map(({ value, label }) => {
                const selected = config.weekendWeekdays.includes(value);
                return (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    onClick={() => toggleWeekendWeekday(value)}>
                    {label}
                  </Button>
                );
              })}
            </div>
            <p className="text-muted-foreground text-xs">
              Pickups on these days use each class&apos;s weekend hourly rate and minimum hours.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Add-ons</CardTitle>
            <CardDescription>Optional extras added to the quoted total.</CardDescription>
          </div>
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
