"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CorporateAccountSelect } from "@/components/corporate-account-select";
import {
  ProfileAddressField,
  PROFILE_ADDRESS_VALIDATION_MESSAGE
} from "@/components/profile-address-field";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFeatureEnabled } from "@/hooks/use-feature-enabled";
import type { CorporateAccount, User, UserProfile } from "@/lib/models";
import {
  isValidPostalAddress,
  postalAddressFromProfile,
  toProfilePostalFields,
  type PostalAddress
} from "@/lib/models/postal-address";
import {
  createCustomer,
  linkCustomerToCorporateAccount,
  listenCorporateAccounts,
  updateUserEmail,
  updateUserProfile
} from "@/lib/services/firebase-service";

type CustomerKind = "individual" | "corporate";

function kindFromUser(user: User | null): CustomerKind {
  return user?.corporateAccountId?.trim() ? "corporate" : "individual";
}

function splitDisplayName(displayName: string): { firstName: string; lastName: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function nameParts(profile: UserProfile): { firstName: string; lastName: string } {
  if (profile.firstName || profile.lastName) {
    return {
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? ""
    };
  }
  return splitDisplayName(profile.displayName);
}

export function CustomerEditSheet({
  user,
  open,
  onOpenChange,
  nested = false
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nested?: boolean;
}) {
  const isNew = !user;
  const { enabled: corporateAccountsEnabled } = useFeatureEnabled("corporateAccounts");
  const [customerKind, setCustomerKind] = useState<CustomerKind>(() => kindFromUser(user));
  const [corporateAccountId, setCorporateAccountId] = useState<string | null>(
    () => user?.corporateAccountId?.trim() || null
  );
  const [accountInvalid, setAccountInvalid] = useState(false);
  const [accounts, setAccounts] = useState<CorporateAccount[]>([]);
  const [address, setAddress] = useState<PostalAddress>(() =>
    user ? postalAddressFromProfile(user.profile) : {}
  );
  const [addressInvalid, setAddressInvalid] = useState(false);
  const [saving, setSaving] = useState(false);

  const names = user ? nameParts(user.profile) : { firstName: "", lastName: "" };

  const [seededId, setSeededId] = useState<string | null>("__init__");
  const currentKey = user?.id ?? "__new__";
  if (currentKey !== seededId) {
    setSeededId(currentKey);
    setCustomerKind(kindFromUser(user));
    setCorporateAccountId(user?.corporateAccountId?.trim() || null);
    setAccountInvalid(false);
    setAddress(user ? postalAddressFromProfile(user.profile) : {});
    setAddressInvalid(false);
  }

  useEffect(() => {
    if (!open || !corporateAccountsEnabled) {
      setAccounts([]);
      return;
    }
    return listenCorporateAccounts(setAccounts);
  }, [open, corporateAccountsEnabled]);

  function handleKindChange(next: string) {
    if (next !== "individual" && next !== "corporate") return;
    setCustomerKind(next);
    setAccountInvalid(false);
    if (next === "individual") {
      setCorporateAccountId(null);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const firstName = get("firstName");
    const lastName = get("lastName");
    const displayName =
      `${firstName} ${lastName}`.trim() || user?.profile.displayName?.trim() || "";
    const email = get("email");
    const phoneNumber = get("phoneNumber") || undefined;

    if (!displayName) {
      toast.error("Name is required.");
      return;
    }

    const wantsCorporate = corporateAccountsEnabled && customerKind === "corporate";
    const nextAccountId = wantsCorporate ? corporateAccountId?.trim() || null : null;
    if (wantsCorporate && !nextAccountId) {
      setAccountInvalid(true);
      toast.error("Select a corporate account.");
      return;
    }

    if (!isValidPostalAddress(address)) {
      setAddressInvalid(true);
      toast.error(PROFILE_ADDRESS_VALIDATION_MESSAGE);
      return;
    }

    const addressFields = toProfilePostalFields(address);
    const previousAccountId = user?.corporateAccountId?.trim() || null;
    const password = isNew ? get("password") : "";

    if (isNew) {
      if (!email) {
        toast.error("Email is required.");
        return;
      }
      if (!password || password.length < 6) {
        toast.error("Password must be at least 6 characters.");
        return;
      }
    }

    setSaving(true);
    try {
      if (isNew) {
        const { uid } = await createCustomer({
          email,
          password,
          displayName,
          phoneNumber,
          ...addressFields
        });
        await updateUserProfile(uid, {
          displayName,
          firstName: firstName || null,
          lastName: lastName || null,
          phoneNumber: phoneNumber || null,
          ...addressFields
        });
        if (nextAccountId) {
          await linkCustomerToCorporateAccount(uid, nextAccountId);
        }
        toast.success("Customer added.");
      } else {
        const profile = {
          ...user.profile,
          displayName,
          firstName: firstName || null,
          lastName: lastName || null,
          phoneNumber: phoneNumber || null,
          ...addressFields
        };
        await updateUserProfile(user.id, profile);
        if (email && email !== user.email) {
          await updateUserEmail(user.id, email);
        }
        if (corporateAccountsEnabled && nextAccountId !== previousAccountId) {
          await linkCustomerToCorporateAccount(user.id, nextAccountId);
        }
        toast.success("Customer profile saved.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save customer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent nested={nested} className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isNew ? "Add customer" : "Edit customer"}</SheetTitle>
          {isNew ? (
            <SheetDescription>
              Create a new customer account with email and password.
            </SheetDescription>
          ) : null}
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col space-y-4 px-4" key={currentKey}>
          {corporateAccountsEnabled ? (
            <div className="space-y-2">
              <Label>Customer type</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={customerKind}
                onValueChange={handleKindChange}
                disabled={saving}
                className="w-full">
                <ToggleGroupItem value="individual" className="flex-1">
                  Individual
                </ToggleGroupItem>
                <ToggleGroupItem value="corporate" className="flex-1">
                  Corporate
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          ) : null}

          {corporateAccountsEnabled && customerKind === "corporate" ? (
            <div className="space-y-2">
              <Label>Corporate account</Label>
              <CorporateAccountSelect
                accounts={accounts}
                value={corporateAccountId}
                onChange={(id) => {
                  setCorporateAccountId(id);
                  if (id) setAccountInvalid(false);
                }}
                disabled={saving}
                invalid={accountInvalid}
                nested={nested}
              />
              <p className="text-muted-foreground text-xs">
                Need a new company?{" "}
                <Link href="/dashboard/accounts" className="text-foreground underline-offset-4 hover:underline">
                  Create account
                </Link>
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                name="firstName"
                autoComplete="given-name"
                placeholder="Jane"
                defaultValue={names.firstName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                name="lastName"
                autoComplete="family-name"
                placeholder="Smith"
                defaultValue={names.lastName}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                defaultValue={user?.profile.phoneNumber ?? ""}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                defaultValue={user?.email ?? ""}
                placeholder="email@example.com"
              />
            </div>
          </div>

          {isNew ? (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </div>
          ) : null}

          <ProfileAddressField
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

          <SheetFooter className="mt-auto flex-row items-center justify-end gap-2 px-0 sm:justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isNew ? "Add customer" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
