"use client";

import { useEffect, useState } from "react";
import { PencilIcon } from "lucide-react";
import { toast } from "sonner";

import {
  AddonEditSheet,
  formatAddonTripTypes,
  formatAddonVehicleClasses
} from "@/app/dashboard/company/pricing/addon-edit-sheet";
import { useVehicleClasses } from "@/hooks/use-collections";
import {
  fetchPricingConfiguration,
  savePricingConfiguration
} from "@/lib/services/firebase-service";
import {
  QUOTE_ROUNDING,
  buildInitialPricingConfig,
  preparePricingConfigForSave,
  type PricingAddon,
  type PricingConfig,
  type WeekdayNumber
} from "@/lib/models";
import { formatCurrency } from "@/lib/format";
import { ConfigError } from "@/lib/pricing/errors";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
  const [editingAddon, setEditingAddon] = useState<PricingAddon | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  function openNewAddon() {
    setEditingAddon(null);
    setSheetOpen(true);
  }

  function openEditAddon(addon: PricingAddon) {
    setEditingAddon(addon);
    setSheetOpen(true);
  }

  function upsertAddon(addon: PricingAddon) {
    setConfig((current) => {
      const exists = current.addons.some((item) => item.id === addon.id);
      return {
        ...current,
        addons: exists
          ? current.addons.map((item) => (item.id === addon.id ? addon : item))
          : [...current.addons, addon]
      };
    });
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
          </div>
          <Button type="button" variant="outline" size="sm" onClick={openNewAddon}>
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
                  <TableRow
                    key={addon.id}
                    className={cn(!addon.isEnabled && "text-muted-foreground")}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        {addon.title}
                        {!addon.isEnabled ? (
                          <Badge variant="secondary" className="text-xs">
                            Disabled
                          </Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(addon.price)}</TableCell>
                    <TableCell>{formatAddonTripTypes(addon)}</TableCell>
                    <TableCell>{formatAddonVehicleClasses(addon, vehicleClasses)}</TableCell>
                    <TableCell>{addon.isEnabled ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditAddon(addon)}>
                          <PencilIcon className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddonEditSheet
        addon={editingAddon}
        vehicleClasses={vehicleClasses}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSave={upsertAddon}
        onDelete={removeAddon}
      />

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : configured ? "Save pricing" : "Initialize pricing"}
        </Button>
      </div>
    </div>
  );
}
