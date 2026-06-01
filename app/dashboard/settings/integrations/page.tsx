"use client";

import { useEffect, useState } from "react";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import { toast } from "sonner";

import { fetchSettingDoc, saveSettingDoc } from "@/lib/services/firebase-service";
import { AppSettingsDocs } from "@/lib/models";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Integrations = { stripePublishableKey?: string; webhookUrl?: string };

function envPresent(value: string | undefined): boolean {
  return Boolean(value && value.length > 0);
}

export default function IntegrationsPage() {
  const [config, setConfig] = useState<Integrations>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettingDoc<Integrations>(AppSettingsDocs.integrations)
      .then((c) => c && setConfig(c))
      .finally(() => setLoading(false));
  }, []);

  const connections = [
    {
      name: "Firebase",
      detail: "Authentication, Firestore & Realtime Database",
      connected: envPresent(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
    },
    {
      name: "Mapbox",
      detail: "Dispatch live map",
      connected: envPresent(process.env.NEXT_PUBLIC_MAPBOX_TOKEN)
    }
  ];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data: Integrations = {
      stripePublishableKey: String(form.get("stripePublishableKey") ?? "").trim(),
      webhookUrl: String(form.get("webhookUrl") ?? "").trim()
    };
    setSaving(true);
    try {
      await saveSettingDoc(AppSettingsDocs.integrations, data);
      setConfig(data);
      toast.success("Integration settings saved.");
    } catch {
      toast.error("Could not save integration settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {connections.map((c) => (
            <div key={c.name} className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                {c.connected ? (
                  <CheckCircle2Icon className="size-5 text-green-500" />
                ) : (
                  <CircleIcon className="text-muted-foreground size-5" />
                )}
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-muted-foreground text-xs">{c.detail}</p>
                </div>
              </div>
              <Badge variant={c.connected ? "default" : "secondary"}>
                {c.connected ? "Connected" : "Not configured"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments & webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <form onSubmit={onSubmit} className="max-w-lg space-y-4" key={config.stripePublishableKey}>
              <div className="space-y-2">
                <Label htmlFor="stripePublishableKey">Stripe publishable key</Label>
                <Input
                  id="stripePublishableKey"
                  name="stripePublishableKey"
                  defaultValue={config.stripePublishableKey}
                  placeholder="pk_live_…"
                />
                <p className="text-muted-foreground text-xs">
                  Only the publishable key. Keep secret keys in server-side environment variables.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Notification webhook URL</Label>
                <Input id="webhookUrl" name="webhookUrl" defaultValue={config.webhookUrl} placeholder="https://…" />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save integrations"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
