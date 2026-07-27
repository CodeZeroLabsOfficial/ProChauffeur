"use client";

import { useEffect, useState } from "react";
import { Building2, ImagePlusIcon, Power } from "lucide-react";
import { toast } from "sonner";

import { AdminUserAutocomplete } from "@/components/admin-user-autocomplete";
import { CustomerAutocomplete } from "@/components/customer-autocomplete";
import {
  ProfileAddressField,
  PROFILE_ADDRESS_VALIDATION_MESSAGE
} from "@/components/profile-address-field";
import { ProfileV2TabTrigger, profileV2TabsListClassName } from "@/components/layout/profile-tab-bar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
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
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFileUpload } from "@/hooks/use-file-upload";
import {
  buildNewCorporateAccount,
  CORPORATE_ACCOUNT_STATUSES,
  CORPORATE_RATE_MODES,
  corporateAccountStatusTitle,
  corporateRateModeTitle,
  normalizeCorporateJoinCode,
  type CorporateAccount,
  type CorporateAccountStatus,
  type CorporateRateMode,
  type User
} from "@/lib/models";
import {
  isValidPostalAddress,
  type PostalAddress
} from "@/lib/models/postal-address";
import {
  deleteCorporateAccount,
  fetchUser,
  linkCustomerToCorporateAccount,
  saveCorporateAccount,
  uploadCorporateAccountLogo
} from "@/lib/services/firebase-service";

type FieldErrors = {
  name?: boolean;
};

type SheetTab = "company" | "contacts";

function splitStreetLines(street: string | null | undefined): {
  addressLine1: string | null;
  addressLine2: string | null;
} {
  const raw = street?.trim() ?? "";
  if (!raw) return { addressLine1: null, addressLine2: null };
  const idx = raw.indexOf("\n");
  if (idx === -1) return { addressLine1: raw, addressLine2: null };
  const line1 = raw.slice(0, idx).trim() || null;
  const line2 = raw.slice(idx + 1).trim() || null;
  return { addressLine1: line1, addressLine2: line2 };
}

function joinStreetLines(line1: string | null | undefined, line2: string | null | undefined): string | null {
  const a = line1?.trim() ?? "";
  const b = line2?.trim() ?? "";
  if (!a && !b) return null;
  if (!b) return a;
  if (!a) return b;
  return `${a}\n${b}`;
}

function postalAddressFromAccount(account: CorporateAccount): PostalAddress {
  return {
    street: joinStreetLines(account.addressLine1, account.addressLine2),
    city: account.city ?? null,
    state: account.state ?? null,
    postcode: account.postcode ?? null,
    country: account.country ?? null
  };
}

function accountAddressFromPostal(address: PostalAddress): Pick<
  CorporateAccount,
  "addressLine1" | "addressLine2" | "city" | "state" | "postcode" | "country"
> {
  const lines = splitStreetLines(address.street);
  return {
    addressLine1: lines.addressLine1,
    addressLine2: lines.addressLine2,
    city: address.city?.trim() || null,
    state: address.state?.trim() || null,
    postcode: address.postcode?.trim() || null,
    country: address.country?.trim() || null
  };
}

function AccountLogoUpload({
  account,
  onSaved
}: {
  account: CorporateAccount;
  onSaved: (account: CorporateAccount) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(account.logoUrl ?? null);

  const [{ files }, { openFileDialog, getInputProps, clearFiles }] = useFileUpload({
    accept: "image/*",
    onFilesAdded: (added) => {
      const file = added[0]?.file;
      if (!(file instanceof File)) return;

      void (async () => {
        setUploading(true);
        try {
          const logoUrl = await uploadCorporateAccountLogo(account.id, file);
          const updated: CorporateAccount = { ...account, logoUrl, updatedAt: new Date() };
          await saveCorporateAccount(updated);
          setLocalLogoUrl(logoUrl);
          onSaved(updated);
          clearFiles();
          toast.success("Account logo updated.");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not upload logo.");
        } finally {
          setUploading(false);
        }
      })();
    }
  });

  const previewUrl = files[0]?.preview ?? localLogoUrl;

  useEffect(() => {
    setLocalLogoUrl(account.logoUrl ?? null);
  }, [account.logoUrl]);

  return (
    <div className="border-background bg-muted relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 shadow-xs shadow-black/10">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- local blob / Storage download URL preview
        <img alt="" className="size-full object-cover" height={80} src={previewUrl} width={80} />
      ) : (
        <Building2 className="text-muted-foreground size-8" aria-hidden />
      )}
      <button
        type="button"
        aria-label="Change account logo"
        disabled={uploading}
        className="focus-visible:border-ring focus-visible:ring-ring/50 absolute flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
        onClick={openFileDialog}>
        <ImagePlusIcon aria-hidden size={16} />
      </button>
      <input {...getInputProps()} aria-label="Upload account logo" className="sr-only" />
    </div>
  );
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
  const [primaryContact, setPrimaryContact] = useState<User | null>(null);
  const [billingContact, setBillingContact] = useState<User | null>(null);
  const [billingSameAsPrimary, setBillingSameAsPrimary] = useState(false);
  const [address, setAddress] = useState<PostalAddress>(() =>
    postalAddressFromAccount(account ?? buildNewCorporateAccount())
  );
  const [addressInvalid, setAddressInvalid] = useState(false);
  const [tab, setTab] = useState<SheetTab>("company");

  const sheetKey = account?.id ?? "__new__";
  if (sheetKey !== seedKey) {
    setSeedKey(sheetKey);
    const next = account ?? buildNewCorporateAccount();
    setDraft(next);
    setAddress(postalAddressFromAccount(next));
    setAddressInvalid(false);
    setFieldErrors({});
    setManager(null);
    setPrimaryContact(null);
    setBillingContact(null);
    setTab("company");
    setBillingSameAsPrimary(
      Boolean(
        next.primaryContactUserId &&
          next.primaryContactUserId === next.billingContactUserId
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

  useEffect(() => {
    if (!open || !draft.primaryContactUserId) {
      if (!draft.primaryContactUserId) setPrimaryContact(null);
      return;
    }
    let cancelled = false;
    fetchUser(draft.primaryContactUserId)
      .then((user) => {
        if (!cancelled) setPrimaryContact(user?.role === "customer" ? user : null);
      })
      .catch(() => {
        if (!cancelled) setPrimaryContact(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, draft.primaryContactUserId]);

  useEffect(() => {
    if (!open || billingSameAsPrimary) {
      if (billingSameAsPrimary) setBillingContact(primaryContact);
      return;
    }
    if (!draft.billingContactUserId) {
      setBillingContact(null);
      return;
    }
    let cancelled = false;
    fetchUser(draft.billingContactUserId)
      .then((user) => {
        if (!cancelled) setBillingContact(user?.role === "customer" ? user : null);
      })
      .catch(() => {
        if (!cancelled) setBillingContact(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, draft.billingContactUserId, billingSameAsPrimary, primaryContact]);

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => ({ ...prev, [field]: false }));
  }

  function handleLogoSaved(updated: CorporateAccount) {
    setDraft(updated);
    onSaved?.(updated);
  }

  async function ensureMemberLinked(userId: string, accountId: string) {
    await linkCustomerToCorporateAccount(userId, accountId);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.name.trim();
    const errors: FieldErrors = { name: !name };
    setFieldErrors(errors);
    if (errors.name) {
      setTab("company");
      return;
    }

    const joinCode = draft.joinCode ? normalizeCorporateJoinCode(draft.joinCode) : null;
    const primaryContactUserId = primaryContact?.id ?? null;
    const billingContactUserId = billingSameAsPrimary
      ? primaryContactUserId
      : (billingContact?.id ?? null);

    if (!isValidPostalAddress(address)) {
      setAddressInvalid(true);
      setTab("company");
      toast.error(PROFILE_ADDRESS_VALIDATION_MESSAGE);
      return;
    }
    setAddressInvalid(false);

    setSaving(true);
    try {
      const next: CorporateAccount = {
        ...draft,
        name,
        logoUrl: draft.logoUrl?.trim() || null,
        email: draft.email?.trim() || null,
        phone: draft.phone?.trim() || null,
        abn: draft.abn?.trim() || null,
        acn: draft.acn?.trim() || null,
        industry: draft.industry?.trim() || null,
        ...accountAddressFromPostal(address),
        primaryContactUserId,
        billingContactUserId,
        accountManagerUserId: manager?.id ?? null,
        notes: draft.notes?.trim() || null,
        joinCode,
        updatedAt: new Date()
      };
      await saveCorporateAccount(next);
      const memberIds = new Set(
        [primaryContactUserId, billingContactUserId].filter((id): id is string => Boolean(id))
      );
      for (const userId of memberIds) {
        await ensureMemberLinked(userId, next.id);
      }
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

  const headerTitle = draft.name.trim() || (isNew ? "New account" : "Account");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isNew ? "New account" : "Edit account"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 px-4 pb-4" noValidate>
          <div className="inline-flex items-center gap-4 align-top">
            {!isNew ? (
              <AccountLogoUpload account={draft} onSaved={handleLogoSaved} />
            ) : (
              <div className="border-background bg-muted relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 shadow-xs shadow-black/10">
                <Building2 className="text-muted-foreground size-8" aria-hidden />
              </div>
            )}
            <div className="space-y-2">
              <p className="text-lg font-semibold">{headerTitle}</p>
              <DetailSheetIconBadge icon={Power}>
                {corporateAccountStatusTitle[draft.status]}
              </DetailSheetIconBadge>
            </div>
          </div>

          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as SheetTab)}
            className="gap-4">
            <TabsList className={`${profileV2TabsListClassName} w-full justify-start`}>
              <ProfileV2TabTrigger value="company">Company details</ProfileV2TabTrigger>
              <ProfileV2TabTrigger value="contacts">Contacts</ProfileV2TabTrigger>
            </TabsList>

            <TabsContent value="company" className="mt-0 space-y-4">
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

              <div className="*:not-first:mt-2">
                <Label htmlFor="account-name">Company name</Label>
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

              <ProfileAddressField
                id="account-address"
                value={address}
                onChange={(next) => {
                  setAddress(next);
                  if (addressInvalid && isValidPostalAddress(next)) {
                    setAddressInvalid(false);
                  }
                }}
                invalid={addressInvalid}
                disabled={saving}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="*:not-first:mt-2">
                  <Label htmlFor="account-phone">Phone</Label>
                  <Input
                    id="account-phone"
                    type="tel"
                    value={draft.phone ?? ""}
                    onChange={(e) => setDraft((c) => ({ ...c, phone: e.target.value }))}
                  />
                </div>
                <div className="*:not-first:mt-2">
                  <Label htmlFor="account-email">Email</Label>
                  <Input
                    id="account-email"
                    type="email"
                    value={draft.email ?? ""}
                    onChange={(e) => setDraft((c) => ({ ...c, email: e.target.value }))}
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
                  <Label htmlFor="account-acn">ACN</Label>
                  <Input
                    id="account-acn"
                    value={draft.acn ?? ""}
                    onChange={(e) => setDraft((c) => ({ ...c, acn: e.target.value }))}
                  />
                </div>
              </div>

              <div className="*:not-first:mt-2">
                <Label htmlFor="account-industry">Industry</Label>
                <Input
                  id="account-industry"
                  value={draft.industry ?? ""}
                  onChange={(e) => setDraft((c) => ({ ...c, industry: e.target.value }))}
                />
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
            </TabsContent>

            <TabsContent value="contacts" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account-primary-contact">Primary contact</Label>
                <CustomerAutocomplete
                  id="account-primary-contact"
                  value={primaryContact}
                  onChange={(user) => {
                    setPrimaryContact(user);
                    setDraft((c) => ({
                      ...c,
                      primaryContactUserId: user?.id ?? null,
                      ...(billingSameAsPrimary
                        ? { billingContactUserId: user?.id ?? null }
                        : {})
                    }));
                    if (billingSameAsPrimary) setBillingContact(user);
                  }}
                  placeholder="Search customers…"
                  disabled={saving}
                />
              </div>

              <Separator />
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Billing contact</p>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={billingSameAsPrimary}
                    onCheckedChange={(checked) => {
                      const same = checked === true;
                      setBillingSameAsPrimary(same);
                      if (same) {
                        setBillingContact(primaryContact);
                        setDraft((c) => ({
                          ...c,
                          billingContactUserId: primaryContact?.id ?? null
                        }));
                      }
                    }}
                  />
                  Same as primary
                </label>
              </div>
              {!billingSameAsPrimary ? (
                <div className="space-y-2">
                  <Label htmlFor="account-billing-contact">Customer</Label>
                  <CustomerAutocomplete
                    id="account-billing-contact"
                    value={billingContact}
                    onChange={(user) => {
                      setBillingContact(user);
                      setDraft((c) => ({
                        ...c,
                        billingContactUserId: user?.id ?? null
                      }));
                    }}
                    placeholder="Search customers…"
                    disabled={saving}
                  />
                </div>
              ) : null}

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
            </TabsContent>
          </Tabs>

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
