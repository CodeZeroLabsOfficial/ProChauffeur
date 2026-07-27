"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { NumberStepper } from "@/components/number-stepper";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useVehicleClasses } from "@/hooks/use-collections";
import {
  CORPORATE_RATE_MODES,
  corporateRateModeTitle,
  tripTypeTitle,
  type CorporateAccount,
  type CorporateFixedRateOverride,
  type CorporateRateMode,
  type TripType
} from "@/lib/models";
import { saveCorporateAccount } from "@/lib/services/firebase-service";

const BILLING_TRIP_TYPES: TripType[] = ["transfer", "hourly"];

function percentPointsFromAccount(account: CorporateAccount): number {
  if (account.rateMode !== "percentOff") return 10;
  return Math.max(0, Math.min(100, Math.round((account.percentOff ?? 0) * 100)));
}

function emptyRateOverride(): CorporateFixedRateOverride {
  return {
    id: crypto.randomUUID(),
    vehicleClassId: "",
    tripType: "transfer",
    transfer: null,
    hourly: null,
    fixedTransferRate: null
  };
}

export function AccountRatesTab({
  account,
  onSaved
}: {
  account: CorporateAccount;
  onSaved: (account: CorporateAccount) => void;
}) {
  const { vehicleClasses } = useVehicleClasses();
  const [draft, setDraft] = useState(account);
  const [percentPoints, setPercentPoints] = useState(() => percentPointsFromAccount(account));
  const [saving, setSaving] = useState(false);
  const [seedKey, setSeedKey] = useState(account.id + String(account.updatedAt.getTime()));

  const nextKey = account.id + String(account.updatedAt.getTime());
  if (nextKey !== seedKey) {
    setSeedKey(nextKey);
    setDraft(account);
    setPercentPoints(percentPointsFromAccount(account));
  }

  function updateOverride(id: string, patch: Partial<CorporateFixedRateOverride>) {
    setDraft((current) => ({
      ...current,
      fixedRates: current.fixedRates.map((row) => (row.id === id ? { ...row, ...patch } : row))
    }));
  }

  function removeOverride(id: string) {
    setDraft((current) => ({
      ...current,
      fixedRates: current.fixedRates.filter((row) => row.id !== id)
    }));
  }

  async function handleSave() {
    const fixedRates =
      draft.rateMode === "fixedRates"
        ? draft.fixedRates
            .filter((row) => row.vehicleClassId.trim())
            .map((row) => {
              const fixedTransferRate =
                row.fixedTransferRate != null && Number.isFinite(row.fixedTransferRate)
                  ? row.fixedTransferRate
                  : null;
              const weekdayHourly = row.hourly?.weekdayHourlyRate;
              const hourly =
                weekdayHourly != null && Number.isFinite(weekdayHourly)
                  ? { weekdayHourlyRate: weekdayHourly }
                  : null;
              return {
                ...row,
                vehicleClassId: row.vehicleClassId.trim(),
                fixedTransferRate,
                hourly,
                transfer: null
              };
            })
        : [];

    setSaving(true);
    try {
      const next: CorporateAccount = {
        ...draft,
        percentOff: draft.rateMode === "percentOff" ? percentPoints / 100 : null,
        fixedRates,
        updatedAt: new Date()
      };
      await saveCorporateAccount(next);
      toast.success("Rates saved.");
      onSaved(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save rates.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SettingsSection
        title="Rate mode"
        description="Choose how this account is priced relative to standard rates.">
        <div className="space-y-2">
          <Label htmlFor="account-rate-mode">Rate mode</Label>
          <Select
            value={draft.rateMode}
            onValueChange={(value) => {
              setDraft((c) => ({ ...c, rateMode: value as CorporateRateMode }));
            }}>
            <SelectTrigger id="account-rate-mode" className="w-full max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CORPORATE_RATE_MODES.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {corporateRateModeTitle[mode]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {draft.rateMode === "percentOff" ? (
          <div className="max-w-sm">
            <NumberStepper
              id="account-percent"
              label="Percent off"
              value={percentPoints}
              onChange={setPercentPoints}
              min={0}
              max={100}
            />
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </SettingsSection>

      {draft.rateMode === "fixedRates" ? (
        <SettingsSection
          title="Fixed rate overrides"
          description="Custom transfer and hourly rates by vehicle class and trip type.">
          <div className="space-y-3">
            {draft.fixedRates.map((row) => (
              <div key={row.id} className="space-y-3 rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">Rate override</p>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="hover:bg-destructive/10 hover:text-destructive size-8"
                    onClick={() => removeOverride(row.id)}>
                    <Trash2Icon className="size-4" />
                    <span className="sr-only">Remove override</span>
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Vehicle class</Label>
                    <Select
                      value={row.vehicleClassId || undefined}
                      onValueChange={(value) => updateOverride(row.id, { vehicleClassId: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleClasses.map((vehicleClass) => (
                          <SelectItem key={vehicleClass.id} value={vehicleClass.id}>
                            {vehicleClass.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Trip type</Label>
                    <Select
                      value={row.tripType}
                      onValueChange={(value) =>
                        updateOverride(row.id, { tripType: value as TripType })
                      }>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BILLING_TRIP_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {tripTypeTitle[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="*:not-first:mt-2">
                    <Label>Fixed transfer rate</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.fixedTransferRate ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        updateOverride(row.id, {
                          fixedTransferRate: raw === "" ? null : Number(raw)
                        });
                      }}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="*:not-first:mt-2">
                    <Label>Weekday hourly rate</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.hourly?.weekdayHourlyRate ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        updateOverride(row.id, {
                          hourly:
                            raw === ""
                              ? null
                              : { ...row.hourly, weekdayHourlyRate: Number(raw) }
                        });
                      }}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() =>
                setDraft((c) => ({
                  ...c,
                  fixedRates: [...c.fixedRates, emptyRateOverride()]
                }))}>
              <PlusIcon className="size-4" />
              Add rate override
            </Button>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </SettingsSection>
      ) : null}
    </div>
  );
}
