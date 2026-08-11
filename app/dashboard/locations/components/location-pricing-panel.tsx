"use client";

import { useEffect, useState } from "react";
import { InfoIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  AddonEditSheet,
  formatAddonTripTypes,
  formatAddonVehicleClasses
} from "@/app/dashboard/locations/components/addon-edit-sheet";
import { useVehicleClasses } from "@/hooks/use-collections";
import {
  fetchPricingConfiguration,
  savePricingConfiguration
} from "@/lib/services/firebase-service";
import {
  QUOTE_ROUNDING,
  buildInitialPricingConfig,
  preparePricingConfigForSave,
  quoteRoundingTitle,
  type PricingAddon,
  type PricingConfig,
  type QuoteRounding
} from "@/lib/models";
import { formatCurrency } from "@/lib/format";
import { ConfigError } from "@/lib/pricing/errors";
import { cn } from "@/lib/utils";
import { NumberStepper } from "@/components/number-stepper";
import { SettingsSection } from "@/components/settings-section";
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
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const MINIMUM_FARE_MAX = 100_000;

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

export function LocationPricingPanel({
  branchId,
  nestedSheet = false
}: {
  branchId: string;
  nestedSheet?: boolean;
}) {
  const { vehicleClasses } = useVehicleClasses();
  const [config, setConfig] = useState<PricingConfig>(buildInitialPricingConfig());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [editingAddon, setEditingAddon] = useState<PricingAddon | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PricingAddon | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchPricingConfiguration(branchId)
      .then((pricing) => {
        setConfig(pricing);
        setConfigured(true);
      })
      .catch((err) => {
        if (!(err instanceof ConfigError)) {
          toast.error("Could not load pricing.");
        }
        setConfigured(false);
      })
      .finally(() => setLoading(false));
  }, [branchId]);

  function openNewAddon() {
    setEditingAddon(null);
    setSheetOpen(true);
  }

  function openEditAddon(addon: PricingAddon) {
    setEditingAddon(addon);
    setSheetOpen(true);
  }

  function upsertAddon(addon: PricingAddon) {
    setConfig((current) => {
      const exists = current.addons.some((item) => item.id === addon.id);
      return {
        ...current,
        addons: exists
          ? current.addons.map((item) => (item.id === addon.id ? addon : item))
          : [...current.addons, addon]
      };
    });
  }

  function removeAddon(id: string) {
    setConfig((current) => ({
      ...current,
      addons: current.addons.filter((addon) => addon.id !== id)
    }));
  }

  function confirmDeleteAddon(e: React.MouseEvent) {
    e.preventDefault();
    if (!pendingDelete) return;
    removeAddon(pendingDelete.id);
    if (editingAddon?.id === pendingDelete.id) {
      setSheetOpen(false);
      setEditingAddon(null);
    }
    setPendingDelete(null);
    toast.success("Add-on removed.");
  }

  async function save() {
    setSaving(true);
    try {
      const payload = preparePricingConfigForSave(config);
      await savePricingConfiguration(payload, branchId);
      setConfig(payload);
      setConfigured(true);
      toast.success("Pricing saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save pricing.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading pricing…</p>;

  const saveFooter = (
    <Button type="button" onClick={() => void save()} disabled={saving}>
      {saving ? "Saving…" : configured ? "Save pricing" : "Initialize pricing"}
    </Button>
  );

  return (
    <div className="space-y-4">
      {!configured ? (
        <Card>
          <CardHeader>
            <CardTitle>Pricing not configured</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Set add-ons and rules for this location. Transfer and hourly rates are configured per
              vehicle class.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfig(buildInitialPricingConfig())}>
              Reset template
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <SettingsSection
        title="Minimum fare"
        description="Never quote a transfer below this amount. If the class rate comes in lower, we raise the fare to this floor.">
        <TooltipProvider>
          <div className="max-w-sm">
            <NumberStepper
              id="pricing-minimum-fare"
              label="Minimum fare"
              labelExtra={
                <FieldInfoTooltip label="minimum fare">
                  Applies to transfer trips only. Each vehicle class can also have its own min base
                  rate — whichever is higher wins. Use this when you want one company minimum across
                  all classes without editing every class.
                </FieldInfoTooltip>
              }
              value={config.minimumFare}
              onChange={(value) => setConfig((current) => ({ ...current, minimumFare: value }))}
              min={0}
              max={MINIMUM_FARE_MAX}
              step={1}
              disabled={saving}
            />
          </div>
        </TooltipProvider>
      </SettingsSection>

      <SettingsSection
        title="Quote rounding"
        description="How the final taxed quote total is rounded for display.">
        <TooltipProvider>
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="pricing-quote-rounding">Quote rounding</Label>
              <FieldInfoTooltip label="quote rounding">
                Applied after tax to the customer-facing quote total. None keeps cent precision;
                nearest dollar or half dollar cleans up the displayed fare.
              </FieldInfoTooltip>
            </div>
            <Select
              value={config.quoteRounding}
              onValueChange={(value) =>
                setConfig((current) => ({
                  ...current,
                  quoteRounding: value as QuoteRounding
                }))
              }
              disabled={saving}>
              <SelectTrigger id="pricing-quote-rounding" className="w-full max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUOTE_ROUNDING.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {quoteRoundingTitle[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TooltipProvider>
      </SettingsSection>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Add-ons</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={openNewAddon}>
            Add add-on
          </Button>
        </CardHeader>
        <CardContent>
          {config.addons.length === 0 ? (
            <p className="text-muted-foreground text-sm">No add-ons configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Trip types</TableHead>
                  <TableHead>Vehicle classes</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.addons.map((addon) => (
                  <TableRow
                    key={addon.id}
                    className={cn("cursor-pointer", !addon.isEnabled && "text-muted-foreground")}
                    onClick={() => openEditAddon(addon)}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        {addon.title}
                        {!addon.isEnabled ? (
                          <Badge variant="secondary" className="text-xs">
                            Disabled
                          </Badge>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(addon.price)}</TableCell>
                    <TableCell>{formatAddonTripTypes(addon)}</TableCell>
                    <TableCell>{formatAddonVehicleClasses(addon, vehicleClasses)}</TableCell>
                    <TableCell>{addon.isEnabled ? "Yes" : "No"}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setPendingDelete(addon)}>
                          <Trash2Icon className="size-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingDelete(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete add-on?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {pendingDelete?.title || "this add-on"} from the pricing draft. Save
              pricing to persist the change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={(e) => confirmDeleteAddon(e)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddonEditSheet
        addon={editingAddon}
        vehicleClasses={vehicleClasses}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSave={upsertAddon}
        nested={nestedSheet}
      />

      <div className="flex justify-end">{saveFooter}</div>
    </div>
  );
}
