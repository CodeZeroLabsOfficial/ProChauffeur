"use client";

import { useState } from "react";
import { toast } from "sonner";

import { saveSettingDoc } from "@/lib/services/firebase-service";
import { AppSettingsDocs } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

export type Integrations = { stripePublishableKey?: string; webhookUrl?: string };

export function StripeConnectSheet({
  config,
  open,
  onOpenChange,
  onSaved
}: {
  config: Integrations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (config: Integrations) => void;
}) {
  const [saving, setSaving] = useState(false);

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
      onSaved(data);
      onOpenChange(false);
      toast.success("Stripe settings saved.");
    } catch {
      toast.error("Could not save Stripe settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Connect Stripe</SheetTitle>
          <SheetDescription>
            Add your Stripe publishable key and webhook URL to accept online payments.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-4" key={config.stripePublishableKey}>
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
          <SheetFooter className="px-0">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
