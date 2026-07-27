"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  CORPORATE_PREFERRED_PAYMENTS,
  corporatePreferredPaymentTitle,
  type CorporateAccount,
  type CorporatePreferredPayment
} from "@/lib/models";
import { saveCorporateAccount } from "@/lib/services/firebase-service";

function optionalNumber(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function AccountPolicyTab({
  account,
  onSaved
}: {
  account: CorporateAccount;
  onSaved: (account: CorporateAccount) => void;
}) {
  const { vehicleClasses } = useVehicleClasses();
  const [draft, setDraft] = useState(account);
  const [saving, setSaving] = useState(false);
  const [seedKey, setSeedKey] = useState(account.id + String(account.updatedAt.getTime()));

  const nextKey = account.id + String(account.updatedAt.getTime());
  if (nextKey !== seedKey) {
    setSeedKey(nextKey);
    setDraft(account);
  }

  function toggleClass(classId: string, checked: boolean) {
    setDraft((current) => {
      const set = new Set(current.defaultVehicleClassIds);
      if (checked) set.add(classId);
      else set.delete(classId);
      return { ...current, defaultVehicleClassIds: [...set] };
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const next: CorporateAccount = {
        ...draft,
        maxRideAmount: draft.maxRideAmount,
        monthlyBudget: draft.monthlyBudget,
        creditLimit: draft.creditLimit,
        preferredPayment: draft.preferredPayment,
        gstInclusive: draft.gstInclusive,
        defaultVehicleClassIds: draft.defaultVehicleClassIds,
        updatedAt: new Date()
      };
      await saveCorporateAccount(next);
      toast.success("Policy saved.");
      onSaved(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save policy.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Policy</CardTitle>
        <Button type="button" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Saving…" : "Save policy"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Default vehicle classes</Label>
          {vehicleClasses.length === 0 ? (
            <p className="text-muted-foreground text-sm">No vehicle classes configured.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {vehicleClasses.map((vehicleClass) => {
                const checked = draft.defaultVehicleClassIds.includes(vehicleClass.id);
                return (
                  <label
                    key={vehicleClass.id}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => toggleClass(vehicleClass.id, value === true)}
                    />
                    {vehicleClass.displayName}
                  </label>
                );
              })}
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            Prefills booking class when set. Leave empty to allow any class.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="*:not-first:mt-2">
            <Label htmlFor="policy-max-ride">Max per ride</Label>
            <Input
              id="policy-max-ride"
              type="number"
              min={0}
              step="1"
              value={draft.maxRideAmount ?? ""}
              onChange={(e) =>
                setDraft((c) => ({ ...c, maxRideAmount: optionalNumber(e.target.value) }))
              }
              placeholder="Unlimited"
            />
            <p className="text-muted-foreground text-xs">
              Over this amount will require approval (not enforced yet).
            </p>
          </div>
          <div className="*:not-first:mt-2">
            <Label htmlFor="policy-monthly-budget">Monthly budget</Label>
            <Input
              id="policy-monthly-budget"
              type="number"
              min={0}
              step="1"
              value={draft.monthlyBudget ?? ""}
              onChange={(e) =>
                setDraft((c) => ({ ...c, monthlyBudget: optionalNumber(e.target.value) }))
              }
              placeholder="Unlimited"
            />
            <p className="text-muted-foreground text-xs">
              Tracked on the account profile; enforcement via account manager later.
            </p>
          </div>
          <div className="*:not-first:mt-2">
            <Label htmlFor="policy-credit-limit">Credit limit</Label>
            <Input
              id="policy-credit-limit"
              type="number"
              min={0}
              step="1"
              value={draft.creditLimit ?? ""}
              onChange={(e) =>
                setDraft((c) => ({ ...c, creditLimit: optionalNumber(e.target.value) }))
              }
              placeholder="Unlimited"
            />
            <p className="text-muted-foreground text-xs">
              When exceeded, account manager will approve or reject (not enforced yet).
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="policy-preferred-payment">Preferred payment</Label>
            <Select
              value={draft.preferredPayment ?? "unset"}
              onValueChange={(value) =>
                setDraft((c) => ({
                  ...c,
                  preferredPayment:
                    value === "unset" ? null : (value as CorporatePreferredPayment)
                }))
              }>
              <SelectTrigger id="policy-preferred-payment" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Not set</SelectItem>
                {CORPORATE_PREFERRED_PAYMENTS.map((payment) => (
                  <SelectItem key={payment} value={payment}>
                    {corporatePreferredPaymentTitle[payment]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.gstInclusive}
                onCheckedChange={(checked) =>
                  setDraft((c) => ({ ...c, gstInclusive: checked === true }))
                }
              />
              GST included in rates
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
