"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { NumberStepper } from "@/components/number-stepper";
import { saveOperatorLocale } from "@/lib/services/firebase-service";
import {
  COMMON_CURRENCIES,
  COMMON_LANGUAGES,
  COMMON_TIMEZONES,
  DISTANCE_UNITS,
  DRIVER_LICENCE_COUNTRY_PRESETS,
  TAX_DISPLAY_MODES,
  distanceUnitTitle,
  optionsWithCurrent,
  taxDisplayModeTitle,
  type DistanceUnit,
  type OperatorLocale,
  type TaxDisplayMode
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

type LocaleFormState = {
  language: string;
  currency: string;
  timezone: string;
  distanceUnit: string;
  defaultTaxRatePct: number;
  taxDisplayName: string;
  taxDisplayMode: string;
  showTaxOnQuotes: boolean;
  driverLicenceCountry: string;
};

function emptyFormState(): LocaleFormState {
  return {
    language: "",
    currency: "",
    timezone: "",
    distanceUnit: "",
    defaultTaxRatePct: 0,
    taxDisplayName: "",
    taxDisplayMode: "",
    showTaxOnQuotes: false,
    driverLicenceCountry: ""
  };
}

function localeFormState(locale: OperatorLocale | null): LocaleFormState {
  if (!locale) return emptyFormState();
  return {
    language: locale.locale,
    currency: locale.currency,
    timezone: locale.timezone,
    distanceUnit: locale.distanceUnit,
    defaultTaxRatePct: locale.defaultTaxRate * 100,
    taxDisplayName: locale.taxName,
    taxDisplayMode: locale.taxDisplayMode,
    showTaxOnQuotes: locale.showTaxOnQuotes,
    driverLicenceCountry: locale.driverLicenceCountry
  };
}

export function LocaleEditSheet({
  branchId,
  locale,
  open,
  onOpenChange,
  onSaved
}: {
  branchId: string;
  locale: OperatorLocale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (locale: OperatorLocale) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState("");
  const [currency, setCurrency] = useState("");
  const [timezone, setTimezone] = useState("");
  const [distanceUnit, setDistanceUnit] = useState("");
  const [defaultTaxRatePct, setDefaultTaxRatePct] = useState(0);
  const [taxDisplayName, setTaxDisplayName] = useState("");
  const [taxDisplayMode, setTaxDisplayMode] = useState("");
  const [showTaxOnQuotes, setShowTaxOnQuotes] = useState(false);
  const [driverLicenceCountry, setDriverLicenceCountry] = useState("");

  useEffect(() => {
    if (!open) return;
    const next = localeFormState(locale);
    setLanguage(next.language);
    setCurrency(next.currency);
    setTimezone(next.timezone);
    setDistanceUnit(next.distanceUnit);
    setDefaultTaxRatePct(next.defaultTaxRatePct);
    setTaxDisplayName(next.taxDisplayName);
    setTaxDisplayMode(next.taxDisplayMode);
    setShowTaxOnQuotes(next.showTaxOnQuotes);
    setDriverLicenceCountry(next.driverLicenceCountry);
  }, [open, locale]);

  const languageOptions = useMemo(() => optionsWithCurrent(COMMON_LANGUAGES, language), [language]);
  const currencyOptions = useMemo(() => optionsWithCurrent(COMMON_CURRENCIES, currency), [currency]);
  const timezoneOptions = useMemo(() => optionsWithCurrent(COMMON_TIMEZONES, timezone), [timezone]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !language.trim() ||
      !currency.trim() ||
      !timezone.trim() ||
      !taxDisplayName.trim() ||
      !driverLicenceCountry.trim() ||
      !DISTANCE_UNITS.includes(distanceUnit as DistanceUnit) ||
      !TAX_DISPLAY_MODES.includes(taxDisplayMode as TaxDisplayMode)
    ) {
      toast.error("Complete all required locale fields.");
      return;
    }

    const data: OperatorLocale = {
      locale: language.trim(),
      currency: currency.trim().toUpperCase(),
      timezone: timezone.trim(),
      distanceUnit: distanceUnit as DistanceUnit,
      defaultTaxRate: defaultTaxRatePct / 100,
      taxName: taxDisplayName.trim(),
      taxDisplayMode: taxDisplayMode as TaxDisplayMode,
      showTaxOnQuotes,
      driverLicenceCountry
    };

    setSaving(true);
    try {
      await saveOperatorLocale(data, branchId);
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
          <SheetTitle>{locale ? "Edit locale" : "Configure locale"}</SheetTitle>
          <SheetDescription>
            Set regional and tax preferences for this location. Quotes cannot run until locale is
            saved.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language || undefined} onValueChange={setLanguage} disabled={saving}>
                <SelectTrigger id="language" className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="driverLicenceCountry">Country</Label>
              <Select
                value={driverLicenceCountry || undefined}
                onValueChange={setDriverLicenceCountry}
                disabled={saving}>
                <SelectTrigger id="driverLicenceCountry" className="w-full">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {DRIVER_LICENCE_COUNTRY_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Time zone</Label>
              <Select value={timezone || undefined} onValueChange={setTimezone} disabled={saving}>
                <SelectTrigger id="timezone" className="w-full">
                  <SelectValue placeholder="Select time zone" />
                </SelectTrigger>
                <SelectContent>
                  {timezoneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency || undefined} onValueChange={setCurrency} disabled={saving}>
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="distanceUnit">Distance unit</Label>
              <Select
                value={distanceUnit || undefined}
                onValueChange={setDistanceUnit}
                disabled={saving}>
                <SelectTrigger id="distanceUnit" className="w-full">
                  <SelectValue placeholder="Select unit" />
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
            <NumberStepper
              id="defaultTaxRatePct"
              label="Default tax rate (%)"
              value={defaultTaxRatePct}
              onChange={setDefaultTaxRatePct}
              min={0}
              max={50}
              step={0.01}
              decimals={2}
              disabled={saving}
            />
            <div className="space-y-2">
              <Label htmlFor="taxDisplayName">Tax rate display name</Label>
              <Input
                id="taxDisplayName"
                value={taxDisplayName}
                onChange={(e) => setTaxDisplayName(e.target.value)}
                placeholder="e.g. GST or VAT"
                required
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxDisplayMode">Tax display mode</Label>
              <Select
                value={taxDisplayMode || undefined}
                onValueChange={setTaxDisplayMode}
                disabled={saving}>
                <SelectTrigger id="taxDisplayMode" className="w-full">
                  <SelectValue placeholder="Select mode" />
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
              disabled={saving}
            />
          </div>
          <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 px-0 sm:justify-between">
            <span />
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
