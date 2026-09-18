"use client";

import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import {
  createDriver,
  saveDriverProfile,
  updateUserEmail,
  updateUserProfile
} from "@/lib/services/firebase-service";
import { useActiveBranch } from "@/components/providers/active-branch-provider";
import {
  defaultDriverProfile,
  type BranchDriver,
  type User,
  type UserProfile
} from "@/lib/models";
import { branchDriverToProfile } from "@/app/dashboard/drivers/lib/roster-chauffeurs";
import {
  isValidPostalAddress,
  postalAddressFromProfile,
  toProfilePostalFields,
  type PostalAddress
} from "@/lib/models/postal-address";
import { PasswordStrengthField } from "@/components/password-strength-field";
import {
  ProfileAddressField,
  PROFILE_ADDRESS_VALIDATION_MESSAGE
} from "@/components/profile-address-field";
import { isPasswordStrong, validatePasswordPair } from "@/lib/auth/password-strength";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

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

export function DriverEditSheet({
  user,
  roster,
  canAdd = true,
  open,
  onOpenChange,
  nested = false
}: {
  user: User | null;
  roster: BranchDriver | null;
  canAdd?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nested?: boolean;
}) {
  const isNew = !user;
  const { branchId } = useActiveBranch();
  const activeUser = user;
  const driverProfile = roster ? branchDriverToProfile(roster) : defaultDriverProfile();
  const userProfile = activeUser?.profile;
  const names = userProfile ? nameParts(userProfile) : { firstName: "", lastName: "" };

  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(
    userProfile?.dateOfBirth ?? undefined
  );
  const [address, setAddress] = useState<PostalAddress>(() =>
    userProfile ? postalAddressFromProfile(userProfile) : {}
  );
  const [visibleOnCustomerApp, setVisibleOnCustomerApp] = useState(
    driverProfile.visibility.visibleOnCustomerApp
  );
  const [acceptsDispatchAssignments, setAcceptsDispatchAssignments] = useState(
    driverProfile.visibility.acceptsDispatchAssignments
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [addressInvalid, setAddressInvalid] = useState(false);

  const [seededId, setSeededId] = useState<string | null>("__init__");
  const currentKey = user?.id ?? "__new__";
  if (currentKey !== seededId) {
    setSeededId(currentKey);
    setDateOfBirth(userProfile?.dateOfBirth ?? undefined);
    setAddress(userProfile ? postalAddressFromProfile(userProfile) : {});
    setVisibleOnCustomerApp(driverProfile.visibility.visibleOnCustomerApp);
    setAcceptsDispatchAssignments(driverProfile.visibility.acceptsDispatchAssignments);
    setPassword("");
    setConfirmPassword("");
    setAddressInvalid(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isNew && !canAdd) {
      toast.error("Driver limit reached on the current license.");
      return;
    }

    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const firstName = get("firstName");
    const lastName = get("lastName");
    const phoneNumber = get("phoneNumber");
    const email = get("email");

    if (!isValidPostalAddress(address)) {
      setAddressInvalid(true);
      toast.error(PROFILE_ADDRESS_VALIDATION_MESSAGE);
      return;
    }
    setAddressInvalid(false);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address.");
      return;
    }

    const displayName =
      `${firstName} ${lastName}`.trim() ||
      activeUser?.profile.displayName?.trim() ||
      email ||
      "Chauffeur";

    const addressFields = toProfilePostalFields(address);
    const visibility = {
      visibleOnCustomerApp,
      acceptsDispatchAssignments
    };

    const nextUserProfile: UserProfile = {
      ...(activeUser?.profile ?? { displayName }),
      displayName,
      firstName: firstName || null,
      lastName: lastName || null,
      phoneNumber: phoneNumber || null,
      dateOfBirth: dateOfBirth ?? null,
      ...addressFields
    };

    if (isNew) {
      const passwordCheck = validatePasswordPair(password, confirmPassword);
      if (!passwordCheck.ok) {
        toast.error(passwordCheck.error);
        return;
      }
    }

    setSaving(true);
    try {
      if (isNew) {
        const { uid } = await createDriver({
          email,
          password,
          confirmPassword,
          displayName,
          phoneNumber: phoneNumber || undefined,
          branchId,
          ...addressFields,
          visibility
        });
        await updateUserProfile(uid, nextUserProfile);
        toast.success("Driver added.");
      } else {
        const nextDriverProfile = {
          ...defaultDriverProfile(),
          ...driverProfile,
          visibility
        };
        await saveDriverProfile(user.id, nextDriverProfile, branchId, {
          driverTitle: displayName
        });
        await updateUserProfile(user.id, nextUserProfile);
        if (email !== (activeUser?.email ?? "").trim()) {
          await updateUserEmail(user.id, email);
        }
        toast.success("Driver profile saved.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isNew
            ? "Could not add the driver."
            : "Could not save the driver profile."
      );
    } finally {
      setSaving(false);
    }
  }

  const editDriverLabel =
    activeUser?.profile.displayName?.trim() || activeUser?.email || "this driver";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent nested={nested} className="flex w-full flex-col overflow-hidden sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isNew ? "Add driver" : "Edit driver"}</SheetTitle>
          <SheetDescription>
            {isNew
              ? "Create a new driver profile."
              : `Update the details of “${editDriverLabel}”.`}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" key={currentKey}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-12">
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

            {isNew ? (
              <PasswordStrengthField
                password={password}
                onPasswordChange={setPassword}
                confirm={confirmPassword}
                onConfirmChange={setConfirmPassword}
                disabled={saving}
              />
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+61 400 000 000"
                  defaultValue={userProfile?.phoneNumber ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="jane@example.com"
                  defaultValue={activeUser?.email ?? ""}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date of birth</Label>
              <Popover modal>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !dateOfBirth && "text-muted-foreground"
                    )}>
                    {dateOfBirth ? format(dateOfBirth, "PPP") : <span>Pick a date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className={cn(
                    "z-[100] max-h-[--radix-popover-content-available-height] w-[--radix-popover-trigger-width] p-0",
                    nested && "z-[110]"
                  )}
                  align="start">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    fromYear={1900}
                    toYear={new Date().getFullYear()}
                    selected={dateOfBirth}
                    onSelect={setDateOfBirth}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    defaultMonth={dateOfBirth}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="visibleOnCustomerApp">Active</Label>
                <p className="text-muted-foreground text-xs">
                  Show this chauffeur on the customer app when active.
                </p>
              </div>
              <Switch
                id="visibleOnCustomerApp"
                checked={visibleOnCustomerApp}
                onCheckedChange={setVisibleOnCustomerApp}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="acceptsDispatchAssignments">Accepting dispatch</Label>
                <p className="text-muted-foreground text-xs">
                  Allow this chauffeur to receive dispatch assignments.
                </p>
              </div>
              <Switch
                id="acceptsDispatchAssignments"
                checked={acceptsDispatchAssignments}
                onCheckedChange={setAcceptsDispatchAssignments}
                disabled={saving}
              />
            </div>
          </div>

          <div className="shrink-0 border-t px-4 pt-4 pb-4">
            <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 p-0 sm:justify-between">
              <span />
              <Button
                type="submit"
                disabled={
                  saving ||
                  (isNew &&
                    (!canAdd ||
                      !isPasswordStrong(password) ||
                      password !== confirmPassword))
                }>
                {saving ? "Saving…" : isNew ? "Add driver" : "Save"}
              </Button>
            </SheetFooter>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
