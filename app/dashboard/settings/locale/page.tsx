"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { fetchOperatorLocale, saveOperatorLocale } from "@/lib/services/firebase-service";
import {
  DISTANCE_UNITS,
  TAX_DISPLAY_MODES,
  buildInitialOperatorLocale,
  distanceUnitTitle,
  taxDisplayModeTitle,
  type OperatorLocale
} from "@/lib/models";
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

export default function LocalePage() {
  const [value, setValue] = useState<OperatorLocale>(buildInitialOperatorLocale());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [distanceUnit, setDistanceUnit] = useState<OperatorLocale["distanceUnit"]>("km");
  const [taxDisplayMode, setTaxDisplayMode] = useState<OperatorLocale["taxDisplayMode"]>("exclusive");
  const [showTaxOnQuotes, setShowTaxOnQuotes] = useState(false);

  useEffect(() => {
    fetchOperatorLocale()
      .then((locale) => {
        setValue(locale);
        setDistanceUnit(locale.distanceUnit);
        setTaxDisplayMode(locale.taxDisplayMode);
        setShowTaxOnQuotes(locale.showTaxOnQuotes);
        setConfigured(true);
      })
      .catch((err) => {
        if (!(err instanceof ConfigError)) {
          toast.error("Could not load locale settings.");
        }
        setConfigured(false);
      })
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: OperatorLocale = {
      locale: String(form.get("locale") ?? "").trim(),
      currency: String(form.get("currency") ?? "").trim().toUpperCase(),
      timezone: String(form.get("timezone") ?? "").trim(),
      distanceUnit,
      defaultTaxRate: (parseFloat(String(form.get("defaultTaxRatePct") ?? "0")) || 0) / 100,
      taxName: String(form.get("taxName") ?? "").trim(),
      taxDisplayMode,
      showTaxOnQuotes
    };

    if (!data.locale || !data.currency || !data.timezone || !data.taxName) {
      toast.error("Complete all required locale fields.");
      return;
    }

    setSaving(true);
    try {
      await saveOperatorLocale(data);
      setValue(data);
      setConfigured(true);
      toast.success("Locale preferences saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save locale preferences.");
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
            <CardTitle>Locale not configured</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Set your regional preferences below before creating bookings with automated pricing.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Regional preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="max-w-lg space-y-4" key={configured ? "configured" : "new"}>
            <div className="space-y-2">
              <Label htmlFor="locale">Locale</Label>
              <Input id="locale" name="locale" required defaultValue={value.locale} placeholder="en-AU" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency code</Label>
              <Input
                id="currency"
                name="currency"
                required
                defaultValue={value.currency}
                placeholder="AUD"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">IANA time zone</Label>
              <Input
                id="timezone"
                name="timezone"
                required
                defaultValue={value.timezone}
                placeholder="Australia/Sydney"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="distanceUnit">Distance unit</Label>
              <Select value={distanceUnit} onValueChange={(v) => setDistanceUnit(v as OperatorLocale["distanceUnit"])}>
                <SelectTrigger id="distanceUnit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISTANCE_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {distanceUnitTitle[unit]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="defaultTaxRatePct">Default tax rate (%)</Label>
                <Input
                  id="defaultTaxRatePct"
                  name="defaultTaxRatePct"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={(value.defaultTaxRate * 100).toString()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxName">Tax name</Label>
                <Input id="taxName" name="taxName" required defaultValue={value.taxName} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxDisplayMode">Tax display mode</Label>
              <Select
                value={taxDisplayMode}
                onValueChange={(v) => setTaxDisplayMode(v as OperatorLocale["taxDisplayMode"])}>
                <SelectTrigger id="taxDisplayMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_DISPLAY_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {taxDisplayModeTitle[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="showTaxOnQuotes">Show tax on passenger quotes</Label>
                <p className="text-muted-foreground text-xs">
                  When off, passengers see a single total only.
                </p>
              </div>
              <Switch
                id="showTaxOnQuotes"
                checked={showTaxOnQuotes}
                onCheckedChange={setShowTaxOnQuotes}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : configured ? "Save locale" : "Initialize locale"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
