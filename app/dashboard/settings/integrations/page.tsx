"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2Icon, CircleIcon, PlusIcon } from "lucide-react";

import { fetchSettingDoc } from "@/lib/services/firebase-service";
import { AppSettingsDocs } from "@/lib/models";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { StripeConnectSheet, type Integrations } from "./stripe-connect-sheet";

function envPresent(value: string | undefined): boolean {
  return Boolean(value && value.length > 0);
}

export default function IntegrationsPage() {
  const [config, setConfig] = useState<Integrations>({});
  const [loading, setLoading] = useState(true);
  const [stripeSheetOpen, setStripeSheetOpen] = useState(false);

  useEffect(() => {
    fetchSettingDoc<Integrations>(AppSettingsDocs.integrations)
      .then((c) => c && setConfig(c))
      .finally(() => setLoading(false));
  }, []);

  const stripeConnected = envPresent(config.stripePublishableKey);

  const connections = useMemo(
    () => [
      {
        name: "Firebase",
        detail: "Authentication, Firestore & Realtime Database",
        connected: envPresent(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
      },
      {
        name: "Mapbox",
        detail: "Dispatch live map",
        connected: envPresent(process.env.NEXT_PUBLIC_MAPBOX_TOKEN)
      },
      {
        name: "Stripe",
        detail: "Online payments & billing",
        connected: stripeConnected
      }
    ],
    [stripeConnected]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            connections.map((c) => (
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
                {c.connected ? (
                  <Badge variant="default">Connected</Badge>
                ) : c.name === "Stripe" ? (
                  <Button size="sm" variant="outline" onClick={() => setStripeSheetOpen(true)}>
                    <PlusIcon /> Add
                  </Button>
                ) : (
                  <Badge variant="secondary">Not configured</Badge>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <StripeConnectSheet
        config={config}
        open={stripeSheetOpen}
        onOpenChange={setStripeSheetOpen}
        onSaved={setConfig}
      />
    </div>
  );
}
