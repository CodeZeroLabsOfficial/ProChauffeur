"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { fetchOperatorLocale, saveOperatorLocale } from "@/lib/services/firebase-service";
import type { OperatorLocale } from "@/lib/models";
import { appConfig } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LocalePage() {
  const [value, setValue] = useState<OperatorLocale>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOperatorLocale()
      .then(setValue)
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: OperatorLocale = {
      locale: String(form.get("locale") ?? "").trim() || null,
      currency: String(form.get("currency") ?? "").trim() || null,
      timezone: String(form.get("timezone") ?? "").trim() || null
    };
    setSaving(true);
    try {
      await saveOperatorLocale(data);
      setValue(data);
      toast.success("Locale preferences saved.");
    } catch {
      toast.error("Could not save locale preferences.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Active defaults</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-muted-foreground">Locale</p>
            <p className="font-medium">{appConfig.locale}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Currency</p>
            <p className="font-medium">{appConfig.currency}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Time zone</p>
            <p className="font-medium">{appConfig.timezone}</p>
          </div>
          <p className="text-muted-foreground sm:col-span-3 text-xs">
            These are sourced from environment variables at deploy time. Overrides below are stored in
            operator/locale.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Overrides</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="max-w-lg space-y-4" key={value.locale ?? ""}>
            <div className="space-y-2">
              <Label htmlFor="locale">Locale</Label>
              <Input
                id="locale"
                name="locale"
                defaultValue={value.locale ?? ""}
                placeholder={appConfig.locale}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency code</Label>
              <Input
                id="currency"
                name="currency"
                defaultValue={value.currency ?? ""}
                placeholder={appConfig.currency}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Time zone</Label>
              <Input
                id="timezone"
                name="timezone"
                defaultValue={value.timezone ?? ""}
                placeholder={appConfig.timezone}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save overrides"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
