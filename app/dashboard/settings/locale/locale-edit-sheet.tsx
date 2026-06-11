"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { saveOperatorLocale } from "@/lib/services/firebase-service";
import {
  DISTANCE_UNITS,
  TAX_DISPLAY_MODES,
  distanceUnitTitle,
  taxDisplayModeTitle,
  type OperatorLocale
} from "@/lib/models";
import { Button } from "@/components/ui/button";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

export function LocaleEditSheet({
  locale,
  configured,
  open,
  onOpenChange,
  onSaved
}: {
  locale: OperatorLocale;
  configured: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (locale: OperatorLocale) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [distanceUnit, setDistanceUnit] = useState<OperatorLocale["distanceUnit"]>(locale.distanceUnit);
  const [taxDisplayMode, setTaxDisplayMode] = useState<OperatorLocale["taxDisplayMode"]>(
    locale.taxDisplayMode
  );
  const [showTaxOnQuotes, setShowTaxOnQuotes] = useState(locale.showTaxOnQuotes);

  useEffect(() => {
    if (!open) return;
    setFormKey((n) => n + 1);
    setDistanceUnit(locale.distanceUnit);
    setTaxDisplayMode(locale.taxDisplayMode);
    setShowTaxOnQuotes(locale.showTaxOnQuotes);
  }, [open, locale]);

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
      onSaved(data);
      toast.success("Locale preferences saved.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save locale preferences.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit locale</SheetTitle>
          <SheetDescription>
            Set regional and tax preferences used for pricing, quotes, and formatting.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-4" key={formKey}>
          <div className="space-y-2">
            <Label htmlFor="locale">Locale</Label>
            <Input id="locale" name="locale" required defaultValue={locale.locale} placeholder="en-AU" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency code</Label>
            <Input
              id="currency"
              name="currency"
              required
              defaultValue={locale.currency}
              placeholder="AUD"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">IANA time zone</Label>
            <Input
              id="timezone"
              name="timezone"
              required
              defaultValue={locale.timezone}
              placeholder="Australia/Sydney"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="distanceUnit">Distance unit</Label>
            <Select
              value={distanceUnit}
              onValueChange={(v) => setDistanceUnit(v as OperatorLocale["distanceUnit"])}>
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
                defaultValue={(locale.defaultTaxRate * 100).toString()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxName">Tax name</Label>
              <Input id="taxName" name="taxName" required defaultValue={locale.taxName} />
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
          <SheetFooter className="px-0">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : configured ? "Save changes" : "Initialize locale"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
