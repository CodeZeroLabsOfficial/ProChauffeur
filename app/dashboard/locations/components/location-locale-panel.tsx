"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { InfoIcon } from "lucide-react";
import { toast } from "sonner";

import { NumberStepper } from "@/components/number-stepper";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  COMMON_CURRENCIES,
  COMMON_LANGUAGES,
  COMMON_TAX_NAMES,
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
import { ConfigError } from "@/lib/pricing/errors";
import { fetchOperatorLocale, saveOperatorLocale } from "@/lib/services/firebase-service";

type LocaleDraft = {
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

function emptyDraft(): LocaleDraft {
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

function draftFromLocale(locale: OperatorLocale): LocaleDraft {
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

function isDraftComplete(draft: LocaleDraft): boolean {
  return (
    draft.language.trim() !== "" &&
    draft.currency.trim() !== "" &&
    draft.timezone.trim() !== "" &&
    draft.taxDisplayName.trim() !== "" &&
    draft.driverLicenceCountry.trim() !== "" &&
    DISTANCE_UNITS.includes(draft.distanceUnit as DistanceUnit) &&
    TAX_DISPLAY_MODES.includes(draft.taxDisplayMode as TaxDisplayMode)
  );
}

function FieldInfoTooltip({ label, children }: { label: string; children: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="hover:bg-accent rounded-full p-1"
          aria-label={`About ${label}`}>
          <InfoIcon className="text-muted-foreground size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p>{children}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function SelectField({
  id,
  label,
  tooltip,
  value,
  placeholder,
  disabled,
  onValueChange,
  children
}: {
  id: string;
  label: string;
  tooltip: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  onValueChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Label htmlFor={id}>{label}</Label>
        <FieldInfoTooltip label={label}>{tooltip}</FieldInfoTooltip>
      </div>
      <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger id={id} className="w-full max-w-sm">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}

export function LocationLocalePanel({ branchId }: { branchId: string }) {
  const [draft, setDraft] = useState<LocaleDraft>(emptyDraft);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchOperatorLocale(branchId)
      .then((locale) => {
        setDraft(draftFromLocale(locale));
        setConfigured(true);
      })
      .catch((err) => {
        if (!(err instanceof ConfigError)) {
          toast.error("Could not load locale settings.");
        }
        setDraft(emptyDraft());
        setConfigured(false);
      })
      .finally(() => setLoading(false));
  }, [branchId]);

  const languageOptions = useMemo(
    () => optionsWithCurrent(COMMON_LANGUAGES, draft.language),
    [draft.language]
  );
  const currencyOptions = useMemo(
    () => optionsWithCurrent(COMMON_CURRENCIES, draft.currency),
    [draft.currency]
  );
  const timezoneOptions = useMemo(
    () => optionsWithCurrent(COMMON_TIMEZONES, draft.timezone),
    [draft.timezone]
  );
  const taxNameOptions = useMemo(
    () => optionsWithCurrent(COMMON_TAX_NAMES, draft.taxDisplayName),
    [draft.taxDisplayName]
  );

  const canSave = isDraftComplete(draft);

  function update<K extends keyof LocaleDraft>(key: K, value: LocaleDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    if (!isDraftComplete(draft)) {
      toast.error("Complete all required locale fields.");
      return;
    }

    const data: OperatorLocale = {
      locale: draft.language.trim(),
      currency: draft.currency.trim().toUpperCase(),
      timezone: draft.timezone.trim(),
      distanceUnit: draft.distanceUnit as DistanceUnit,
      defaultTaxRate: draft.defaultTaxRatePct / 100,
      taxName: draft.taxDisplayName.trim(),
      taxDisplayMode: draft.taxDisplayMode as TaxDisplayMode,
      showTaxOnQuotes: draft.showTaxOnQuotes,
      driverLicenceCountry: draft.driverLicenceCountry
    };

    setSaving(true);
    try {
      await saveOperatorLocale(data, branchId);
      setDraft(draftFromLocale(data));
      setConfigured(true);
      toast.success("Locale saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save locale.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading locale…</p>;

  const saveFooter = (
    <Button type="button" onClick={() => void save()} disabled={saving || !canSave}>
      {saving ? "Saving…" : configured ? "Save" : "Initialize locale"}
    </Button>
  );

  return (
    <div className="space-y-4">
      {!configured ? (
        <Card>
          <CardHeader>
            <CardTitle>Locale not configured</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-muted-foreground">
              Set region, currency, and tax for this location. Quotes cannot run until locale is
              saved.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <TooltipProvider>
        <SettingsSection
          title="Region"
          description="Set region-specific settings for this location.">
          <SelectField
            id="locale-country"
            label="Country"
            tooltip="The country this location operates in. Used for local compliance and regulations."
            value={draft.driverLicenceCountry}
            placeholder="Select country"
            disabled={saving}
            onValueChange={(value) => update("driverLicenceCountry", value)}>
            {DRIVER_LICENCE_COUNTRY_PRESETS.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectField>
          <SelectField
            id="locale-language"
            label="Language"
            tooltip="Language used on quotes and invoices for this location."
            value={draft.language}
            placeholder="Select language"
            disabled={saving}
            onValueChange={(value) => update("language", value)}>
            {languageOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectField>
          <SelectField
            id="locale-timezone"
            label="Time zone"
            tooltip="Pickup times, operating hours, and chauffeur schedules use this zone."
            value={draft.timezone}
            placeholder="Select time zone"
            disabled={saving}
            onValueChange={(value) => update("timezone", value)}>
            {timezoneOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectField>
          <SelectField
            id="locale-distance-unit"
            label="Distance unit"
            tooltip="Kilometres or miles on quotes and class rates."
            value={draft.distanceUnit}
            placeholder="Select unit"
            disabled={saving}
            onValueChange={(value) => update("distanceUnit", value)}>
            {DISTANCE_UNITS.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {distanceUnitTitle[unit]}
              </SelectItem>
            ))}
          </SelectField>
        </SettingsSection>

        <SettingsSection
          title="Currency and tax"
          description="Set currency and tax for quotes and charges."
          footer={saveFooter}>
          <SelectField
            id="locale-currency"
            label="Currency"
            tooltip="Currency on quotes, Apple Pay, and invoices for this location."
            value={draft.currency}
            placeholder="Select currency"
            disabled={saving}
            onValueChange={(value) => update("currency", value)}>
            {currencyOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectField>
          <SelectField
            id="locale-tax-name"
            label="Tax name"
            tooltip="Label on the tax line, e.g. GST or VAT."
            value={draft.taxDisplayName}
            placeholder="Select tax name"
            disabled={saving}
            onValueChange={(value) => update("taxDisplayName", value)}>
            {taxNameOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectField>
          <div className="max-w-sm">
            <NumberStepper
              id="locale-tax-rate"
              label="Default tax rate"
              labelExtra={
                <FieldInfoTooltip label="default tax rate">
                  Percent added to quotes. Enter 10 for 10%.
                </FieldInfoTooltip>
              }
              value={draft.defaultTaxRatePct}
              onChange={(value) => update("defaultTaxRatePct", value)}
              min={0}
              max={50}
              step={0.01}
              decimals={2}
              disabled={saving}
            />
          </div>
          <SelectField
            id="locale-tax-mode"
            label="Tax display mode"
            tooltip="Exclusive adds tax on top of class rates. Inclusive means those rates already include tax."
            value={draft.taxDisplayMode}
            placeholder="Select mode"
            disabled={saving}
            onValueChange={(value) => update("taxDisplayMode", value)}>
            {TAX_DISPLAY_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {taxDisplayModeTitle[mode]}
              </SelectItem>
            ))}
          </SelectField>
          <div className="flex max-w-sm items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <Label htmlFor="locale-show-tax">Show tax on quotes</Label>
                <FieldInfoTooltip label="show tax on quotes">
                  When off, passengers see one total. You still see the tax line internally.
                </FieldInfoTooltip>
              </div>
              <p className="text-muted-foreground text-xs">
                When off, passengers see a single total only.
              </p>
            </div>
            <Switch
              id="locale-show-tax"
              checked={draft.showTaxOnQuotes}
              onCheckedChange={(checked) => update("showTaxOnQuotes", checked)}
              disabled={saving}
            />
          </div>
        </SettingsSection>
      </TooltipProvider>
    </div>
  );
}
