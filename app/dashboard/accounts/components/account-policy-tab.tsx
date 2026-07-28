"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { MultiSelectField } from "@/components/multi-select-field";
import { NumberStepper } from "@/components/number-stepper";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  CORPORATE_ALLOWED_PAYMENTS,
  clampPreferredPayment,
  corporateAllowedPaymentTitle,
  corporatePreferredPaymentTitle,
  normalizeAllowedPaymentMethods,
  normalizeAllowedVehicleClassIds,
  type CorporateAccount,
  type CorporateAllowedPayment,
  type CorporatePreferredPayment
} from "@/lib/models";
import { saveCorporateAccount } from "@/lib/services/firebase-service";

const SPEND_LIMIT_MAX = 1_000_000;

const PAYMENT_METHOD_OPTIONS = CORPORATE_ALLOWED_PAYMENTS.map((value) => ({
  value,
  label: corporateAllowedPaymentTitle[value]
}));

function formatUnlimited(value: number): string {
  return value === 0 ? "Unlimited" : String(value);
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

  const vehicleClassOptions = useMemo(
    () =>
      vehicleClasses.map((vehicleClass) => ({
        value: vehicleClass.id,
        label: vehicleClass.displayName
      })),
    [vehicleClasses]
  );

  const allowedMethods = draft.allowedPaymentMethods;

  async function handleSave() {
    const allowed = normalizeAllowedPaymentMethods(draft.allowedPaymentMethods);
    if (allowed.length === 0) {
      toast.error("Select at least one allowed payment method.");
      return;
    }
    setSaving(true);
    try {
      const next: CorporateAccount = {
        ...draft,
        allowedPaymentMethods: allowed,
        preferredPayment: clampPreferredPayment(draft.preferredPayment ?? null, allowed),
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

  const saveFooter = (
    <Button type="button" onClick={() => void handleSave()} disabled={saving}>
      {saving ? "Saving…" : "Save changes"}
    </Button>
  );

  return (
    <div className="space-y-4">
      <SettingsSection
        title="Allowed vehicle classes"
        description="Classes members can book. Leave empty to allow any class.">
        <div className="space-y-2">
          <Label htmlFor="policy-allowed-classes">Vehicle classes</Label>
          <MultiSelectField
            id="policy-allowed-classes"
            options={vehicleClassOptions}
            selected={draft.allowedVehicleClassIds}
            onSelectedChange={(selected) =>
              setDraft((c) => ({
                ...c,
                allowedVehicleClassIds: normalizeAllowedVehicleClassIds(selected)
              }))
            }
            placeholder="Select vehicle classes"
            emptyMessage="No vehicle classes configured."
            disabled={saving}
            className="max-w-sm"
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Spend limits"
        description="Caps used for approvals and account-manager review.">
        <div className="max-w-sm space-y-1">
          <NumberStepper
            id="policy-max-ride"
            label="Max per ride"
            value={draft.maxRideAmount ?? 0}
            onChange={(value) =>
              setDraft((c) => ({ ...c, maxRideAmount: value === 0 ? null : value }))
            }
            min={0}
            max={SPEND_LIMIT_MAX}
            step={1}
            disabled={saving}
            formatValue={formatUnlimited}
          />
          <p className="text-muted-foreground text-xs">
            Over this amount will require approval (not enforced yet).
          </p>
        </div>

        <div className="max-w-sm space-y-1">
          <NumberStepper
            id="policy-monthly-budget"
            label="Monthly budget"
            value={draft.monthlyBudget ?? 0}
            onChange={(value) =>
              setDraft((c) => ({ ...c, monthlyBudget: value === 0 ? null : value }))
            }
            min={0}
            max={SPEND_LIMIT_MAX}
            step={1}
            disabled={saving}
            formatValue={formatUnlimited}
          />
          <p className="text-muted-foreground text-xs">
            Tracked on the account profile; enforcement via account manager later.
          </p>
        </div>

        <div className="max-w-sm space-y-1">
          <NumberStepper
            id="policy-credit-limit"
            label="Credit limit"
            value={draft.creditLimit ?? 0}
            onChange={(value) =>
              setDraft((c) => ({ ...c, creditLimit: value === 0 ? null : value }))
            }
            min={0}
            max={SPEND_LIMIT_MAX}
            step={1}
            disabled={saving}
            formatValue={formatUnlimited}
          />
          <p className="text-muted-foreground text-xs">
            When exceeded, account manager will approve or reject (not enforced yet).
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Payment & tax"
        description="Choose how members on this account can pay when booking."
        footer={saveFooter}>
        <div className="space-y-2">
          <Label htmlFor="policy-allowed-payments">Allowed payment methods</Label>
          <MultiSelectField
            id="policy-allowed-payments"
            options={PAYMENT_METHOD_OPTIONS}
            selected={allowedMethods}
            onSelectedChange={(selected) => {
              const nextAllowed = normalizeAllowedPaymentMethods(selected);
              setDraft((c) => ({
                ...c,
                allowedPaymentMethods: nextAllowed.length > 0 ? nextAllowed : c.allowedPaymentMethods,
                preferredPayment: clampPreferredPayment(
                  c.preferredPayment ?? null,
                  nextAllowed.length > 0 ? nextAllowed : c.allowedPaymentMethods
                )
              }));
            }}
            placeholder="Select payment methods"
            emptyMessage="No payment methods."
            disabled={saving}
            className="max-w-sm"
          />
          <p className="text-muted-foreground text-xs">
            Members only see methods you allow. Bill to account invoices the company; Pay by card
            charges the member’s card (no account invoice).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="policy-preferred-payment">Default payment method</Label>
          <Select
            value={draft.preferredPayment ?? "unset"}
            onValueChange={(value) =>
              setDraft((c) => ({
                ...c,
                preferredPayment:
                  value === "unset" ? null : (value as CorporatePreferredPayment)
              }))
            }
            disabled={saving || allowedMethods.length === 0}>
            <SelectTrigger id="policy-preferred-payment" className="w-full max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">Not set</SelectItem>
              {allowedMethods.map((payment) => (
                <SelectItem key={payment} value={payment}>
                  {corporatePreferredPaymentTitle[payment as CorporateAllowedPayment]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={draft.gstInclusive}
            disabled={saving}
            onCheckedChange={(checked) =>
              setDraft((c) => ({ ...c, gstInclusive: checked === true }))
            }
          />
          GST included in rates
        </label>
      </SettingsSection>
    </div>
  );
}
