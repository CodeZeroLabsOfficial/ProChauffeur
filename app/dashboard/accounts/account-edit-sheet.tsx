"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminUserAutocomplete } from "@/components/admin-user-autocomplete";
import { NumberStepper } from "@/components/number-stepper";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  buildNewCorporateAccount,
  CORPORATE_ACCOUNT_STATUSES,
  CORPORATE_RATE_MODES,
  corporateAccountStatusTitle,
  corporateRateModeTitle,
  normalizeCorporateJoinCode,
  type CorporateAccount,
  type CorporateAccountStatus,
  type CorporateBillingDay,
  type CorporateRateMode,
  type User
} from "@/lib/models";
import { deleteCorporateAccount, fetchUser, saveCorporateAccount } from "@/lib/services/firebase-service";

const BILLING_DAY_OPTIONS: { value: string; label: string }[] = [
  { value: "last", label: "Last day of month" },
  ...Array.from({ length: 28 }, (_, i) => {
    const day = i + 1;
    return { value: String(day), label: String(day) };
  })
];

type FieldErrors = {
  name?: boolean;
};

function billingDayToSelectValue(day: CorporateBillingDay): string {
  return day === "last" ? "last" : String(day);
}

function parseBillingDay(value: string): CorporateBillingDay {
  if (value === "last") return "last";
  const day = Number(value);
  if (Number.isFinite(day) && day >= 1 && day <= 28) return day;
  return "last";
}

export function AccountEditSheet({
  account,
  open,
  onOpenChange,
  onSaved,
  onDeleted
}: {
  account: CorporateAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (account: CorporateAccount) => void;
  onDeleted?: () => void;
}) {
  const isNew = !account;
  const [draft, setDraft] = useState<CorporateAccount>(() => account ?? buildNewCorporateAccount());
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [seedKey, setSeedKey] = useState("");
  const [manager, setManager] = useState<User | null>(null);
  const [billingSameAsPrimary, setBillingSameAsPrimary] = useState(false);

  const sheetKey = account?.id ?? "__new__";
  if (sheetKey !== seedKey) {
    setSeedKey(sheetKey);
    const next = account ?? buildNewCorporateAccount();
    setDraft(next);
    setFieldErrors({});
    setManager(null);
    setBillingSameAsPrimary(
      Boolean(
        next.primaryContactName &&
          next.primaryContactName === next.billingContactName &&
          (next.primaryContactEmail ?? "") === (next.billingContactEmail ?? "") &&
          (next.primaryContactPhone ?? "") === (next.billingContactPhone ?? "")
      )
    );
  }

  useEffect(() => {
    if (!open || !draft.accountManagerUserId) {
      if (!draft.accountManagerUserId) setManager(null);
      return;
    }
    let cancelled = false;
    fetchUser(draft.accountManagerUserId)
      .then((user) => {
        if (!cancelled) setManager(user?.role === "admin" ? user : null);
      })
      .catch(() => {
        if (!cancelled) setManager(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, draft.accountManagerUserId]);

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => ({ ...prev, [field]: false }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.name.trim();
    const errors: FieldErrors = { name: !name };
    setFieldErrors(errors);
    if (errors.name) return;

    const joinCode = draft.joinCode ? normalizeCorporateJoinCode(draft.joinCode) : null;

    const billingContact = billingSameAsPrimary
      ? {
          billingContactName: draft.primaryContactName?.trim() || null,
          billingContactEmail: draft.primaryContactEmail?.trim() || null,
          billingContactPhone: draft.primaryContactPhone?.trim() || null
        }
      : {
          billingContactName: draft.billingContactName?.trim() || null,
          billingContactEmail: draft.billingContactEmail?.trim() || null,
          billingContactPhone: draft.billingContactPhone?.trim() || null
        };

    setSaving(true);
    try {
      const next: CorporateAccount = {
        ...draft,
        name,
        billingEmail: draft.billingEmail?.trim() || null,
        billingPhone: draft.billingPhone?.trim() || null,
        abn: draft.abn?.trim() || null,
        poNumber: draft.poNumber?.trim() || null,
        addressLine1: draft.addressLine1?.trim() || null,
        addressLine2: draft.addressLine2?.trim() || null,
        city: draft.city?.trim() || null,
        state: draft.state?.trim() || null,
        postcode: draft.postcode?.trim() || null,
        country: draft.country?.trim() || null,
        primaryContactName: draft.primaryContactName?.trim() || null,
        primaryContactEmail: draft.primaryContactEmail?.trim() || null,
        primaryContactPhone: draft.primaryContactPhone?.trim() || null,
        ...billingContact,
        accountManagerUserId: manager?.id ?? null,
        notes: draft.notes?.trim() || null,
        joinCode,
        updatedAt: new Date()
      };
      await saveCorporateAccount(next);
      toast.success(isNew ? "Account created." : "Account saved.");
      onSaved?.(next);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save account.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!account) return;
    setSaving(true);
    try {
      await deleteCorporateAccount(account.id);
      toast.success("Account deleted.");
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isNew ? "New account" : "Edit account"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 px-4 pb-4" noValidate>
          <div className="*:not-first:mt-2">
            <Label htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              value={draft.name}
              onChange={(e) => {
                setDraft((c) => ({ ...c, name: e.target.value }));
                clearFieldError("name");
              }}
              placeholder="Acme Corp"
              aria-invalid={fieldErrors.name || undefined}
              className="peer"
            />
            {fieldErrors.name ? (
              <p
                aria-live="polite"
                className="peer-aria-invalid:text-destructive text-destructive text-xs"
                role="alert">
                Name is required
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="account-status">Status</Label>
              <Select
                value={draft.status}
                onValueChange={(value) =>
                  setDraft((c) => ({ ...c, status: value as CorporateAccountStatus }))
                }>
                <SelectTrigger id="account-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CORPORATE_ACCOUNT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {corporateAccountStatusTitle[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-billing-day">Billing day</Label>
              <Select
                value={billingDayToSelectValue(draft.billingDay)}
                onValueChange={(value) =>
                  setDraft((c) => ({ ...c, billingDay: parseBillingDay(value) }))
                }>
                <SelectTrigger id="account-billing-day" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_DAY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isNew ? (
            <div className="space-y-2">
              <Label htmlFor="account-rate-mode">Rate mode</Label>
              <Select
                value={draft.rateMode}
                onValueChange={(value) =>
                  setDraft((c) => ({ ...c, rateMode: value as CorporateRateMode }))
                }>
                <SelectTrigger id="account-rate-mode" className="w-full">
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
              <p className="text-muted-foreground text-xs">
                Configure rates, members, and policy on the account profile after creating.
              </p>
            </div>
          ) : (
            <>
              <NumberStepper
                id="account-terms"
                label="Payment terms (days)"
                value={draft.paymentTermsDays}
                onChange={(value) => setDraft((c) => ({ ...c, paymentTermsDays: value }))}
                min={0}
                max={365}
              />

              <Separator />
              <p className="text-sm font-medium">Company</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="*:not-first:mt-2">
                  <Label htmlFor="account-abn">ABN</Label>
                  <Input
                    id="account-abn"
                    value={draft.abn ?? ""}
                    onChange={(e) => setDraft((c) => ({ ...c, abn: e.target.value }))}
                  />
                </div>
                <div className="*:not-first:mt-2">
                  <Label htmlFor="account-po">PO number</Label>
                  <Input
                    id="account-po"
                    value={draft.poNumber ?? ""}
                    onChange={(e) => setDraft((c) => ({ ...c, poNumber: e.target.value }))}
                  />
                </div>
              </div>

              <div className="*:not-first:mt-2">
                <Label htmlFor="account-address1">Address line 1</Label>
                <Input
                  id="account-address1"
                  value={draft.addressLine1 ?? ""}
                  onChange={(e) => setDraft((c) => ({ ...c, addressLine1: e.target.value }))}
                />
              </div>
              <div className="*:not-first:mt-2">
                <Label htmlFor="account-address2">Address line 2</Label>
                <Input
                  id="account-address2"
                  value={draft.addressLine2 ?? ""}
                  onChange={(e) => setDraft((c) => ({ ...c, addressLine2: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="*:not-first:mt-2">
                  <Label htmlFor="account-city">City</Label>
                  <Input
                    id="account-city"
                    value={draft.city ?? ""}
                    onChange={(e) => setDraft((c) => ({ ...c, city: e.target.value }))}
                  />
                </div>
                <div className="*:not-first:mt-2">
                  <Label htmlFor="account-state">State</Label>
                  <Input
                    id="account-state"
                    value={draft.state ?? ""}
                    onChange={(e) => setDraft((c) => ({ ...c, state: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="*:not-first:mt-2">
                  <Label htmlFor="account-postcode">Postcode</Label>
                  <Input
                    id="account-postcode"
                    value={draft.postcode ?? ""}
                    onChange={(e) => setDraft((c) => ({ ...c, postcode: e.target.value }))}
                  />
                </div>
                <div className="*:not-first:mt-2">
                  <Label htmlFor="account-country">Country</Label>
                  <Input
                    id="account-country"
                    value={draft.country ?? ""}
                    onChange={(e) => setDraft((c) => ({ ...c, country: e.target.value }))}
                  />
                </div>
              </div>

              <Separator />
              <p className="text-sm font-medium">Primary contact</p>
              <div className="*:not-first:mt-2">
                <Label htmlFor="account-primary-name">Name</Label>
                <Input
                  id="account-primary-name"
                  value={draft.primaryContactName ?? ""}
                  onChange={(e) =>
                    setDraft((c) => ({ ...c, primaryContactName: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="*:not-first:mt-2">
                  <Label htmlFor="account-primary-email">Email</Label>
                  <Input
                    id="account-primary-email"
                    type="email"
                    value={draft.primaryContactEmail ?? ""}
                    onChange={(e) =>
                      setDraft((c) => ({ ...c, primaryContactEmail: e.target.value }))
                    }
                  />
                </div>
                <div className="*:not-first:mt-2">
                  <Label htmlFor="account-primary-phone">Phone</Label>
                  <Input
                    id="account-primary-phone"
                    type="tel"
                    value={draft.primaryContactPhone ?? ""}
                    onChange={(e) =>
                      setDraft((c) => ({ ...c, primaryContactPhone: e.target.value }))
                    }
                  />
                </div>
              </div>

              <Separator />
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Billing contact</p>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={billingSameAsPrimary}
                    onCheckedChange={(checked) => setBillingSameAsPrimary(checked === true)}
                  />
                  Same as primary
                </label>
              </div>
              {!billingSameAsPrimary ? (
                <>
                  <div className="*:not-first:mt-2">
                    <Label htmlFor="account-billing-name">Name</Label>
                    <Input
                      id="account-billing-name"
                      value={draft.billingContactName ?? ""}
                      onChange={(e) =>
                        setDraft((c) => ({ ...c, billingContactName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="*:not-first:mt-2">
                      <Label htmlFor="account-billing-email">Email</Label>
                      <Input
                        id="account-billing-email"
                        type="email"
                        value={draft.billingContactEmail ?? draft.billingEmail ?? ""}
                        onChange={(e) =>
                          setDraft((c) => ({ ...c, billingContactEmail: e.target.value }))
                        }
                      />
                    </div>
                    <div className="*:not-first:mt-2">
                      <Label htmlFor="account-billing-phone">Phone</Label>
                      <Input
                        id="account-billing-phone"
                        type="tel"
                        value={draft.billingContactPhone ?? draft.billingPhone ?? ""}
                        onChange={(e) =>
                          setDraft((c) => ({ ...c, billingContactPhone: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div className="*:not-first:mt-2">
                  <Label htmlFor="account-billing-email-fallback">Billing email</Label>
                  <Input
                    id="account-billing-email-fallback"
                    type="email"
                    value={draft.billingEmail ?? ""}
                    onChange={(e) => setDraft((c) => ({ ...c, billingEmail: e.target.value }))}
                    placeholder="billing@acme.com"
                  />
                </div>
                <div className="*:not-first:mt-2">
                  <Label htmlFor="account-billing-phone-fallback">Billing phone</Label>
                  <Input
                    id="account-billing-phone-fallback"
                    type="tel"
                    value={draft.billingPhone ?? ""}
                    onChange={(e) => setDraft((c) => ({ ...c, billingPhone: e.target.value }))}
                  />
                </div>
              </div>

              <Separator />
              <div className="space-y-2">
                <Label htmlFor="account-manager">Account manager</Label>
                <AdminUserAutocomplete
                  id="account-manager"
                  value={manager}
                  onChange={(user) => {
                    setManager(user);
                    setDraft((c) => ({ ...c, accountManagerUserId: user?.id ?? null }));
                  }}
                  disabled={saving}
                />
              </div>

              <div className="*:not-first:mt-2">
                <Label htmlFor="account-join-code">Join code</Label>
                <Input
                  id="account-join-code"
                  value={draft.joinCode ?? ""}
                  onChange={(e) =>
                    setDraft((c) => ({
                      ...c,
                      joinCode: e.target.value.toUpperCase()
                    }))
                  }
                  placeholder="Optional"
                  className="font-mono uppercase"
                />
              </div>

              <div className="*:not-first:mt-2">
                <Label htmlFor="account-notes">Notes</Label>
                <Textarea
                  id="account-notes"
                  value={draft.notes ?? ""}
                  onChange={(e) => setDraft((c) => ({ ...c, notes: e.target.value }))}
                  rows={3}
                  placeholder="Internal notes…"
                />
              </div>
            </>
          )}

          <SheetFooter className="mt-auto px-0">
            {isNew ? (
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? "Saving…" : "Create account"}
              </Button>
            ) : (
              <div className="grid w-full grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={saving}
                  onClick={() => void handleDelete()}>
                  Delete
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            )}
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
