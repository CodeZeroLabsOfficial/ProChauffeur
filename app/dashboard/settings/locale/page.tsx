"use client";

import { useEffect, useState } from "react";
import { PencilIcon } from "lucide-react";
import { toast } from "sonner";

import { LocaleEditSheet } from "@/app/dashboard/settings/locale/locale-edit-sheet";
import { fetchOperatorLocale } from "@/lib/services/firebase-service";
import {
  buildInitialOperatorLocale,
  COMMON_CURRENCIES,
  COMMON_LANGUAGES,
  COMMON_TIMEZONES,
  distanceUnitTitle,
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

export default function LocalePage() {
  const [value, setValue] = useState<OperatorLocale>(buildInitialOperatorLocale());
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    fetchOperatorLocale()
      .then((locale) => {
        setValue(locale);
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

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Regional preferences</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <PencilIcon /> Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {!configured ? (
            <p className="text-muted-foreground text-sm">
              Locale not configured — click Edit to set up.
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailField
              label="Language"
              value={labelForOption(COMMON_LANGUAGES, value.locale)}
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

      <LocaleEditSheet
        locale={value}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={(locale) => {
          setValue(locale);
          setConfigured(true);
        }}
      />
    </>
  );
}
