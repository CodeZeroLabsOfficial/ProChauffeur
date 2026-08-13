"use client";

import { useEffect, useState } from "react";
import { PencilIcon } from "lucide-react";
import { toast } from "sonner";

import { LocaleEditSheet } from "@/app/dashboard/locations/components/locale-edit-sheet";
import { fetchOperatorLocale } from "@/lib/services/firebase-service";
import {
  COMMON_CURRENCIES,
  COMMON_LANGUAGES,
  COMMON_TIMEZONES,
  distanceUnitTitle,
  driverLicenceCountryLabel,
  labelForOption,
  taxDisplayModeTitle,
  type OperatorLocale
} from "@/lib/models";
import { ConfigError } from "@/lib/pricing/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

export function LocationLocalePanel({ branchId }: { branchId: string }) {
  const [value, setValue] = useState<OperatorLocale | null>(null);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchOperatorLocale(branchId)
      .then((locale) => {
        setValue(locale);
        setConfigured(true);
      })
      .catch((err) => {
        if (!(err instanceof ConfigError)) {
          toast.error("Could not load locale settings.");
        }
        setValue(null);
        setConfigured(false);
      })
      .finally(() => setLoading(false));
  }, [branchId]);

  if (loading) return <p className="text-muted-foreground text-sm">Loading locale…</p>;

  return (
    <>
      {!configured || !value ? (
        <Card>
          <CardHeader>
            <CardTitle>Locale not configured</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Set language, currency, time zone, and tax for this location. Quotes cannot run until
              locale is saved.
            </p>
            <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
              Configure locale
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Regional preferences</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <PencilIcon /> Edit
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Language" value={labelForOption(COMMON_LANGUAGES, value.locale)} />
              <DetailField
                label="Country"
                value={driverLicenceCountryLabel(value.driverLicenceCountry)}
              />
              <DetailField
                label="Currency"
                value={labelForOption(COMMON_CURRENCIES, value.currency)}
              />
              <DetailField
                label="Time zone"
                value={labelForOption(COMMON_TIMEZONES, value.timezone)}
              />
              <DetailField label="Distance unit" value={distanceUnitTitle[value.distanceUnit]} />
              <DetailField
                label="Default tax rate"
                value={`${(value.defaultTaxRate * 100).toFixed(2)}%`}
              />
              <DetailField label="Tax rate display name" value={value.taxName} />
              <DetailField
                label="Tax display mode"
                value={taxDisplayModeTitle[value.taxDisplayMode]}
              />
              <DetailField
                label="Show tax on quotes"
                value={value.showTaxOnQuotes ? "Yes" : "No"}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <LocaleEditSheet
        branchId={branchId}
        locale={value}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={(next) => {
          setValue(next);
          setConfigured(true);
        }}
      />
    </>
  );
}
