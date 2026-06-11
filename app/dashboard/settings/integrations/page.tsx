"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2Icon, CircleIcon, PlusIcon } from "lucide-react";

import { fetchSettingDoc } from "@/lib/services/firebase-service";
import { AppSettingsDocs } from "@/lib/models";
import { cn } from "@/lib/utils";
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
            connections.map((c) => {
              const isStripe = c.name === "Stripe";
              const stripeRowClickable = isStripe && c.connected;

              return (
                <div
                  key={c.name}
                  role={stripeRowClickable ? "button" : undefined}
                  tabIndex={stripeRowClickable ? 0 : undefined}
                  onClick={stripeRowClickable ? () => setStripeSheetOpen(true) : undefined}
                  onKeyDown={
                    stripeRowClickable
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setStripeSheetOpen(true);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-4",
                    stripeRowClickable && "cursor-pointer transition-colors hover:bg-muted/50"
                  )}
                >
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
                  ) : isStripe ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStripeSheetOpen(true);
                      }}
                    >
                      <PlusIcon /> Add
                    </Button>
                  ) : (
                    <Badge variant="secondary">Not configured</Badge>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <StripeConnectSheet
        config={config}
        connected={stripeConnected}
        open={stripeSheetOpen}
        onOpenChange={setStripeSheetOpen}
        onSaved={setConfig}
      />
    </div>
  );
}
