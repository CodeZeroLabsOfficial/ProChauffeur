"use client";

import { useState } from "react";
import { toast } from "sonner";

import { saveSettingDoc } from "@/lib/services/firebase-service";
import { AppSettingsDocs } from "@/lib/models";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
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
  connected,
  open,
  onOpenChange,
  onSaved
}: {
  config: Integrations;
  connected: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (config: Integrations) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

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

  async function disconnectStripe() {
    setDisconnecting(true);
    try {
      const cleared: Integrations = { stripePublishableKey: "", webhookUrl: "" };
      await saveSettingDoc(AppSettingsDocs.integrations, cleared);
      onSaved(cleared);
      setDisconnectOpen(false);
      onOpenChange(false);
      toast.success("Stripe disconnected.");
    } catch {
      toast.error("Could not disconnect Stripe.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{connected ? "Stripe integration" : "Connect Stripe"}</SheetTitle>
            <SheetDescription>
              {connected
                ? "Update your Stripe publishable key and webhook URL, or disconnect the integration."
                : "Add your Stripe publishable key and webhook URL to accept online payments."}
            </SheetDescription>
          </SheetHeader>
          <form
            onSubmit={onSubmit}
            className="space-y-4 px-4"
            key={`${config.stripePublishableKey ?? ""}-${config.webhookUrl ?? ""}`}
          >
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
            <SheetFooter className="flex-row justify-between px-0 sm:justify-between">
              {connected ? (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={saving || disconnecting}
                  onClick={() => setDisconnectOpen(true)}
                >
                  Disconnect
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={saving || disconnecting}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Stripe?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your Stripe publishable key and webhook URL from ProChauffeur. Online payments will no
              longer work until you connect again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={disconnecting}
              onClick={(e) => {
                e.preventDefault();
                void disconnectStripe();
              }}
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
