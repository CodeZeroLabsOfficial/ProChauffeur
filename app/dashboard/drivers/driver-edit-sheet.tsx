"use client";

import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import {
  saveDriverProfile,
  updateUserEmail,
  updateUserProfile,
  updateUserRole
} from "@/lib/services/firebase-service";
import {
  CHAUFFEUR_CATEGORIES,
  chauffeurCategoryTitle,
  defaultDriverProfile,
  userRoleTitle,
  type BranchDriver,
  type ChauffeurCategory,
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
import {
  ProfileAddressField,
  PROFILE_ADDRESS_VALIDATION_MESSAGE
} from "@/components/profile-address-field";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
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
  candidates,
  open,
  onOpenChange,
  nested = false
}: {
  user: User | null;
  roster: BranchDriver | null;
  candidates: User[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nested?: boolean;
}) {
  const isNew = !user;
  const [selectedUserId, setSelectedUserId] = useState("");
  const selectedCandidate = candidates.find((u) => u.id === selectedUserId);
  const activeUser = user ?? selectedCandidate ?? null;
  const driverProfile = roster
    ? branchDriverToProfile(roster)
    : defaultDriverProfile();
  const userProfile = activeUser?.profile;
  const names = userProfile ? nameParts(userProfile) : { firstName: "", lastName: "" };

  const [category, setCategory] = useState<ChauffeurCategory>(driverProfile.chauffeurCategory);
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
  const [saving, setSaving] = useState(false);
  const [addressInvalid, setAddressInvalid] = useState(false);

  const [seededId, setSeededId] = useState<string | null>("__init__");
  const currentKey = user?.id ?? (selectedUserId || "__new__");
  if (currentKey !== seededId) {
    setSeededId(currentKey);
    setCategory(driverProfile.chauffeurCategory);
    setDateOfBirth(userProfile?.dateOfBirth ?? undefined);
    setAddress(userProfile ? postalAddressFromProfile(userProfile) : {});
    setVisibleOnCustomerApp(driverProfile.visibility.visibleOnCustomerApp);
    setAcceptsDispatchAssignments(driverProfile.visibility.acceptsDispatchAssignments);
    setAddressInvalid(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const uid = user?.id ?? selectedUserId;
    if (!uid) {
      toast.error("Select the user to add as a chauffeur.");
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

    const nextDriverProfile = {
      ...defaultDriverProfile(),
      ...driverProfile,
      chauffeurCategory: category,
      visibility: {
        visibleOnCustomerApp,
        acceptsDispatchAssignments
      }
    };

    const displayName =
      `${firstName} ${lastName}`.trim() ||
      activeUser?.profile.displayName?.trim() ||
      email ||
      "Chauffeur";

    const nextUserProfile: UserProfile = {
      ...(activeUser?.profile ?? { displayName }),
      displayName,
      firstName: firstName || null,
      lastName: lastName || null,
      phoneNumber: phoneNumber || null,
      dateOfBirth: dateOfBirth ?? null,
      ...toProfilePostalFields(address)
    };

    setSaving(true);
    try {
      if (isNew) await updateUserRole(uid, "driver");
      await saveDriverProfile(uid, nextDriverProfile, {
        driverTitle: displayName,
        isNew
      });
      await updateUserProfile(uid, nextUserProfile);
      if (email !== (activeUser?.email ?? "").trim()) {
        await updateUserEmail(uid, email);
      }
      toast.success(isNew ? "Driver added." : "Driver profile saved.");
      onOpenChange(false);
    } catch {
      toast.error(isNew ? "Could not add the driver." : "Could not save the driver profile.");
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) setSelectedUserId("");
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent nested={nested} className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isNew ? "Add driver" : "Edit driver"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col space-y-4 px-4" key={currentKey}>
          {isNew && (
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user to promote" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No eligible users
                    </SelectItem>
                  ) : (
                    candidates.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.profile.displayName || u.email} ({userRoleTitle[u.role]})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Roster category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ChauffeurCategory)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHAUFFEUR_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {chauffeurCategoryTitle[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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

          <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 px-0 sm:justify-between">
            <span />
            <Button type="submit" disabled={saving || (isNew && candidates.length === 0)}>
              {saving ? "Saving…" : isNew ? "Add driver" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
