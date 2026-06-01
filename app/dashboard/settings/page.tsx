"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { fetchSettingDoc, saveSettingDoc } from "@/lib/services/firebase-service";
import { AppSettingsDocs } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Branding = {
  portalName?: string;
  supportEmail?: string;
  primaryColorHex?: string;
  logoUrl?: string;
};

export default function BrandingPage() {
  const [branding, setBranding] = useState<Branding>({ portalName: "ProChauffeur" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettingDoc<Branding>(AppSettingsDocs.branding)
      .then((b) => b && setBranding((prev) => ({ ...prev, ...b })))
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: Branding = {
      portalName: String(form.get("portalName") ?? "").trim() || "ProChauffeur",
      supportEmail: String(form.get("supportEmail") ?? "").trim(),
      primaryColorHex: String(form.get("primaryColorHex") ?? "").trim(),
      logoUrl: String(form.get("logoUrl") ?? "").trim()
    };
    setSaving(true);
    try {
      await saveSettingDoc(AppSettingsDocs.branding, data);
      setBranding(data);
      toast.success("Branding saved.");
    } catch {
      toast.error("Could not save branding.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="max-w-lg space-y-4" key={branding.portalName}>
          <div className="space-y-2">
            <Label htmlFor="portalName">Portal name</Label>
            <Input id="portalName" name="portalName" defaultValue={branding.portalName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support email</Label>
            <Input
              id="supportEmail"
              name="supportEmail"
              type="email"
              defaultValue={branding.supportEmail}
              placeholder="support@prochauffeur.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primaryColorHex">Primary colour</Label>
            <div className="flex items-center gap-2">
              <Input
                id="primaryColorHex"
                name="primaryColorHex"
                defaultValue={branding.primaryColorHex}
                placeholder="#0f172a"
              />
              {branding.primaryColorHex && (
                <span
                  className="size-9 shrink-0 rounded-md border"
                  style={{ backgroundColor: branding.primaryColorHex }}
                />
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input id="logoUrl" name="logoUrl" defaultValue={branding.logoUrl} placeholder="https://…" />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save branding"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
