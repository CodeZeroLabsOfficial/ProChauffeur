"use client";

import { useMemo, useState } from "react";
import { InfoIcon } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
        <TooltipProvider>
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="policy-allowed-classes">Vehicle classes</Label>
              <FieldInfoTooltip label="vehicle classes">
                Vehicle classes members may book on this account. Leave empty to allow any enabled
                class. Selecting classes restricts bookings to that list only.
              </FieldInfoTooltip>
            </div>
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
        </TooltipProvider>
      </SettingsSection>

      <SettingsSection
        title="Spend limits"
        description="Caps used for approvals and account-manager review.">
        <TooltipProvider>
          <div className="max-w-sm space-y-4">
            <NumberStepper
              id="policy-max-ride"
              label="Max per ride"
              labelExtra={
                <FieldInfoTooltip label="max per ride">
                  Caps the quote total for a single trip on this account. Trips above this amount
                  require account-manager approval before dispatch. Use 0 (Unlimited) for no
                  per-ride cap.
                </FieldInfoTooltip>
              }
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

            <NumberStepper
              id="policy-monthly-budget"
              label="Monthly budget"
              labelExtra={
                <FieldInfoTooltip label="monthly budget">
                  Target on-account spend for the current calendar month. Used on the account
                  profile and Billing as remaining budget. Use 0 (Unlimited) for no monthly
                  target.
                </FieldInfoTooltip>
              }
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

            <NumberStepper
              id="policy-credit-limit"
              label="Credit limit"
              labelExtra={
                <FieldInfoTooltip label="credit limit">
                  Soft cap on outstanding bill-to-account balance. When exceeded, further trips
                  require account-manager approval or rejection. Use 0 (Unlimited) for no credit
                  cap.
                </FieldInfoTooltip>
              }
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
          </div>
        </TooltipProvider>
      </SettingsSection>

      <SettingsSection
        title="Payment & tax"
        description="Choose how members on this account can pay when booking."
        footer={saveFooter}>
        <TooltipProvider>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="policy-allowed-payments">Allowed payment methods</Label>
                <FieldInfoTooltip label="allowed payment methods">
                  Methods members can choose when booking on this account. Bill to account invoices
                  the company; Pay by card charges the member’s card and is not added to the
                  account invoice. At least one method is required.
                </FieldInfoTooltip>
              </div>
              <MultiSelectField
                id="policy-allowed-payments"
                options={PAYMENT_METHOD_OPTIONS}
                selected={allowedMethods}
                onSelectedChange={(selected) => {
                  const nextAllowed = normalizeAllowedPaymentMethods(selected);
                  setDraft((c) => ({
                    ...c,
                    allowedPaymentMethods:
                      nextAllowed.length > 0 ? nextAllowed : c.allowedPaymentMethods,
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
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="policy-preferred-payment">Default payment method</Label>
                <FieldInfoTooltip label="default payment method">
                  Pre-selected at checkout for members of this account. Must be one of the allowed
                  methods. Not set leaves the choice to the member each time.
                </FieldInfoTooltip>
              </div>
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
          </div>
        </TooltipProvider>
      </SettingsSection>
    </div>
  );
}
