"use client";

import { useEffect, useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { CustomerAutocomplete } from "@/components/customer-autocomplete";
import { NumberStepper } from "@/components/number-stepper";
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
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useVehicleClasses } from "@/hooks/use-collections";
import {
  buildNewCorporateAccount,
  CORPORATE_ACCOUNT_STATUSES,
  CORPORATE_RATE_MODES,
  corporateAccountStatusTitle,
  corporateRateModeTitle,
  normalizeCorporateJoinCode,
  tripTypeTitle,
  type CorporateAccount,
  type CorporateAccountStatus,
  type CorporateBillingDay,
  type CorporateFixedRateOverride,
  type CorporateRateMode,
  type TripType,
  type User
} from "@/lib/models";
import {
  deleteCorporateAccount,
  fetchCorporateAccountMembers,
  linkCustomerToCorporateAccount,
  saveCorporateAccount
} from "@/lib/services/firebase-service";
import { customerDisplayName } from "@/lib/users/customer-display";

const BILLING_TRIP_TYPES: TripType[] = ["transfer", "hourly"];

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

function percentPointsFromAccount(account: CorporateAccount): number {
  if (account.rateMode !== "percentOff") return 10;
  return Math.max(0, Math.min(100, Math.round((account.percentOff ?? 0) * 100)));
}

function billingDayToSelectValue(day: CorporateBillingDay): string {
  return day === "last" ? "last" : String(day);
}

function parseBillingDay(value: string): CorporateBillingDay {
  if (value === "last") return "last";
  const day = Number(value);
  if (Number.isFinite(day) && day >= 1 && day <= 28) return day;
  return "last";
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

export function AccountEditSheet({
  account,
  open,
  onOpenChange
}: {
  account: CorporateAccount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isNew = !account;
  const { vehicleClasses } = useVehicleClasses();
  const [draft, setDraft] = useState<CorporateAccount>(() => account ?? buildNewCorporateAccount());
  const [percentPoints, setPercentPoints] = useState(() =>
    percentPointsFromAccount(account ?? buildNewCorporateAccount())
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [seedKey, setSeedKey] = useState("");
  const [members, setMembers] = useState<User[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberToAdd, setMemberToAdd] = useState<User | null>(null);
  const [linking, setLinking] = useState(false);

  const sheetKey = account?.id ?? "__new__";
  if (sheetKey !== seedKey) {
    setSeedKey(sheetKey);
    const next = account ?? buildNewCorporateAccount();
    setDraft(next);
    setPercentPoints(percentPointsFromAccount(next));
    setFieldErrors({});
    setMembers([]);
    setMemberToAdd(null);
  }

  useEffect(() => {
    if (!open || isNew || !account) return;
    let cancelled = false;
    setMembersLoading(true);
    fetchCorporateAccountMembers(account.id)
      .then((rows) => {
        if (!cancelled) setMembers(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setMembers([]);
          toast.error("Could not load members.");
        }
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isNew, account]);

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => ({ ...prev, [field]: false }));
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.name.trim();
    const errors: FieldErrors = { name: !name };
    setFieldErrors(errors);
    if (errors.name) return;

    const joinCode = draft.joinCode ? normalizeCorporateJoinCode(draft.joinCode) : null;
    const creditLimit =
      draft.creditLimit != null && Number.isFinite(draft.creditLimit) && draft.creditLimit >= 0
        ? draft.creditLimit
        : null;

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
      await saveCorporateAccount({
        ...draft,
        name,
        billingEmail: draft.billingEmail?.trim() || null,
        billingPhone: draft.billingPhone?.trim() || null,
        abn: draft.abn?.trim() || null,
        poNumber: draft.poNumber?.trim() || null,
        notes: draft.notes?.trim() || null,
        joinCode,
        creditLimit,
        percentOff: draft.rateMode === "percentOff" ? percentPoints / 100 : null,
        fixedRates,
        updatedAt: new Date()
      });
      toast.success(isNew ? "Account created." : "Account saved.");
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete account.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMember() {
    if (!account || !memberToAdd) return;
    setLinking(true);
    try {
      await linkCustomerToCorporateAccount(memberToAdd.id, account.id);
      setMembers((current) => {
        if (current.some((m) => m.id === memberToAdd.id)) return current;
        return [...current, memberToAdd].sort((a, b) =>
          customerDisplayName(a).localeCompare(customerDisplayName(b))
        );
      });
      setMemberToAdd(null);
      toast.success("Member linked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not link member.");
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlinkMember(userId: string) {
    if (!account) return;
    setLinking(true);
    try {
      await linkCustomerToCorporateAccount(userId, null);
      setMembers((current) => current.filter((m) => m.id !== userId));
      toast.success("Member unlinked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not unlink member.");
    } finally {
      setLinking(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isNew ? "New account" : "Account details"}</SheetTitle>
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
            <div className="*:not-first:mt-2">
              <Label htmlFor="account-billing-email">Billing email</Label>
              <Input
                id="account-billing-email"
                type="email"
                value={draft.billingEmail ?? ""}
                onChange={(e) => setDraft((c) => ({ ...c, billingEmail: e.target.value }))}
                placeholder="billing@acme.com"
              />
            </div>
            <div className="*:not-first:mt-2">
              <Label htmlFor="account-billing-phone">Billing phone</Label>
              <Input
                id="account-billing-phone"
                type="tel"
                value={draft.billingPhone ?? ""}
                onChange={(e) => setDraft((c) => ({ ...c, billingPhone: e.target.value }))}
                placeholder="+61…"
              />
            </div>
          </div>

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

          <NumberStepper
            id="account-terms"
            label="Payment terms (days)"
            value={draft.paymentTermsDays}
            onChange={(value) => setDraft((c) => ({ ...c, paymentTermsDays: value }))}
            min={0}
            max={365}
          />

          <Separator />
          <p className="text-sm font-medium">Rates</p>

          <div className="space-y-2">
            <Label htmlFor="account-rate-mode">Rate mode</Label>
            <Select
              value={draft.rateMode}
              onValueChange={(value) => {
                const rateMode = value as CorporateRateMode;
                setDraft((c) => ({ ...c, rateMode }));
              }}>
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
          </div>

          {draft.rateMode === "percentOff" ? (
            <NumberStepper
              id="account-percent"
              label="Percent off"
              value={percentPoints}
              onChange={setPercentPoints}
              min={0}
              max={100}
            />
          ) : (
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
                        onValueChange={(value) =>
                          updateOverride(row.id, { vehicleClassId: value })
                        }>
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
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-3">
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
              <Label htmlFor="account-credit-limit">Credit limit</Label>
              <Input
                id="account-credit-limit"
                type="number"
                min={0}
                step="1"
                value={draft.creditLimit ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  setDraft((c) => ({
                    ...c,
                    creditLimit: raw === "" ? null : Number(raw)
                  }));
                }}
                placeholder="Unlimited"
              />
            </div>
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

          {!isNew && account ? (
            <>
              <Separator />
              <p className="text-sm font-medium">Members</p>
              {membersLoading ? (
                <p className="text-muted-foreground text-sm">Loading members…</p>
              ) : members.length === 0 ? (
                <p className="text-muted-foreground text-sm">No members linked.</p>
              ) : (
                <ul className="space-y-2">
                  {members.map((member) => (
                    <li
                      key={member.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{customerDisplayName(member)}</p>
                        <p className="text-muted-foreground truncate text-xs">{member.email}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                        disabled={linking || saving}
                        onClick={() => void handleUnlinkMember(member.id)}>
                        Unlink
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1 *:not-first:mt-2">
                  <Label htmlFor="account-add-member">Add member</Label>
                  <CustomerAutocomplete
                    id="account-add-member"
                    value={memberToAdd}
                    onChange={setMemberToAdd}
                    placeholder="Search customers…"
                    disabled={linking || saving}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!memberToAdd || linking || saving}
                  onClick={() => void handleAddMember()}>
                  {linking ? "Linking…" : "Link"}
                </Button>
              </div>
            </>
          ) : null}

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
                  disabled={saving || linking}
                  onClick={() => void handleDelete()}>
                  Delete
                </Button>
                <Button type="submit" disabled={saving || linking}>
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
